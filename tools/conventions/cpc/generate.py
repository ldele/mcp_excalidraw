#!/usr/bin/env python3
"""Deterministic regen runner for derived artifacts (CONVENTIONS.md §13, ADR-013).

Reads `[generate]` from scripts/conventions.toml. Each artifact registers up to two
shell verbs:
  check : MUST exit non-zero when the committed artifact is stale (the drift guard)
  write : regenerates the artifact in place

  cpc-generate --check   run every `check`; exit 1 if any artifact is stale   (the net)
  cpc-generate --write   run every `write`; regenerate in place               (the discipline)
  cpc-generate           defaults to --check

cpc owns this runner and the staleness contract, NOT the generators. A generator
(an AST map, a Mermaid graph, a TOC) is project-specific and lives in the consumer
repo; cpc only runs the registered command and trusts its exit code. No `[generate]`
section -> no-op, exactly like cpc-glossary without a GLOSSARY.md.

Contract the runner cannot enforce, so it is documented (ADR-013):
  - `check` must be CHEAP (fingerprint-compare, not a full rebuild) — the runner runs
    whatever you register, so a heavy `check` taxes every pre-push.
  - `check` must be HONEST — exit non-zero iff stale. That is the whole guarantee.

Commands are split with shlex (shell=False): a registered command is one program with
args — no pipes/redirects in the manifest (wrap a pipeline in your own script and
register that). Keeps the manifest off the shell-injection surface and identical across
OSes (the Windows/mount split makes that matter).

stdlib only (Python 3.11+). Exit 1 on any failure; 0 otherwise.
"""
from __future__ import annotations
import argparse, shlex, subprocess, sys
from pathlib import Path

from cpc._config import load_config

# Absent section -> empty artifact list -> no-op. Mirrors the optional-section pattern
# load_config already uses for every other gate.
DEFAULTS = {"generate": {"artifact": []}}


def _run(cmd: str, root: Path) -> int:
    """Run one registered command from the repo root. shell=False (see module docstring)."""
    try:
        return subprocess.run(shlex.split(cmd), cwd=root).returncode
    except FileNotFoundError as e:
        print(f"  (command not found: {e})")
        return 127


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="Regenerate or drift-check derived artifacts (CONVENTIONS.md §13).")
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--config", default=None, type=Path)
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true",
                      help="fail if any artifact is stale (default)")
    mode.add_argument("--write", action="store_true",
                      help="regenerate every artifact in place")
    args = ap.parse_args(argv)
    root: Path = args.root.resolve()
    verb = "write" if args.write else "check"   # check is the default

    artifacts = load_config(root, args.config, DEFAULTS)["generate"].get("artifact", [])
    if not artifacts:
        print("cpc-generate: no [generate] artifacts -> OK (nothing to do)")
        return 0

    failed: list[str] = []
    for a in artifacts:
        name = a.get("name", "?")
        cmd = a.get(verb)
        if not cmd:
            print(f"WARN  {name}: no `{verb}` command registered — skipped")
            continue
        rc = _run(cmd, root)
        if rc != 0:
            failed.append(name)
            print(f"{'STALE' if verb == 'check' else 'FAILED'} {name}: `{cmd}` exit {rc}")
        else:
            print(f"OK    {name}")

    if failed:
        word = "stale" if verb == "check" else "failed"
        hint = ("regenerate: cpc-generate --write" if verb == "check"
                else "a generator errored — fix it before retry")
        print(f"\ncpc-generate: {len(failed)} artifact(s) {word} — {hint}")
        return 1
    print(f"\ncpc-generate: {len(artifacts)} artifact(s) OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
