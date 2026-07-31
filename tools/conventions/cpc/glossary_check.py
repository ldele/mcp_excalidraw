#!/usr/bin/env python3
"""cpc-glossary gate — flag a forbidden glossary synonym found in scanned text.

Usage:
    cpc-glossary --root . [--scan src docs] [--strict] [--ext .py,.md,.ts]
    cpc-glossary --glossary path/to/GLOSSARY.md --scan src
    cpc-glossary --root . --suggest-drift [--ast-context path/.ast_context.json]
    cpc-glossary --root . --check-authority [--strict]

Reads the ``**Forbidden:**`` column of each filled ``## D-NNN`` / ``## C-NNN`` entry
in GLOSSARY.md and greps the scanned paths for those words (whole-word,
case-sensitive). Each hit prints ``file:line  forbidden 'X' — use canonical 'Y'``.
Warnings by default (exit 0); under ``--strict`` any hit fails (exit 1) for
pre-commit / CI.

Opt-in by design (ADR-010): naming/term enforcement pays on multi-module /
long-lived / handed-off projects, not solo throwaways. It scans text for forbidden
words — it cannot tell whether a *new* concept needs a term; that judgment stays
human. The glossary file itself is never scanned (listing a forbidden word there is
correct). Unfilled <placeholder> entries are skipped so the shipped template does
not fire. stdlib only (Python 3.11+), per ADR-002.

``parse_glossary`` and ``forbidden_map`` are the shared loaders that ``dod_lint``'s
N001 rule also imports — one source for the GLOSSARY.md shape (coupling: cpc.dod_lint
depends on this module for the forbidden map).

Two additional, independent modes (both read-only, both advisory — neither ever
edits GLOSSARY.md):

``--suggest-drift`` reads a project-mapper ``.ast_context.json`` and clusters class
and function names that share a CamelCase/snake_case token (e.g. ``RunState`` /
``RunSession`` / ``Run``) — candidates for step 1 ("gather the terms") of the
project-glossary skill. A shared token does not prove two names are the same
concept; it is a prompt to go read the code, not a verdict.

``--check-authority`` re-checks each entry's ``**Authoritative in:**`` value
against the current ``.ast_context.json`` / filesystem, so a glossary entry that
outlived a rename or file move gets caught instead of silently going stale. Only
path-shaped or bare-identifier values are checked; freeform prose is skipped
rather than guessed at, to avoid false alarms.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ENTRY = re.compile(r"^##\s+((?:D|C)-\S+)\s*[—-]\s*(.*)$")
FIELD = re.compile(r"^\*\*(Canonical|Forbidden):\*\*\s*(.*)$", re.IGNORECASE)
AUTH_FIELD = re.compile(r"^\*\*Authoritative in:\*\*\s*(.*)$", re.IGNORECASE)
STUB = re.compile(r"<.*>")
TOKEN = re.compile(r"`([^`]+)`|([^,]+)")  # backticked or comma-split bare word
DEFAULT_EXT = {".py", ".md", ".ts", ".tsx", ".js", ".jsx", ".rs", ".dart", ".go", ".java", ".txt"}
DEFAULT_SCAN = ["src", "docs"]

# --- --suggest-drift: CamelCase/snake_case tokenizer + a stoplist of generic
# words that would otherwise cluster on every module (they name a role, not a
# concept, so they carry no naming-drift signal).
_CAMEL_BOUNDARY = re.compile(r"(?<=[a-z0-9])(?=[A-Z])")
DRIFT_STOPLIST = {
    "init", "main", "setup", "test", "get", "set", "new", "build",
    "create", "make", "call", "helper", "util", "utils", "base", "config",
    "data", "impl", "default", "common",
}

# --- --check-authority: what an "Authoritative in" value has to look like to be
# checkable at all. Anything else is prose ("the domain model") and is skipped.
_PATHY = re.compile(r"[\\/]|\.[A-Za-z0-9]{1,4}$")
_IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def parse_glossary(text: str) -> list[dict]:
    """Return filled entries: {id, canonical, forbidden:[...]}. Skips <placeholder> stubs."""
    entries: list[dict] = []
    cur: dict | None = None
    for line in text.splitlines():
        m = ENTRY.match(line.strip())
        if m:
            cur = {"id": m.group(1), "title": m.group(2).strip(), "canonical": "", "forbidden": []}
            entries.append(cur)
            continue
        if cur is None:
            continue
        f = FIELD.match(line.strip())
        if not f:
            continue
        key, val = f.group(1).lower(), f.group(2).strip()
        if key == "canonical":
            cur["canonical"] = val.strip().strip("`").strip()
        elif key == "forbidden":
            if val.lower() in {"none", "—", ""}:
                continue
            for bt, bare in TOKEN.findall(val):
                w = (bt or bare).strip().strip("`").strip()
                if w and not STUB.search(w):
                    cur["forbidden"].append(w)
    return [e for e in entries if e["forbidden"] and not STUB.search(e["title"])]


def forbidden_map(entries: list[dict]) -> dict[str, tuple[str, str]]:
    """forbidden-word -> (canonical, entry-id). First entry wins on a collision."""
    out: dict[str, tuple[str, str]] = {}
    for e in entries:
        for w in e["forbidden"]:
            out.setdefault(w, (e["canonical"] or "(unspecified)", e["id"]))
    return out


def tokenize_identifier(name: str) -> list[str]:
    """Split a CamelCase / snake_case identifier into lowercase word tokens.

    ``RunState`` -> ``["run", "state"]``; ``RunSession`` -> ``["run", "session"]``;
    ``Run`` -> ``["run"]``. Leaf name only (``Class.method`` drops the scope).
    """
    leaf = name.split(".")[-1]
    words: list[str] = []
    for part in re.split(r"[_\-]+", leaf):
        if part:
            words.extend(w.lower() for w in _CAMEL_BOUNDARY.split(part) if w)
    return words


def collect_symbols(ast_data: dict) -> list[tuple[str, str, str]]:
    """Return ``(name, kind, module)`` for every class and function in an ast_context map."""
    out: list[tuple[str, str, str]] = []
    for module, fdata in ast_data.items():
        for cname in fdata.get("classes", {}):
            out.append((cname, "class", module))
        for fname in fdata.get("functions", {}):
            leaf = fname.split(".")[-1]
            kind = "method" if "." in fname else "function"
            out.append((leaf, kind, module))
    return out


def suggest_drift_clusters(symbols: list[tuple[str, str, str]], max_cluster: int = 5) -> list[dict]:
    """Group distinct symbol names that share a non-generic token — candidate naming drift.

    Advisory only: a shared token is a prompt to read the code, not proof two names are the
    same concept. ``max_cluster`` drops tokens shared by too many distinct names (a token that
    common is naming a role — ``Handler``, ``Manager`` — not a drifting concept).
    """
    by_token: dict[str, set[str]] = defaultdict(set)
    locations: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for name, kind, module in symbols:
        locations[name].append((kind, module))
        for tok in set(tokenize_identifier(name)):
            if tok in DRIFT_STOPLIST or len(tok) < 3:
                continue
            by_token[tok].add(name)

    clusters: list[dict] = []
    seen: set[frozenset] = set()
    for tok, names in by_token.items():
        if not (2 <= len(names) <= max_cluster):
            continue
        key = frozenset(names)
        if key in seen:
            continue
        seen.add(key)
        clusters.append({
            "token": tok,
            "names": sorted(names),
            "locations": {n: locations[n] for n in names},
        })
    clusters.sort(key=lambda c: (len(c["names"]), c["token"]))
    return clusters


def cmd_suggest_drift(ast_path: Path) -> int:
    if not ast_path.is_file():
        print(f"cpc-glossary --suggest-drift: no ast_context found at {ast_path} — "
              f"run project-mapper first.")
        return 0
    ast_data = json.loads(ast_path.read_text(encoding="utf-8"))
    clusters = suggest_drift_clusters(collect_symbols(ast_data))
    if not clusters:
        print("cpc-glossary --suggest-drift: no candidate naming-drift found.")
        return 0
    print(f"cpc-glossary --suggest-drift: {len(clusters)} candidate cluster(s) — "
          f"advisory only, confirm before adding a GLOSSARY.md entry.")
    for c in clusters:
        print(f"  shared token '{c['token']}':")
        for n in c["names"]:
            locs = ", ".join(f"{k} in {m}" for k, m in c["locations"][n])
            print(f"    {n}  ({locs})")
    return 0


def parse_authority(text: str) -> list[dict]:
    """Return ``{id, title, authoritative}`` for every filled entry (skips <placeholder> stubs)."""
    entries: list[dict] = []
    cur: dict | None = None
    for line in text.splitlines():
        m = ENTRY.match(line.strip())
        if m:
            cur = {"id": m.group(1), "title": m.group(2).strip(), "authoritative": ""}
            entries.append(cur)
            continue
        if cur is None:
            continue
        a = AUTH_FIELD.match(line.strip())
        if a:
            cur["authoritative"] = a.group(1).strip().strip("`").strip()
    return [e for e in entries if not STUB.search(e["title"])]


def check_authority(entries: list[dict], root: Path, ast_data: dict | None) -> list[tuple]:
    """Return ``(id, title, authoritative, status)``; status is 'ok' / 'stale' / 'skipped'.

    Only a path-shaped value (checked against the filesystem) or a bare identifier (checked
    against the ast_context symbol set) is verified. Freeform prose is always 'skipped' — this
    can under-report but should not false-alarm on a description that was never meant to be
    machine-parsed.
    """
    known_symbols = {name for name, _kind, _module in collect_symbols(ast_data)} if ast_data else set()
    results = []
    for e in entries:
        auth = e["authoritative"]
        if not auth or auth in {"-", "—", "none", "n/a"}:
            continue
        if _PATHY.search(auth):
            candidate = (root / auth).resolve()
            status = "ok" if (candidate.is_file() or candidate.is_dir()) else "stale"
        elif _IDENTIFIER.match(auth.split(".")[-1]):
            if ast_data is None:
                status = "skipped"
            else:
                status = "ok" if auth.split(".")[-1] in known_symbols else "stale"
        else:
            status = "skipped"
        results.append((e["id"], e["title"], auth, status))
    return results


def cmd_check_authority(gpath: Path, root: Path, ast_path: Path, strict: bool) -> int:
    entries = parse_authority(gpath.read_text(encoding="utf-8"))
    ast_data = json.loads(ast_path.read_text(encoding="utf-8")) if ast_path.is_file() else None
    if ast_data is None:
        print(f"cpc-glossary --check-authority: no ast_context found at {ast_path} — "
              f"symbol references will be skipped, not verified.")
    results = check_authority(entries, root, ast_data)
    ok = [r for r in results if r[3] == "ok"]
    stale = [r for r in results if r[3] == "stale"]
    skipped = [r for r in results if r[3] == "skipped"]
    print(f"cpc-glossary --check-authority: {len(ok)} ok, {len(stale)} stale, "
          f"{len(skipped)} skipped (not a file/symbol reference).")
    for eid, title, auth, _ in stale:
        print(f"  STALE {eid} ({title}): 'Authoritative in: {auth}' not found — verify or update.")
    if stale and strict:
        print("cpc-glossary: FAIL (--strict) — stale 'Authoritative in' reference(s) above.")
        return 1
    return 0


def find_glossary(root: Path, explicit: Path | None) -> Path | None:
    if explicit:
        return explicit if explicit.is_file() else None
    for cand in (root / "GLOSSARY.md", root / ".claude" / "GLOSSARY.md"):
        if cand.is_file():
            return cand
    return None


def iter_files(scan_paths: list[Path], exts: set[str], glossary: Path):
    for root in scan_paths:
        if root.is_file():
            candidates = [root]
        elif root.is_dir():
            candidates = [f for f in root.rglob("*") if f.is_file()]
        else:
            continue
        for f in candidates:
            if f.resolve() == glossary.resolve():
                continue  # never scan the glossary itself
            if f.suffix.lower() in exts:
                yield f


def scan(fmap: dict[str, tuple[str, str]], files) -> list[tuple]:
    patterns = {w: re.compile(rf"(?<!\w){re.escape(w)}(?!\w)") for w in fmap}
    hits: list[tuple] = []
    for f in files:
        try:
            lines = f.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            continue
        for n, line in enumerate(lines, 1):
            for w, pat in patterns.items():
                if pat.search(line):
                    canonical, eid = fmap[w]
                    hits.append((str(f), n, w, canonical, eid))
    return hits


def main() -> int:
    ap = argparse.ArgumentParser(prog="cpc-glossary", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=".", type=Path, help="project root (default: .)")
    ap.add_argument("--glossary", default=None, type=Path,
                    help="GLOSSARY.md path (default: <root>/GLOSSARY.md or <root>/.claude/GLOSSARY.md)")
    ap.add_argument("--scan", nargs="+", default=None,
                    help="paths to scan, relative to root (default: src docs)")
    ap.add_argument("--ext", default="", help="comma-separated extensions (override defaults)")
    ap.add_argument("--strict", action="store_true", help="any hit fails the run (exit 1)")
    ap.add_argument("--suggest-drift", action="store_true",
                    help="suggest candidate naming-drift clusters from an ast_context.json "
                         "(advisory, never modifies GLOSSARY.md)")
    ap.add_argument("--check-authority", action="store_true",
                    help="verify each entry's 'Authoritative in' file/symbol still exists "
                         "(best-effort; freeform prose is skipped, not guessed at)")
    ap.add_argument("--ast-context", default=None, type=Path,
                    help="path to .ast_context.json (default: <root>/.ast_context.json)")
    args = ap.parse_args()

    root = args.root.resolve()
    ast_path = args.ast_context if args.ast_context else root / ".ast_context.json"

    if args.suggest_drift:
        return cmd_suggest_drift(ast_path)

    gpath = find_glossary(root, args.glossary)
    if gpath is None:
        print("cpc-glossary: no GLOSSARY.md found — none created, or wrong --root.")
        print("cpc-glossary: create one from cpc templates/GLOSSARY.md (project-glossary skill).")
        return 0

    if args.check_authority:
        return cmd_check_authority(gpath, root, ast_path, args.strict)

    entries = parse_glossary(gpath.read_text(encoding="utf-8"))
    if not entries:
        print("cpc-glossary: no enforceable entries (none with a Forbidden list). Nothing to scan.")
        return 0

    scan_rel = args.scan if args.scan is not None else DEFAULT_SCAN
    scan_paths = [root / s for s in scan_rel]
    exts = {e if e.startswith(".") else "." + e for e in args.ext.split(",") if e} or DEFAULT_EXT
    fmap = forbidden_map(entries)
    hits = scan(fmap, iter_files(scan_paths, exts, gpath))

    print(f"cpc-glossary: {len(fmap)} forbidden term(s), {len(hits)} hit(s).")
    for fpath, n, w, canonical, eid in hits:
        print(f"  {fpath}:{n}  forbidden '{w}' — use canonical '{canonical}' ({eid})")
    if hits and args.strict:
        print("cpc-glossary: FAIL (--strict) — replace forbidden synonyms with the canonical term.")
        return 1
    if hits:
        print("cpc-glossary: warnings only (run with --strict to gate).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
