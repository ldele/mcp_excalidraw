#!/usr/bin/env python3
"""dod-lint: data-oriented design linter for Python projects.

Five rule families:
  G - graph modularity, consumes .ast_context.json from project-mapper. G004 layer rules also
      derive from the `## Concept map` table in docs/architecture.md (SPEC-concept-map): the
      may-import column is the allow-list, G006 flags files no concept owns (warn;
      [dodlint.map] unmapped_ok exempts), G007 reports a malformed map (error, names the row).
      Legacy [dodlint.graph] layers wins over the map this release (deprecation warning).
  O - ownership & mutation (Rust-inspired)
  M - memory layout & derive (slots, dataclass, SoA advisories)
  E - exhaustiveness (advisory; real type checking belongs to mypy --strict)
  D - duplication (normalized-AST clone detection across files)

Zero dependencies, Python 3.11+ (tomllib). Exit codes:
  0  clean, or only warn/info without --strict
  1  errors present, or warnings present with --strict
  2  usage or config error

Suppress any finding with an inline pragma on the flagged line or on the
enclosing def/class line:  # dod: allow(O003)  /  # dod: allow(all)

Split 2026-08-07: at 984 lines this was the repo's own longest-standing S16 violation. The rule
families moved out -- `dod_rules_ast` / `dod_rules_dup` / `dod_rules_graph`, over a shared substrate
in `dod_scan` -- and this file keeps the CLI, the file walk, and the ordering that turns findings
into a verdict. `cpc.dod_lint:main` and `DEFAULT_SEVERITY` are re-exported unchanged: both are
public surface (the console entry, the scripts/ shim, two CI files, and the rule-coverage ratchet
import them), so the split must not move an import path.
"""
from __future__ import annotations

import argparse
import ast
import json
import sys
from pathlib import Path

from cpc.findings import Finding, to_json  # the shared record this file's Finding became (ADR-029)
from cpc.glossary_check import forbidden_map, parse_glossary  # N001 shares the GLOSSARY.md loaders
from cpc.dod_scan import DEFAULT_SEVERITY, load_config, norm_rule
from cpc.dod_rules_ast import FileChecker
from cpc.dod_rules_dup import check_duplication
from cpc.dod_rules_graph import check_concept_orphans, check_graph, parse_concept_map

__all__ = ["main", "DEFAULT_SEVERITY", "FileChecker", "check_duplication", "check_graph",
           "check_concept_orphans", "parse_concept_map", "load_config", "norm_rule"]


def collect_files(root: Path, excludes: list[str]) -> list[Path]:
    out = []
    for p in sorted(root.rglob("*.py")):
        rel_parts = p.relative_to(root).parts
        if any(part in excludes for part in rel_parts[:-1]):
            continue
        out.append(p)
    return out

