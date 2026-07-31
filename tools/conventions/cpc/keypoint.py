#!/usr/bin/env python3
"""Keypoint runner: deterministic floor + skill-or-inline checklist at workflow keypoints
(CONVENTIONS.md S15, ADR-020).

A *keypoint* is a moment where workflow discipline routinely decays: session start/end, sprint
activation, sprint closeout. cpc cannot force an agent skill to fire (triggering is probabilistic
and the skill library may not be installed), so each keypoint degrades honestly, in two layers:

  1. deterministic floor  -- existing on-call gates run here as subprocesses; exit 1 on failure.
  2. judgment checklist   -- printed lines. Each names the owning claude-skills skill when one
     exists, so an agent WITH the plugin routes to the skill and an agent WITHOUT it still has
     the full inline procedure. The checklist never fails the run (ADR-007 honesty rule: prose
     is never dressed up as a gate).

  cpc-keypoint plan-start | session-start | session-close | sprint-start | sprint-close
  cpc-keypoint --list

Composes existing gates only -- no new failure class. Extend per project via
scripts/conventions.toml (both keys optional):

  [keypoints.session-close]
  run       = ["python -m pytest -q"]   # extra deterministic commands (shlex, shell=False)
  checklist = ["Also do X"]             # extra judgment lines

`sprint-start` additionally leaves an artifact (SPEC-keypoint-stamp, ADR-027 amendment): with
`[sprint] require_spec_ledger` on, its floor gains `docs_check --strict --pre-stamp` and a green
run writes/refreshes a `- **keypoint:** sprint-start <ts>` line beside the started contract's
`started:` stamp — the line docs_check rule 15c reads, so a skipped activation ritual is a red
gate, not a silent miss. The stamp claims only "the floor ran green at this time"; never that the
judgment checklist was done well (ADR-007 split).

stdlib only (Python 3.11+). Exit 1 iff any deterministic command fails; 0 otherwise.
"""
from __future__ import annotations
import argparse, datetime as dt, os, re, shlex, subprocess, sys
from pathlib import Path

from cpc._config import load_config
from cpc.docs_check import header_of

DEFAULTS = {"keypoints": {},
            # mirrors docs_check's [sprint] default: the stamp machinery rides the same toggle as
            # rule 15/15c — one discipline, one switch (SPEC-keypoint-stamp Q3). Off in code, ON in
            # the laid template, so already-vendored consumers see no behaviour change.
            "sprint": {"require_spec_ledger": False}}

STARTED_LINE_RE = re.compile(r"- \*\*started:\*\*")            # the ADR-019 activation stamp
STAMP_LINE_RE = re.compile(r"- \*\*keypoint:\*\* sprint-start\b")  # the rule-15c ritual stamp

# (label, cpc module, extra argv) -- run as `python -m cpc.<module> --root <root> <extra>`.
GateCmd = tuple[str, str, list[str]]
# (owning skill or None, instruction)
Item = tuple[str | None, str]

