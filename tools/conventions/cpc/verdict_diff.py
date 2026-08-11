#!/usr/bin/env python3
"""Two-revision verdict differ — what changes for someone who upgrades (ROADMAP PR-22).

  cpc-verdict-diff --base v1.3.0 --root <tree> [--root <tree>...] [--gate docs_check ...]

Runs the SAME gate over the SAME tree at two revisions of cpc and reports only the delta: findings
that appear, findings that go away, and how many were already there. ADR-029's goldens catch verdict
changes cpc did not intend; this reports the ones it did, in the form the question is actually asked
— "I am on 1.2.3, what fires if I re-vendor?"

**Never a gate (ADR-022).** Exit is 0 whatever the delta, including when a gate crashes at one
revision. A report that can fail a build is a gate wearing a report's name, and ADR-022 exists
because this repo shipped that mistake once already. `main()` returns 0 on every path; the tests pin
it, because "never a gate" is a claim about the exit code and nothing else.

Why the comparison is on rendered TEXT and not on `--format json`: JSON output and `findings.py`
arrived in 1.4.0, so **no released revision before it can emit JSON** — measured, not assumed
(v1.0.0 → v1.3.0 all lack the module). Every consumer today is on 1.1.0–1.3.0, so a JSON-only
differ would be blind to exactly the upgrades anyone wants to preview. The text line
`SEV   [rule] message` is byte-identical from v1.3.0 to HEAD, which makes it the one representation
both sides of any real comparison share.

stdlib only (Python 3.11+).
"""
from __future__ import annotations
import argparse, os, re, shutil, subprocess, sys, tempfile
from collections import Counter
from contextlib import ExitStack, contextmanager
from pathlib import Path

# `ERROR [route] ...`, `WARN  [living] ...`, `advisory [x] ...`. Deliberately permissive about the
# severity word and the rule name: this parses output from revisions this code has never seen, and a
# tightened pattern would silently drop findings rather than fail. The summary line
# ("docs_check: 0 error(s) ...") has no bracketed rule and so cannot match.
FINDING_RE = re.compile(r"^(\w+)\s+\[([^\]]+)\]\s*(.*)$")
ISO_DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")

DEFAULT_GATES = ("docs_check",)

# Exit codes a gate uses to mean "I ran and found things". Anything else is a crash, and a crash at
# one revision is reported as such rather than being read as "no findings" — a differ that treats a
# traceback as an empty verdict invents a delta in whichever direction the crash happened.
GATE_RAN = (0, 1)


def normalize(line: str, root: Path) -> str:
    """Strip everything that changes between two runs but not between two verdicts.

    Absolute roots and ISO dates both move without the verdict moving — `normalize` in the corpus
    harness scrubs the same two for the same reason. Without the date scrub every rule-12 finding
    reads as changed every single day.
    """
    out = line.replace(str(root), "<ROOT>").replace(root.as_posix(), "<ROOT>")
    out = out.replace("\\", "/")
    return ISO_DATE_RE.sub("<DATE>", out).rstrip()


def parse(text: str, root: Path) -> Counter:
    """The findings in a gate's text output, as a multiset.

    A multiset and not a set: the same rule can fire twice on one file with an identical rendered
    message, and collapsing those would report a real 2 → 1 change as no change at all.
    """
    found: Counter = Counter()
    for raw in text.splitlines():
        m = FINDING_RE.match(raw.strip())
        if m:
            found[normalize(f"{m.group(1).upper():<5} [{m.group(2)}] {m.group(3)}", root)] += 1
    return found


def run_gate(src: Path, gate: str, root: Path) -> tuple[bool, Counter, str]:
    """Run one gate from `src` over `root`. Returns (ran, findings, note).

    `ran=False` means the gate could not produce a verdict here — most often because the module did
    not exist at that revision, which is normal when diffing across a release that added a gate.
    """
    env = dict(os.environ)
    # Both revisions must render the same bytes. Without this the gates' `—` dies or degrades on a
    # cp1252 console, and that degradation shows up as a delta in every message containing one.
    env.update({"PYTHONPATH": str(src), "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"})
    proc = subprocess.run([sys.executable, "-m", f"cpc.{gate}", "--root", str(root)],
                          capture_output=True, text=True, encoding="utf-8", errors="replace",
                          env=env, check=False)
    err = proc.stderr or ""
    tail = (err or proc.stdout).strip().splitlines()
    why = tail[-1] if tail else f"exit {proc.returncode}"
    # stderr is inspected BEFORE the return code, and that order is the whole correctness of this
    # function. `python -m cpc.rotate` against a revision that has no such module exits **1** — the
    # same code a gate uses for "I ran and found errors" — so a return-code-only check reads a
    # missing gate as a clean verdict and silently invents a delta the size of that gate's entire
    # output. Caught by the test for exactly this case, having been written the wrong way first.
    if "No module named" in err:
        return False, Counter(), f"gate does not exist at this revision ({why})"
    if "Traceback (most recent call last)" in err:
        return False, Counter(), f"gate crashed ({why})"
    if proc.returncode not in GATE_RAN:
        return False, Counter(), why
    return True, parse(proc.stdout, root), ""


