#!/usr/bin/env python3
"""Deterministic project init — lay the canonical layout, idempotent and partial-safe.

The mechanical layer of ADR-005 (init = script + thin orchestrator + completeness gate) scoped by
ADR-006 (two profiles, additive graduation). See docs/specs/SPEC-init-cli.md.

  cpc-init --root . [--profile prototype|standard] [--project NAME] [--dry-run]

`prototype` lays the minimum (root AGENTS.md + CLAUDE.md stub, .claude/ triad,
.gitattributes/.gitignore); `standard` adds the docs/ tree, sprint machinery, gate config, and the
just facade. Graduation is `--profile standard` run later on a prototype — it ADDS the standard-only
files and never clobbers an existing one. The genuine judgment (fill CONTEXT from a brief, pick a
language scaffold, draft the first ADR) is the orchestrator's job, not this script's.

Distribution (ADR-015, reverses ADR-002): the gates are VENDORED into the target repo, not pulled
from a remote pre-commit hooks repo. `cpc-init` copies the whole `cpc` package into
`tools/conventions/cpc/` plus a `_VERSION` stamp, so a freshly-init'd project owns its checkers and
has zero inter-repo dependency — nothing is fetched at commit time. The gates import each other as a
package, so they run as a MODULE on-call (`PYTHONPATH=tools/conventions python -m cpc.docs_check
--root .`, or `just check`), never as auto-firing hooks.
Re-running `cpc-init` re-vendors (overwrites tools/conventions/cpc/) to adopt a newer cpc.

stdlib only (Python 3.11+). Exit 0 on success; 1 only on a broken install (no templates found).
"""
from __future__ import annotations
import argparse, datetime as dt, re, shutil
from importlib import resources
from pathlib import Path
from cpc._console import make_console_safe

# --- what each profile lays -------------------------------------------------------------------
# (src relative to templates/, dest relative to --root, fill placeholders?)
# `fill` rewrites <PROJECT> and the YYYY-MM-DD header date; template files that the consumer
# instantiates *later* (ADR-000, SPRINT-000) keep their placeholders, so fill=False for those.
_PROTOTYPE: list[tuple[str, str, bool]] = [
    # ADR-014: AGENTS.md is the canonical (de-branded, cross-tool) entry file; CLAUDE.md is a
    # one-line `@AGENTS.md` import stub Claude Code expands. Both laid unconditionally (no opt-out):
    # the stub is one line, so an unused Claude-branded file costs ~nothing and the common
    # Claude-Code case keeps working. The stub has no placeholders (fill=False).
    ("AGENTS.root.md",            "AGENTS.md",                 True),
    ("CLAUDE.stub.md",            "CLAUDE.md",                 False),
    (".claude/CONTEXT.md",        ".claude/CONTEXT.md",        True),
    (".claude/SESSION.md",        ".claude/SESSION.md",        True),
    (".claude/KNOWN_ISSUES.md",   ".claude/KNOWN_ISSUES.md",   True),
    # ADR-035: the standing half of the writing contract — audience, register, standing answers.
    # Laid in BOTH profiles because a prototype's README is read by strangers too, and it is the
    # cheapest artifact here to fill (~20 lines). `cpc-init-check` treats it as RECOMMENDED, not
    # required: making it required would fail every consumer repo that has not re-vendored.
    (".claude/NORTH_STAR.md",     ".claude/NORTH_STAR.md",     True),
    (".claude/.gitignore",        ".claude/.gitignore",        False),
    (".gitattributes",            ".gitattributes",            False),
    (".gitignore",                ".gitignore",                False),
]
_STANDARD_EXTRA: list[tuple[str, str, bool]] = [
    ("docs/DEVLOG.md",                    "docs/DEVLOG.md",                    True),
    ("docs/ROADMAP.md",                   "docs/ROADMAP.md",                   True),
    ("docs/architecture.md",              "docs/architecture.md",              True),
    ("docs/decisions/ADR-000-template.md","docs/decisions/ADR-000-template.md",False),
    # ADR-037: the pivot variant. Laid alongside the plain template because a direction change is
    # commonest in the first weeks — exactly when a project has just graduated to `standard` and is
    # least likely to go looking for a template it has never heard of.
    ("docs/decisions/ADR-000-pivot-template.md","docs/decisions/ADR-000-pivot-template.md",False),
    ("docs/sprints/SPRINT-000-template.md","docs/sprints/SPRINT-000-template.md",False),
    # FEATURE-000 is deliberately NOT laid (ADR-039). It is an adaptable example, not a core
    # archetype, and it still ships in `templates/` for a project that wants it. Laying it by
    # default put an empty template in 3 of 6 consumer repos — the "directory nobody fills, so
    # every session learns to skip directories" failure §1's growth rule warns about.
    ("docs/specs/SPEC-000-template.md",    "docs/specs/SPEC-000-template.md",    False),  # ADR-019: executor brief
    ("conventions.toml",                  "scripts/conventions.toml",          False),
    ("GLOSSARY.md",                       "GLOSSARY.md",                       True),
    ("justfile",                          "justfile",                          True),   # ADR-011: just facade (fill=True rewrites <PROJECT> in the header). Lay only — no gate/hook/console entry.
]

