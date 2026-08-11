#!/usr/bin/env python3
"""The G rule family: the import graph and the concept map that governs it.

G001–G005 read `.ast_context.json` (cycles, layer violations, fan-out, dead code) and G006/G007 read
`docs/architecture.md`'s `## Concept map` — which is why the map is machine-readable at all
(ADR-028). Every G rule degrades to silence without its input, by design: a graph rule with no graph
must not invent a verdict.

Stdlib only (ADR-002).
"""
from __future__ import annotations

import re
import sys
from fnmatch import fnmatch
from pathlib import Path

from cpc.findings import Finding


CONCEPT_HDR_RE = re.compile(r"^##\s+Concept map\s*$", re.I)

_NONE_CELLS = {"", "-", "—", "–"}   # an empty may-import cell: `—` / `-` / blank

def parse_concept_map(text: str) -> tuple[list[dict], list[tuple[int, str]]] | None:
    """Parse the `## Concept map` table (concept | responsibility | owned paths | may-import).
    None = no such section (map rules skip silently). Else (concepts, errors): each concept is
    {name, paths, may_import, line}; each error is (line, message) naming the offending row —
    a malformed map must be a clear gate error, never a crash or a silent skip (SPEC hard
    constraint). Cross-row checks: duplicate names, may-import referencing an unknown concept,
    an empty owned-paths cell."""
    concepts: list[dict] = []
    errors: list[tuple[int, str]] = []
    started = False
    for n, ln in enumerate(text.splitlines(), start=1):
        srt = ln.strip()
        if not started:
            if CONCEPT_HDR_RE.match(srt):
                started = True
            continue
        if re.match(r"^#{1,2}\s", srt):       # next h1/h2 ends the section
            break
        if not srt.startswith("|"):
            continue                          # header comment / prose lines
        cells = [c.strip() for c in srt.strip("|").split("|")]
        if all(set(c) <= set("-: ") for c in cells):
            continue                          # the |---|---| separator row
        if cells and cells[0].lower() == "concept":
            continue                          # the header row
        if len(cells) < 4:
            errors.append((n, f"concept-map row `{srt[:60]}` has {len(cells)} cell(s), need 4 "
                              "(concept | responsibility | owned paths | may-import)"))
            continue
        paths = [p.rstrip("/") for p in re.split(r"[,\s]+", cells[2]) if p.strip()]
        raw_mi = cells[3]
        may = [] if raw_mi in _NONE_CELLS else [c.strip() for c in raw_mi.split(",") if c.strip()]
        concepts.append({"name": cells[0], "paths": paths, "may_import": may, "line": n})
    if not started:
        return None
    names = [c["name"] for c in concepts]
    for c in concepts:
        if names.count(c["name"]) > 1:
            errors.append((c["line"], f"concept-map: duplicate concept `{c['name']}`"))
        if not c["paths"]:
            errors.append((c["line"], f"concept-map row `{c['name']}`: empty owned-paths cell"))
        for m in c["may_import"]:
            if m not in names:
                errors.append((c["line"], f"concept-map row `{c['name']}`: may-import names "
                                          f"unknown concept `{m}`"))
    return concepts, errors

def check_concept_orphans(rel_files: list[str], concepts: list[dict], cfg: dict) -> list[Finding]:
    """G006: a source file no concept owns. Owned paths match as directory prefixes or fnmatch
    globs; [dodlint.map] unmapped_ok exempts generated/vendored/glue files. WARN by default —
    promote to error only once observed noise is near zero (grill Q2)."""
    ok_globs = cfg["map"]["unmapped_ok"]
    owned = [p for c in concepts for p in c["paths"]]
    findings: list[Finding] = []
    for rel in rel_files:
        posix = Path(rel).as_posix()
        if any(posix == p or posix.startswith(p + "/") or fnmatch(posix, p) for p in owned):
            continue
        if any(fnmatch(posix, g) for g in ok_globs):
            continue
        findings.append(Finding("G006", "", rel, 1,
                        "file matches no concept in the docs/architecture.md `## Concept map` - "
                        "add it to a concept's owned paths, or exempt it via "
                        "[dodlint.map] unmapped_ok"))
    return findings