@contextmanager
def checkout(repo: Path, rev: str):
    """A detached worktree at `rev`, removed on the way out.

    A worktree and not `git stash`/`git checkout`: this runs against a repo someone is working in,
    and a differ that moves the caller's HEAD to read an old revision is a report with a side
    effect. `--force` on removal because the gates leave `__pycache__` behind.
    """
    dest = Path(tempfile.mkdtemp(prefix="cpc-verdict-diff-")) / re.sub(r"[^A-Za-z0-9._-]", "_", rev)
    add = subprocess.run(["git", "-C", str(repo), "worktree", "add", "--detach", "-f",
                          str(dest), rev], capture_output=True, text=True, check=False)
    if add.returncode != 0:
        raise SystemExit(f"cpc-verdict-diff: cannot check out '{rev}' — "
                         f"{(add.stderr or add.stdout).strip()}")
    try:
        yield dest
    finally:
        subprocess.run(["git", "-C", str(repo), "worktree", "remove", "--force", str(dest)],
                       capture_output=True, text=True, check=False)
        shutil.rmtree(dest, ignore_errors=True)


def delta(base: Counter, head: Counter) -> tuple[list[str], list[str], int]:
    """(gained, lost, unchanged). Multiset arithmetic, so a 2 → 1 shows as one lost."""
    gained = sorted((head - base).elements())
    lost = sorted((base - head).elements())
    return gained, lost, sum((base & head).values())


_NOT_CPC = ("cpc-verdict-diff: not inside a git checkout of cpc. This tool compares two revisions of "
            "cpc's OWN source, so it needs cpc's history. A vendored copy "
            "(tools/conventions/cpc/) carries the modules but not the repository — run this from a "
            "clone of cpc instead.")

def repo_root(start: Path) -> Path:
    """The cpc checkout this module was loaded from, or a clear refusal.

    The identity check is not ceremony. Run from a VENDORED copy, `rev-parse` succeeds and returns
    the *consumer's* repo root — a real git repo that simply is not cpc. Without the check the tool
    would go on to look for `v1.3.0` in someone else's history and fail with git's wording about an
    unknown revision, which sends the reader hunting for a missing tag instead of telling them they
    are in the wrong repository.
    """
    proc = subprocess.run(["git", "-C", str(start), "rev-parse", "--show-toplevel"],
                          capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise SystemExit(_NOT_CPC)
    root = Path(proc.stdout.strip())
    if not (root / "src" / "cpc" / "verdict_diff.py").is_file():
        raise SystemExit(_NOT_CPC)
    return root


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Report how a gate's verdict changes between two revisions of cpc. "
                    "A report, never a gate (ADR-022) — always exits 0.")
    ap.add_argument("--base", required=True, help="revision to compare FROM (e.g. v1.3.0)")
    ap.add_argument("--head", default=None,
                    help="revision to compare TO (default: the working tree as it stands)")
    ap.add_argument("--root", action="append", default=[], type=Path, required=True,
                    help="tree to gate; repeat for more than one")
    ap.add_argument("--gate", action="append", default=[],
                    help=f"gate module to run; repeat (default: {', '.join(DEFAULT_GATES)})")
    args = ap.parse_args()

    gates = args.gate or list(DEFAULT_GATES)
    repo = repo_root(Path(__file__).resolve().parent)
    roots = [r.resolve() for r in args.root]
    missing = [r for r in roots if not r.is_dir()]
    if missing:
        raise SystemExit(f"cpc-verdict-diff: no such tree: {', '.join(str(m) for m in missing)}")

    head_label = args.head or "working tree"
    print(f"cpc-verdict-diff: {args.base} -> {head_label}   "
          f"({len(roots)} tree(s), {len(gates)} gate(s))\n")

    total_gained = total_lost = total_same = 0
    with ExitStack() as stack:
        base_src = stack.enter_context(checkout(repo, args.base)) / "src"
        # The head side is the working tree by default, so uncommitted work is included — that is
        # the state a maintainer is deciding about at a release cut. ExitStack rather than a manual
        # __enter__/__exit__ pair: if the second checkout fails, the first must still be removed.
        head_src = (stack.enter_context(checkout(repo, args.head)) / "src") if args.head \
            else repo / "src"
        for root in roots:
            for gate in gates:
                base_ran, base_f, base_why = run_gate(base_src, gate, root)
                head_ran, head_f, head_why = run_gate(head_src, gate, root)
                print(f"{root.name} / {gate}")
                if not base_ran or not head_ran:
                    # Named, never silently treated as an empty verdict.
                    side = f"{args.base}: {base_why}" if not base_ran else f"{head_label}: {head_why}"
                    print(f"  ?  no verdict — {side}")
                    print("     (skipped; a crash is not a finding and not an absence of one)\n")
                    continue
                gained, lost, same = delta(base_f, head_f)
                for line in gained:
                    print(f"  + {line}")
                for line in lost:
                    print(f"  - {line}")
                print(f"  = {same} unchanged" + ("" if gained or lost else "   (no delta)"))
                print()
                total_gained += len(gained)
                total_lost += len(lost)
                total_same += same

    print(f"TOTAL: +{total_gained} new, -{total_lost} gone, {total_same} unchanged")
    print("Report only — never a gate (ADR-022); exit 0 regardless of the delta.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
