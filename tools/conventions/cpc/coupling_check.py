#!/usr/bin/env python3
"""Coupling-note gate — enforce "name the coupling across >1 module" (CONVENTIONS §13, ADR-007).

A `commit-msg` gate: if the staged change spans more than one module (top-level directory, minus a
configurable ignore set), the commit message must carry a `coupling:` note explaining why they move
together. Forces cross-module changes to be deliberate and documented; a single-module change is
never gated.

  cpc-coupling-check [MESSAGE_FILE] [--root .] [--strict]

At commit-msg stage pre-commit passes the commit message file as the positional arg; if omitted the
gate falls back to <root>/.git/COMMIT_EDITMSG. stdlib only (Python 3.11+). Exit 1 to block.
"""
from __future__ import annotations
import argparse, re, subprocess
from pathlib import Path
try:
    import tomllib
except ModuleNotFoundError:  # Python < 3.11
    try:
        import tomli as tomllib  # type: ignore
    except ModuleNotFoundError:
        tomllib = None

DEFAULT_IGNORE = ["docs", ".claude", "tests", "ci", ".github"]
NOTE_RE = re.compile(r"coupling:", re.I)

def ignore_dirs(root: Path, explicit: Path | None) -> set[str]:
    path = explicit or (root / "scripts" / "conventions.toml")
    if path and path.exists() and tomllib is not None:
        try:
            with path.open("rb") as fh:
                data = tomllib.load(fh)
            vals = data.get("coupling", {}).get("ignore_dirs")
            if isinstance(vals, list):
                return {str(v) for v in vals}
        except (OSError, tomllib.TOMLDecodeError):
            pass
    return set(DEFAULT_IGNORE)

def staged_modules(root: Path, ignore: set[str]) -> set[str]:
    out = subprocess.run(["git", "diff", "--cached", "--name-only"],
                         cwd=root, capture_output=True, text=True).stdout
    mods: set[str] = set()
    for line in out.splitlines():
        p = line.strip()
        if "/" in p:                      # root-level files are not a "module"
            top = p.split("/", 1)[0]
            if top not in ignore:
                mods.add(top)
    return mods

def message_text(root: Path, msg_file: str | None) -> str:
    candidate = Path(msg_file) if msg_file else (root / ".git" / "COMMIT_EDITMSG")
    try:
        raw = candidate.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""
    # drop git's comment lines so a `coupling:` in a comment doesn't count
    return "\n".join(ln for ln in raw.splitlines() if not ln.lstrip().startswith("#"))

def main() -> int:
    ap = argparse.ArgumentParser(description="Require a coupling: note for >1-module commits.")
    ap.add_argument("message_file", nargs="?", default=None)
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--config", default=None, type=Path)
    ap.add_argument("--strict", action="store_true")  # accepted for hook-arg uniformity
    args = ap.parse_args()
    root: Path = args.root.resolve()

    if not (root / ".git").exists():
        print("coupling_check: not a git repo -> OK (nothing to gate)")
        return 0

    mods = staged_modules(root, ignore_dirs(root, args.config))
    if len(mods) <= 1:
        print(f"coupling_check: {len(mods)} module(s) staged -> OK")
        return 0

    if NOTE_RE.search(message_text(root, args.message_file)):
        print(f"coupling_check: {len(mods)} modules + coupling: note present -> OK")
        return 0

    mlist = ", ".join(sorted(mods))
    print(
        f"ERROR coupling-check (CONVENTIONS §13): change spans {len(mods)} modules ({mlist}) "
        f"but the commit message has no `coupling:` note.\n"
        f"  Add a line to the message, e.g.:  coupling: <why these modules move together>"
    )
    return 1

if __name__ == "__main__":
    raise SystemExit(main())