def check_graph(ctx: dict, cfg: dict, allows_by_module: dict[str, dict[int, set[str]]],
                concepts: list[dict] | None = None) -> list[Finding]:
    findings: list[Finding] = []
    g = cfg["graph"]
    modules = set(ctx)

    def resolve(imp: str) -> list[str]:
        if imp in modules:
            return [imp]
        if f"{imp}/__init__" in modules:
            return [f"{imp}/__init__"]
        # package-form import (`from pkg import name`): the analyzer drops the
        # names, so link to every submodule - coarse but sound for layers, and
        # treats the package as one unit for cycles (documented approximation)
        return [m for m in modules if m.startswith(imp + "/")]

    edges: dict[str, set[str]] = {m: set() for m in modules}
    for m, data in ctx.items():
        for imp in data.get("imports", []):
            for r in resolve(imp):
                if r != m:
                    edges[m].add(r)

    def allowed(module: str, line: int, rule: str) -> bool:
        a = allows_by_module.get(module, {})
        s = a.get(line, set())
        return "ALL" in s or rule in s

    # G001 - cycles via Tarjan SCC
    index: dict[str, int] = {}
    low: dict[str, int] = {}
    on_stack: set[str] = set()
    stack: list[str] = []
    counter = [0]
    sccs: list[list[str]] = []

    def strongconnect(v: str) -> None:
        index[v] = low[v] = counter[0]
        counter[0] += 1
        stack.append(v)
        on_stack.add(v)
        for w in edges[v]:
            if w not in index:
                strongconnect(w)
                low[v] = min(low[v], low[w])
            elif w in on_stack:
                low[v] = min(low[v], index[w])
        if low[v] == index[v]:
            comp = []
            while True:
                w = stack.pop()
                on_stack.discard(w)
                comp.append(w)
                if w == v:
                    break
            if len(comp) > 1 or v in edges[v]:
                sccs.append(sorted(comp))

    sys.setrecursionlimit(max(10000, len(modules) * 4))
    for v in sorted(modules):
        if v not in index:
            strongconnect(v)
    for comp in sccs:
        findings.append(Finding("G001", "", comp[0] + ".py", 1,
                        "import cycle: " + " <-> ".join(comp) +
                        " - break it by moving the shared piece into a module both can import"))

    # G002 - fan-out
    for m in sorted(modules):
        if len(edges[m]) > g["max_fan_out"] and not allowed(m, 1, "G002"):
            findings.append(Finding("G002", "", m + ".py", 1,
                            f"module imports {len(edges[m])} project modules "
                            f"(limit {g['max_fan_out']}) - it knows too much; split it or "
                            "invert the dependency"))

    # G003 - fan-in, G005 - dead code
    entry = set(g["entry_points"])
    for m in sorted(modules):
        for fname, f in ctx[m].get("functions", {}).items():
            line = f.get("line", 1)
            cb = f.get("called_by", [])
            if len(cb) > g["max_fan_in"] and not allowed(m, line, "G003"):
                findings.append(Finding("G003", "", m + ".py", line,
                                f"`{fname}` has {len(cb)} callers (limit {g['max_fan_in']}) - "
                                "fine for a utility; review if it carries business logic"))
            if "." in fname:
                continue  # methods: overrides/protocols make dead-code too noisy
            leaf = fname.split(".")[-1]
            if (not cb and leaf not in entry and not leaf.startswith("test_")
                    and not (leaf.startswith("__") and leaf.endswith("__"))
                    and not allowed(m, line, "G005")):
                findings.append(Finding("G005", "", m + ".py", line,
                                f"`{fname}` has no callers in the project graph - dead code, "
                                "or an external entry point: delete it or mark "
                                "`# dod: allow(G005)`"))

    # G004 - layer violations. Two sources: legacy [dodlint.graph] layers (ordered, linear) or
    # the docs/architecture.md concept map (explicit may-import allow-list, SPEC-concept-map).
    # Both present -> the toml wins this release (main() prints the deprecation warning); the
    # map becomes the single source once the toml section is deleted (grill Q3).
    layers: list[dict] = g.get("layers", [])
    if layers:
        order = {l["path"].rstrip("/"): i for i, l in enumerate(layers)}

        def layer_of(m: str) -> int | None:
            for p, i in order.items():
                if m == p or m.startswith(p + "/"):
                    return i
            return None

        for m in sorted(modules):
            li = layer_of(m)
            if li is None:
                continue
            for dep in sorted(edges[m]):
                ld = layer_of(dep)
                if ld is not None and ld < li and not allowed(m, 1, "G004"):
                    findings.append(Finding("G004", "", m + ".py", 1,
                                    f"layer violation: `{m}` ({layers[li]['name']}) imports "
                                    f"`{dep}` ({layers[ld]['name']}) - lower layers must not "
                                    "import higher ones"))
    elif concepts:
        def concept_of(m: str) -> int | None:
            # A flat-layout map owns files and globs, not directories ("src/cpc/*_check.py" —
            # cpc's own map, the first live consumer). Module ids in the ctx carry no ".py",
            # so match both spellings, mirroring check_concept_orphans' fnmatch.
            f = m + ".py"
            for i, c in enumerate(concepts):
                for p in c["paths"]:
                    if m == p or m.startswith(p + "/") or fnmatch(f, p) or fnmatch(m, p):
                        return i
            return None

        allow_map = {c["name"]: set(c["may_import"]) for c in concepts}
        for m in sorted(modules):
            ci = concept_of(m)
            if ci is None:
                continue                     # unmapped module: G006's business, not G004's
            for dep in sorted(edges[m]):
                cd = concept_of(dep)
                if cd is None or cd == ci:
                    continue
                src, dst = concepts[ci]["name"], concepts[cd]["name"]
                if dst not in allow_map[src] and not allowed(m, 1, "G004"):
                    findings.append(Finding("G004", "", m + ".py", 1,
                                    f"layer violation: `{m}` ({src}) imports `{dep}` ({dst}) - "
                                    f"`{dst}` is not in `{src}`'s may-import "
                                    "(docs/architecture.md concept map)"))
    return findings