def profile_files(profile: str) -> list[tuple[str, str, bool]]:
    if profile == "prototype":
        return list(_PROTOTYPE)
    return _PROTOTYPE + _STANDARD_EXTRA   # standard = prototype + extras (graduation is additive)

# --- vendored-gate wiring (ADR-015 — reverses ADR-002's pre-commit hooks repo) -----------------
# cpc is solo boilerplate: copy the checkers in, run them on call, depend on no remote. The gates
# import each other as a package (`from cpc._config import ...`), so the unit of vendoring is the
# whole `cpc` package — not loose scripts. Copy it to tools/conventions/cpc/ + a _VERSION stamp;
# the consumer runs it as a module: `PYTHONPATH=tools/conventions python -m cpc.docs_check --root .`
# (or `just check`). No
# pre-commit config is generated and no hook is wired: drift is acceptable precisely because the
# gates are on-call, not gating every commit (a stale copy can't block work). Re-running cpc-init
# re-vendors (the one place that DOES overwrite, by design — it is how you adopt a newer cpc).
_VENDOR_DST = "tools/conventions/cpc"   # relative to --root

def _cpc_pkg_dir() -> Path:
    """The installed/editable `cpc` package dir (the .py gate sources to vendor)."""
    return Path(__file__).resolve().parent

def _cpc_version() -> str:
    try:
        from cpc import __version__   # set in src/cpc/__init__.py
        return str(__version__)
    except Exception:
        return "unknown"

def _manifest_of(stamp: Path) -> list[str]:
    """The modules the PREVIOUS drop recorded writing. Read before `_VERSION` is overwritten."""
    if not stamp.is_file():
        return []
    for ln in stamp.read_text(encoding="utf-8", errors="ignore").splitlines():
        if ln.startswith("modules:"):
            return ln.split(":", 1)[1].split()
    return []

def _retired_modules(previous: list[str], shipping: set[str]) -> list[str]:
    """What the last drop wrote that this one no longer ships — a rename or removal in cpc.

    Copying never removes, so before this a retired module stayed in every consumer tree forever,
    and `init_check`'s manifest check could not see it either: that check reads named-but-absent,
    and a ghost is the mirror — present but unnamed. It is not inert. `settings_doc` walks modules
    dynamically, so a ghost carrying a stale DEFAULTS puts phantom settings in a consumer's
    generated SETTINGS.md.

    The removal set comes from the manifest and never from a directory listing: cpc deletes only
    what cpc recorded putting there, so a file the consumer added survives (init_check flags it
    instead). `_VERSION` is read out of the consumer's tree, which makes it untrusted input to a
    delete — names are filtered to bare `*.py` filenames so a manifest reading `../../AGENTS.md` is
    skipped rather than resolved.
    """
    return sorted(m for m in previous
                  if m not in shipping and m.endswith(".py") and m == Path(m).name)