KEYPOINTS: dict[str, dict] = {
    "plan-start": {
        "why": "lock the increment before it becomes SPECs; kill weak plans early",
        "run": [],
        "checklist": [
            ("iterative-planning", "Lock the next increment: scope + definition-of-done in "
                                   "docs/ROADMAP.md rows; one increment = one sprint."),
            ("plan-graph", "Render the ROADMAP as a dependency DAG; identify what can run "
                           "in parallel vs what must serialize. Skip when the work is "
                           "serial or a single increment is in flight."),
            ("grill-me", "Plan novel, contested, or >1 open fork? Stress-test it: walk every "
                         "open branch to resolved-or-parked BEFORE a row becomes a SPEC; "
                         "route each resolution to its artifact. Skip a routine increment."),
        ],
    },
    "session-start": {
        "why": "orient before touching anything",
        "run": [],
        "checklist": [
            ("session-baton", "Read the baton: newest 3 entries of .claude/SESSION.md; "
                              "declare which tool is active."),
            (None, "Read .claude/CONTEXT.md (locked facts, current phase) and the newest 3 "
                   "docs/DEVLOG.md entries."),
            (None, "Scan .claude/KNOWN_ISSUES.md for gotchas that bite today's task."),
            ("atlas-keeper", "Non-trivial task? Search the cross-project atlas for prior "
                             "lessons before proposing a solution."),
        ],
    },
    "session-close": {
        "why": "leave the repo handoff-clean; docs reflect reality",
        "run": [
            ("docs-check --strict", "docs_check", ["--strict"]),
            ("generate --check", "generate", ["--check"]),
        ],
        "checklist": [
            ("dev-log", "One docs/DEVLOG.md entry per logical change: what / why / rejected / "
                        "opens."),
            ("session-baton", "Append a NEW .claude/SESSION.md entry at the TOP "
                              "(## YYYY-MM-DD -- <tool> -- <topic>): done / verified / "
                              "not done / next. Rotate past the cap."),
            (None, "Derived artifacts stale? Regenerate and review the diff: "
                   "cpc-generate --write."),
            (None, "Stage everything (git add); NEVER commit or push -- that is the human's "
                   "call (cpc-push-guard)."),
            ("handoff", "Continuing in another session or agent? Compact this session into a "
                        "handoff doc."),
        ],
    },
    "sprint-start": {
        "why": "activate one contract; de-risk the approach; read the read-set; tests first",
        "run": [],
        "checklist": [
            (None, "Exactly one active contract: cpc-sprint-start --sprint NNN --slug <slug> "
                   "(stamps started:). None materialized yet? cpc-roadmap-sync creates one "
                   "from the ROADMAP row."),
            ("grill-me", "Task arrived as a one-liner, or the SPEC's ## Open questions ledger "
                         "has open rows? Grill the spec (scoped mode, 3-7 questions): resolve "
                         "or park every row; the CONTEXT.md familiarity map decides "
                         "ask-vs-research per question (ADR-027)."),
            (None, "Ledger resolved? Re-run THIS keypoint before executing: with [sprint] "
                   "require_spec_ledger on, the floor runs docs_check --strict and a green run "
                   "stamps the contract (- **keypoint:** sprint-start — rule 15c reads it)."),
            ("spike-gate", "Approach unproven? De-risk before committing the direction: "
                           "hypothesis / value + kill-criterion / prior-art scan / bounded "
                           "PoC -> proceed / pivot / kill. Skip if the path is well-trodden."),
            (None, "Read the read-set and stay inside it: the contract's `uses` files plus "
                   "the SPEC executor brief in docs/specs/."),
            ("test-strategy", "Implement the SPEC's test-case table as FAILING tests first, "
                              "then build to green."),
            (None, "Planning hole found mid-work? APPEND one line to the contract's ## gaps "
                   "-- never guess, never widen scope silently."),
        ],
    },
    "sprint-close": {
        "why": "prove the contract was honoured; package the review",
        "run": [
            ("docs-check --strict", "docs_check", ["--strict"]),
            ("sprint-check", "sprint_check", []),
        ],
        "checklist": [
            ("sprint-closeout", "Generate the closeout package: cpc-sprint-report --stdout; "
                                "fill the judgment placeholders honestly."),
            (None, "Disposition EVERY ## gaps line: a ROADMAP row, KNOWN_ISSUES, a SPEC "
                   "amendment, or an explicit drop -- no gap dies in the archive."),
            ("known-issues", "A gap is recurring or a design weakness (not a one-off)? Log "
                             "it to .claude/KNOWN_ISSUES.md, not just a ROADMAP row."),
            ("sprint-review", "Hand the report to a fresh-context reviewer for the ship/hold "
                              "verdict; fixes route through a SPEC amendment, never an inline "
                              "edit."),
            ("deep-review", "Sprint logged gaps, deviated from the SPEC, or touched "
                            "charter/ADR territory? Intent verdict (distinct from "
                            "sprint-review, ADR-028 boundary): judge the change against "
                            "DESIGN_CHARTER / PLAN / ADRs; advisory, non-blocking, cited "
                            "findings. Skip a clean mechanical sprint. They compose."),
            ("atlas-keeper", "A transferable lesson came out of this sprint? Propose an atlas "
                             "entry -- 'atlas it?'."),
            (None, "Stage everything; propose a Conventional-Commit message; the human "
                   "commits."),
        ],
    },
}


def _gate_env() -> dict[str, str]:
    """Child env with this cpc package's parent on PYTHONPATH, so the subprocess resolves the
    SAME copy whether cpc is installed, run from src/, or vendored in tools/conventions/."""
    env = dict(os.environ)
    pkg_parent = str(Path(__file__).resolve().parent.parent)
    env["PYTHONPATH"] = os.pathsep.join(
        p for p in (pkg_parent, env.get("PYTHONPATH", "")) if p)
    return env


def _run_gate(module: str, root: Path, extra: list[str]) -> int:
    cmd = [sys.executable, "-m", f"cpc.{module}", "--root", str(root), *extra]
    return subprocess.run(cmd, cwd=root, env=_gate_env()).returncode


def _run_shell(cmd: str, root: Path) -> int:
    """One registered extra command, shlex-split, shell=False (the cpc-generate contract:
    one program + args, no pipes -- wrap a pipeline in your own script)."""
    try:
        return subprocess.run(shlex.split(cmd), cwd=root).returncode
    except FileNotFoundError as e:
        print(f"  (command not found: {e})")
        return 127


def _started_contracts(root: Path) -> list[Path]:
    """Live contracts carrying the ADR-019 activation stamp — the same condition rule 15 gates on
    (status: active + `started:`; SPRINT-000 is the laid template, not a contract)."""
    sprints = root / "docs" / "sprints"
    out: list[Path] = []
    for f in sorted(sprints.glob("SPRINT-*.md")) if sprints.exists() else []:
        if f.name.startswith("SPRINT-000"):
            continue
        status, _ = header_of(f)
        text = f.read_text(encoding="utf-8", errors="ignore")
        if status == "active" and any(STARTED_LINE_RE.match(ln) for ln in text.splitlines()):
            out.append(f)
    return out