def main() -> int:
    ap = argparse.ArgumentParser(prog="dod_lint", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("root", type=Path, help="project root to lint")
    ap.add_argument("--config", type=Path, default=None, help="dodlint.toml (default: <root>/dodlint.toml if present)")
    ap.add_argument("--ast-context", type=Path, default=None,
                    help=".ast_context.json (default: <root>/.ast_context.json); graph rules skip if absent")
    ap.add_argument("--architecture", type=Path, default=None,
                    help="doc carrying the `## Concept map` (default: <root>/docs/architecture.md); "
                         "map rules (G004-from-map/G006/G007) skip if absent")
    ap.add_argument("--glossary", type=Path, default=None,
                    help="GLOSSARY.md for N001 (default: <root>/GLOSSARY.md); N rules skip if absent")
    ap.add_argument("--strict", action="store_true", help="warnings also fail the run")
    ap.add_argument("--format", choices=["text", "json"], default="text")
    ap.add_argument("--select", default=None, help="comma list of rule ids to run exclusively")
    args = ap.parse_args()

    root = args.root.resolve()
    if not root.is_dir():
        print(f"dod-lint: not a directory: {root}", file=sys.stderr)
        return 2

    cfg_path = args.config or (root / "dodlint.toml" if (root / "dodlint.toml").is_file() else None)
    cfg = load_config(cfg_path)

    # N001: load the project's GLOSSARY.md forbidden map once (skip the N family if absent).
    glossary_path = args.glossary or (root / "GLOSSARY.md")
    forbidden: dict[str, tuple[str, str]] = {}
    if glossary_path.is_file():
        forbidden = forbidden_map(parse_glossary(glossary_path.read_text(encoding="utf-8")))
    severities = dict(DEFAULT_SEVERITY)
    severities.update({norm_rule(k): v for k, v in cfg["severity"].items()})
    ignored = {norm_rule(r) for r in cfg["ignore"]}
    selected = {norm_rule(r) for r in args.select.split(",")} if args.select else None

    findings: list[Finding] = []
    func_records: list[dict] = []
    allows_by_module: dict[str, dict[int, set[str]]] = {}

    files = collect_files(root, cfg["exclude"])
    for f in files:
        try:
            source = f.read_text(encoding="utf-8", errors="ignore")
            tree = ast.parse(source)
        except SyntaxError as exc:
            print(f"dod-lint: skipping {f}: {exc}", file=sys.stderr)
            continue
        rel = str(f.relative_to(root))
        checker = FileChecker(rel, source, cfg, forbidden)
        checker.check_module(tree)
        findings.extend(checker.findings)
        func_records.extend(checker.func_records)
        allows_by_module[str(f.relative_to(root).with_suffix(""))] = checker.allows

    findings.extend(check_duplication(func_records, cfg))

    # Concept map (SPEC-concept-map): no docs/architecture.md or no `## Concept map` section ->
    # silent skip, like every not-universal gate. Malformed rows -> G007 findings and the
    # half-parsed map derives NOTHING (cascading rules off a broken map would bury the signal).
    concepts: list[dict] | None = None
    map_ran = False          # did the concept-map rules actually get an input? reported below
    arch_path = args.architecture or root / "docs" / "architecture.md"
    if arch_path.is_file():
        parsed = parse_concept_map(arch_path.read_text(encoding="utf-8", errors="ignore"))
        if parsed is not None:
            map_ran = True
            concepts, map_errors = parsed
            arch_rel = (arch_path.relative_to(root).as_posix()
                        if arch_path.is_relative_to(root) else str(arch_path))
            for line, msg in map_errors:
                findings.append(Finding("G007", "", arch_rel, line, msg))
            if map_errors:
                concepts = None
            else:
                findings.extend(check_concept_orphans(
                    [str(f.relative_to(root)) for f in files], concepts, cfg))
                if cfg["graph"]["layers"]:
                    print("dod-lint: both [dodlint.graph] layers and the docs/architecture.md "
                          "concept map define layer rules - the toml wins this release "
                          "(deprecated); delete [dodlint.graph] layers to adopt the map",
                          file=sys.stderr)

    ctx_path = args.ast_context or root / ".ast_context.json"
    if ctx_path.is_file():
        try:
            ctx = json.loads(ctx_path.read_text(encoding="utf-8"))
            findings.extend(check_graph(ctx, cfg, allows_by_module, concepts))
        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            print(f"dod-lint: bad ast context {ctx_path}: {exc}", file=sys.stderr)
    else:
        # Only the IMPORT-graph rules need the ast context. The concept-map rules (G006 unmapped
        # file, G007 malformed map) read docs/architecture.md instead — so a blanket "G* skipped"
        # understated coverage. But they are gated on that file existing and parsing (`map_ran`),
        # and a repo with no concept map is the default consumer state, so the sentence is built
        # from what actually ran: claiming coverage the gate does not have is the same defect as
        # denying coverage it does have, pointed the more dangerous way.
        tail = ("the concept-map rules G006/G007 still ran" if map_ran else
                "and no docs/architecture.md concept map was found, so G006/G007 had nothing "
                "to check either")
        print("dod-lint: no .ast_context.json - import-graph rules (G001-G005) skipped; "
              f"{tail}. Run project-mapper / py_ast_context.py for the rest", file=sys.stderr)

    final = []
    for fd in findings:
        if fd.rule in ignored or (selected is not None and fd.rule not in selected):
            continue
        fd.severity = severities.get(fd.rule, "info")
        final.append(fd)
    final.sort(key=Finding.key)

    counts = {"error": 0, "warn": 0, "info": 0}
    for fd in final:
        counts[fd.severity] += 1

    if args.format == "json":
        print(to_json(final))   # `fd.__dict__` before the extraction; slots=True has no instance dict
    else:
        for fd in final:
            print(f"{fd.path}:{fd.line}: {fd.severity.upper():5s} DOD-{fd.rule} {fd.message}")
        total = sum(counts.values())
        print(f"\ndod-lint: {total} finding(s) - "
              f"{counts['error']} error, {counts['warn']} warn, {counts['info']} info")

    if counts["error"] or (args.strict and counts["warn"]):
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