def vendor_gates(root: Path, dry_run: bool) -> None:
    """Copy the cpc package into tools/conventions/cpc/ (+ _VERSION). Overwrites on re-run."""
    src = _cpc_pkg_dir()
    dst = root / _VENDOR_DST
    rel = _VENDOR_DST
    py_files = sorted(p.name for p in src.glob("*.py"))
    retired = _retired_modules(_manifest_of(dst / "_VERSION"), set(py_files))
    if dry_run:
        print(f"+ would vendor: {rel}/  ({len(py_files)} modules, cpc {_cpc_version()})")
        for name in retired:
            print(f"- would remove: {rel}/{name}  (retired — not shipped by cpc {_cpc_version()})")
        return
    dst.mkdir(parents=True, exist_ok=True)
    for name in py_files:
        shutil.copy2(src / name, dst / name)
    for name in retired:
        (dst / name).unlink(missing_ok=True)
        print(f"- removed: {rel}/{name}  (retired — not shipped by cpc {_cpc_version()})")
    # The license notice travels with the vendor drop, so substantial copies stay marked (an
    # all-rights-reserved notice — see LICENSE). Resolved next to the templates dir (repo root on
    # an editable/source install); absent (bare wheel) -> skipped.
    lic = _templates_dir().parent / "LICENSE"
    if lic.is_file():
        shutil.copy2(lic, dst / "LICENSE")
    # Line 1 stays the bare version (any reader that took the first line still works). The manifest
    # below it is what makes a PARTIAL drop detectable: the gates import each other, so a copy that
    # is missing one module fails with a raw `ModuleNotFoundError` traceback at import — the gate
    # dies instead of reporting, and the message names a cpc internal rather than the real problem.
    # `cpc-init-check` reads this list and says "re-run cpc-init" instead.
    (dst / "_VERSION").write_text(
        _cpc_version() + "\nmodules: " + " ".join(py_files) + "\n",
        encoding="utf-8", newline="")
    (root / "tools" / "conventions" / ".gitignore").write_text("__pycache__/\n", encoding="utf-8", newline="")
    print(f"+ vendored gates: {rel}/  ({len(py_files)} modules, cpc {_cpc_version()})")

# --- template resolution (works editable AND wheel-installed; see SPEC risk 1) -----------------
def _templates_dir() -> Path:
    src = Path(__file__).resolve().parents[2] / "templates"        # repo root / editable install
    if src.is_dir():
        return src
    pkg = Path(str(resources.files("cpc").joinpath("templates")))  # installed wheel (force-include)
    if pkg.is_dir():
        return pkg
    raise SystemExit("cpc-init: templates/ not found — broken install (expected repo templates/ "
                     "or packaged cpc/templates/).")

def _fill(text: str, project: str, today: str) -> str:
    return text.replace("<PROJECT>", project).replace("YYYY-MM-DD", today)

# Entry-file routes whose targets only the standard profile lays. On a prototype they dangle, and
# the vendored docs_check [route] gate rightly ERRORs on a dangling route — so an untrimmed entry
# file made a fresh prototype fail its own gate out of the box (ADR-021).
# `docs/DIGEST.md` joins the list for a different reason than the others: it is never laid by ANY
# profile — it appears once a project registers cpc-digest under [generate]. The standard profile
# tolerates the dangling route through its laid `[routes] allow_missing`; a prototype lays no
# conventions.toml at all, so the line has to go instead.
_PROTO_ENTRY_DROPS = ("`docs/DEVLOG.md`", "`docs/ROADMAP.md`", "`docs/architecture.md`",
                      "`docs/DIGEST.md`")

# The on-call invocation, in both shells. `PYTHONPATH=x cmd` is POSIX-only: PowerShell parses
# `PYTHONPATH=tools/conventions` as a command name and fails with CommandNotFoundException before
# python ever starts. cpc is developed on Windows and half the fleet runs there, so printing only
# the POSIX form hands most consumers a command that cannot work in their default shell.
GATE_CMD_POSIX = "PYTHONPATH=tools/conventions python -m cpc.docs_check --root . --strict"
GATE_CMD_PWSH = ('$env:PYTHONPATH="tools/conventions"; '
                 "python -m cpc.docs_check --root . --strict")