def _stamp_sprint_start(root: Path) -> int:
    """Write/refresh the `- **keypoint:** sprint-start <ts>` line beside `started:` on the single
    started contract (SPEC-keypoint-stamp). Idempotent: any existing stamp line is dropped and one
    fresh line inserted, so a re-run refreshes, never duplicates. Zero or >1 started contracts is
    a real finding — ambiguity fails the keypoint rather than guessing which contract ran."""
    contracts = _started_contracts(root)
    if len(contracts) != 1:
        if not contracts:
            print("  FAIL  keypoint stamp: no started contract to stamp — activate one first "
                  "(cpc-sprint-start --sprint NNN --slug <slug>)")
        else:
            names = ", ".join(c.name for c in contracts)
            print(f"  FAIL  keypoint stamp: {len(contracts)} started contracts ({names}) — "
                  "exactly one contract may be in execution; supersede the others first")
        return 1
    c = contracts[0]
    ts = dt.datetime.now().isoformat(timespec="seconds")
    lines = [ln for ln in c.read_text(encoding="utf-8").splitlines(keepends=True)
             if not STAMP_LINE_RE.match(ln)]
    at = next(i for i, ln in enumerate(lines) if STARTED_LINE_RE.match(ln))  # filtered on started:
    lines.insert(at + 1, f"- **keypoint:** sprint-start {ts}\n")
    c.write_text("".join(lines), encoding="utf-8", newline="")
    print(f"  OK    keypoint stamp: {c.relative_to(root).as_posix()} — sprint-start {ts}")
    return 0


def _git_worktree_info(root: Path) -> None:
    """Informational only -- a dirty tree at session close is EXPECTED (the human commits)."""
    try:
        proc = subprocess.run(["git", "status", "--porcelain"],
                              cwd=root, capture_output=True, text=True)
    except OSError:
        return
    if proc.returncode != 0:
        return  # not a git repo -> silent skip (the docs_check rule-12 precedent)
    changed = [ln for ln in proc.stdout.splitlines() if ln.strip()]
    if changed:
        print(f"  info  git: {len(changed)} changed path(s) in the working tree -- stage "
              "them and cover them in the baton entry; the human commits.")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="Run a workflow keypoint: deterministic floor + judgment checklist "
                    "(CONVENTIONS.md S15).")
    ap.add_argument("name", nargs="?", choices=sorted(KEYPOINTS),
                    help="which keypoint to run")
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--config", default=None, type=Path)
    ap.add_argument("--list", action="store_true", help="list keypoints and exit")
    args = ap.parse_args(argv)
    root: Path = args.root.resolve()

    if args.list or not args.name:
        for name in ("plan-start", "session-start", "sprint-start", "sprint-close", "session-close"):
            print(f"{name:15} {KEYPOINTS[name]['why']}")
        return 0

    kp = KEYPOINTS[args.name]
    cfg = load_config(root, args.config, DEFAULTS)
    user = cfg["keypoints"].get(args.name, {})

    # sprint-start rides the rule-15 toggle (SPEC-keypoint-stamp): the floor gains the strict docs
    # gate — --pre-stamp, because the stamp this run writes on green cannot exist yet (rule 15c
    # would fail its own activation) — and a green floor stamps the started contract below.
    stamping = args.name == "sprint-start" and cfg["sprint"].get("require_spec_ledger", False)
    gate_runs: list[GateCmd] = list(kp["run"])
    if stamping:
        gate_runs.insert(0, ("docs-check --strict (pre-stamp)", "docs_check",
                             ["--strict", "--pre-stamp"]))

    print(f"== cpc-keypoint {args.name} -- {kp['why']} ==")

    print("\ndeterministic floor:")
    failed: list[str] = []
    ran = 0
    for label, module, extra in gate_runs:
        rc = _run_gate(module, root, extra)
        ran += 1
        print(f"  {'OK  ' if rc == 0 else 'FAIL'}  {label}" + ("" if rc == 0 else f" (exit {rc})"))
        if rc != 0:
            failed.append(label)
    for cmd in user.get("run", []):
        rc = _run_shell(cmd, root)
        ran += 1
        print(f"  {'OK  ' if rc == 0 else 'FAIL'}  `{cmd}`" + ("" if rc == 0 else f" (exit {rc})"))
        if rc != 0:
            failed.append(cmd)
    if args.name == "session-close":
        _git_worktree_info(root)
    if not ran:
        print("  (none registered -- this keypoint is judgment only)")
    if stamping and not failed and _stamp_sprint_start(root) != 0:
        failed.append("keypoint stamp")

    print("\njudgment checklist (invoke the named skill if installed; else follow the line inline):")
    for skill, text in kp["checklist"]:
        prefix = f"({skill}) " if skill else ""
        print(f"  [ ] {prefix}{text}")
    for text in user.get("checklist", []):
        print(f"  [ ] {text}")

    if failed:
        print(f"\ncpc-keypoint {args.name}: {len(failed)} deterministic check(s) failed -- "
              "fix before closing the keypoint.")
        return 1
    print(f"\ncpc-keypoint {args.name}: deterministic floor OK -- the checklist is yours.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
