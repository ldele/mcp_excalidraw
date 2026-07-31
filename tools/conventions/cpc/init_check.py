#!/usr/bin/env python3
"""Profile-aware project-init completeness gate (ADR-005 layer 3, ADR-006).

The forcing function of the init system: ADR-005 has no hook that auto-fires init, so this gate is
the mechanism — an un-initialized (or half-initialized) project fails its first commit until it
carries the required init artifacts for its profile. `cpc-init` lays them; this verifies presence.

  cpc-init-check --root . [--profile prototype|standard] [--strict]

Profile resolution: --profile, else `[cpc] profile` in <root>/scripts/conventions.toml, else
`prototype`. (Single source of truth, §5: the profile is recorded once in conventions.toml; the
standard profile lays one declaring profile="standard", so graduation flips the required set with
no manual edit.)

Scope: this gate validates CONSUMER projects. It is NOT run on the cpc meta-repo itself (that repo
IS the standard — it carries CONVENTIONS.md, not a pointer CLAUDE.md, and no KNOWN_ISSUES.md).

stdlib only (Python 3.11+). Exit 1 on errors; warnings also fail under --strict.
"""
from __future__ import annotations
import argparse, sys
from pathlib import Path
try:
    import tomllib
except ModuleNotFoundError:  # Python < 3.11
    try:
        import tomli as tomllib  # type: ignore
    except ModuleNotFoundError:
        tomllib = None

# Per profile: (required files, required dirs, recommended files). A file is a path relative to
# --root; a dir is checked for existence as a directory. Missing required -> ERROR; missing
# recommended -> WARN (fails under --strict). standard = prototype + the standard-only extras.
# ADR-014: cpc-init lays AGENTS.md (canonical entry) + CLAUDE.md (the `@AGENTS.md` stub) in every
# profile, so both are required. The §12/§13 preference link lives in the entry file (AGENTS.md);
# the stub CLAUDE.md carries only the import.
_PROTO_REQUIRED_FILES = [
    "AGENTS.md", "CLAUDE.md", ".claude/CONTEXT.md", ".claude/SESSION.md",
    ".claude/KNOWN_ISSUES.md", ".gitattributes",
]
_RECOMMENDED_FILES = [".gitignore", ".claude/.gitignore"]
_STANDARD_REQUIRED_FILES = ["docs/DEVLOG.md", "docs/ROADMAP.md",
                            "docs/architecture.md", "scripts/conventions.toml"]
_STANDARD_REQUIRED_DIRS = ["docs/decisions"]

def required_files(profile: str) -> list[str]:
    if profile == "standard":
        return _PROTO_REQUIRED_FILES + _STANDARD_REQUIRED_FILES
    return list(_PROTO_REQUIRED_FILES)

def required_dirs(profile: str) -> list[str]:
    return list(_STANDARD_REQUIRED_DIRS) if profile == "standard" else []

def resolve_profile(root: Path, explicit: str | None) -> str:
    """--profile wins; else [cpc] profile in scripts/conventions.toml; else 'prototype'."""
    if explicit:
        return explicit
    cfg = root / "scripts" / "conventions.toml"
    if cfg.exists() and tomllib is not None:
        try:
            with cfg.open("rb") as fh:
                data = tomllib.load(fh)
            prof = str(data.get("cpc", {}).get("profile", "")).lower()
            if prof in ("prototype", "standard"):
                return prof
        except (OSError, tomllib.TOMLDecodeError):
            pass
    return "prototype"

def main() -> int:
    ap = argparse.ArgumentParser(description="Profile-aware project-init completeness gate.")
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--profile", choices=["prototype", "standard"], default=None,
                    help="override the profile (else read from conventions.toml, else prototype)")
    ap.add_argument("--strict", action="store_true", help="warnings also fail the run")
    args = ap.parse_args()
    root: Path = args.root.resolve()
    profile = resolve_profile(root, args.profile)
    errors: list[str] = []
    warns: list[str] = []

    for rel in required_files(profile):
        if not (root / rel).is_file():
            errors.append(f"[init] required for profile '{profile}': missing file {rel}")
    for rel in required_dirs(profile):
        if not (root / rel).is_dir():
            errors.append(f"[init] required for profile '{profile}': missing directory {rel}/")
    for rel in _RECOMMENDED_FILES:
        if not (root / rel).is_file():
            warns.append(f"[init] recommended: missing {rel}")

    # ADR-007: presence of the nine engineering preferences is enforced here — the canonical entry
    # file must link the standard (CONVENTIONS §12 design principles + §13 working protocol). Per
    # ADR-014 the entry file is AGENTS.md (with CLAUDE.md the bare `@AGENTS.md` stub); fall back to
    # CLAUDE.md for a CLAUDE-canonical project. Only checked when the entry file exists (its absence
    # is already an error above).
    entry = root / "AGENTS.md"
    if not entry.is_file():
        entry = root / "CLAUDE.md"
    if entry.is_file() and "CONVENTIONS" not in entry.read_text(encoding="utf-8", errors="ignore"):
        errors.append(f"[init] {entry.name} does not reference CONVENTIONS (the §12/§13 preference "
                      f"home) — engineering-preference presence not carried (ADR-007)")

    for w in warns:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    fail = bool(errors) or (args.strict and bool(warns))
    print(f"\ninit_check: {len(errors)} error(s), {len(warns)} warning(s) -> "
          f"{'FAIL' if fail else 'OK'}  (profile={profile}, root={root})")
    return 1 if fail else 0

if __name__ == "__main__":
    raise SystemExit(main())