def _trim_entry_for_prototype(body: str) -> str:
    """Drop entry-file lines routing to docs/ files the prototype does not lay (ADR-021).

    The template stays canonical for standard; the trim happens at lay time only. Dropping the
    DEVLOG line gaps the numbered read-order list, so contiguous numbered runs are renumbered.
    Graduation never rewrites AGENTS.md, so main() prints a restore hint instead of editing it.
    """
    kept = [ln for ln in body.splitlines() if not any(m in ln for m in _PROTO_ENTRY_DROPS)]
    out: list[str] = []
    n = 0
    for ln in kept:
        m = re.match(r"^(\d+)\. ", ln)
        if m:
            n += 1
            out.append(f"{n}. {ln[m.end():]}")
        elif ln[:1] in (" ", "\t"):
            out.append(ln)   # indented continuation of the current item — the run stays open
        else:
            n = 0
            out.append(ln)
    return "\n".join(out) + "\n"

def lay(root: Path, profile: str, project: str, today: str, dry_run: bool) -> tuple[int, int]:
    """Lay the profile's files. Returns (created, skipped). Never overwrites an existing file."""
    tdir = _templates_dir()
    created = skipped = 0
    for src_rel, dst_rel, fill in profile_files(profile):
        dst = root / dst_rel
        if dst.exists():
            print(f"= exists, skipped: {dst_rel}")
            skipped += 1
            continue
        body = (tdir / src_rel).read_text(encoding="utf-8")
        if fill:
            body = _fill(body, project, today)
        if profile == "prototype" and dst_rel == "AGENTS.md":
            body = _trim_entry_for_prototype(body)
        if dry_run:
            print(f"+ would create: {dst_rel}")
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text(body, encoding="utf-8", newline="")
            print(f"+ created: {dst_rel}")
        created += 1
    return created, skipped

def main() -> int:
    make_console_safe()   # KI-9: never crash echoing text cpc did not write
    ap = argparse.ArgumentParser(description="Lay the canonical claude-project-conventions layout.")
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--profile", choices=["prototype", "standard"], default="prototype")
    ap.add_argument("--project", default=None, help="project name for <PROJECT> (default: --root dir name)")
    ap.add_argument("--no-vendor", action="store_true", help="skip copying the gate scripts into tools/conventions/")
    ap.add_argument("--dry-run", action="store_true", help="print the plan; write nothing")
    args = ap.parse_args()
    root: Path = args.root.resolve()
    project = args.project or root.name
    today = dt.date.today().isoformat()

    print(f"cpc-init: profile={args.profile} project={project} root={root}"
          f"{'  (dry-run)' if args.dry_run else ''}")
    # Graduation = standard run over a prototype-era (trimmed, ADR-021) entry file. AGENTS.md is
    # never rewritten, so it keeps missing the docs routes — hint, don't edit. Keyed on the routes
    # actually being absent: a plain standard-repo re-vendor must not nag.
    entry = root / "AGENTS.md"
    graduating = (args.profile == "standard" and entry.is_file()
                  and "`docs/DEVLOG.md`" not in entry.read_text(encoding="utf-8", errors="ignore"))
    created, skipped = lay(root, args.profile, project, today, args.dry_run)
    if not args.no_vendor:
        vendor_gates(root, args.dry_run)

    verb = "would create" if args.dry_run else "created"
    print(f"\ncpc-init: {created} {verb}, {skipped} already present -> OK")
    if args.profile == "prototype":
        print("Next: fill AGENTS.md / .claude/CONTEXT.md placeholders (CLAUDE.md is the `@AGENTS.md` "
              "stub); graduate with `cpc-init --root . --profile standard` when the project grows.")
    else:
        print("Next: fill the laid placeholders (CONTEXT, ROADMAP, architecture), then run the "
              "vendored gate:")
        print(f"  {GATE_CMD_POSIX}")
        print(f"  {GATE_CMD_PWSH}   (PowerShell)")
        if graduating:
            print("Graduating a prototype? Restore the trimmed docs routes in AGENTS.md (the "
                  "DEVLOG read-order line + the Reference line -- see templates/AGENTS.root.md); "
                  "cpc-init never rewrites an existing file (ADR-021).")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
