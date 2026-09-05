#!/usr/bin/env python3
"""CI spend reporter — what a repo's GitHub Actions actually cost, in billable minutes (ADR-041).

  cpc-ci-budget --repo owner/name [--repo ...] [--since 2026-08-01] [--allowance 2000]

Answers the question that arrives as a 90%-of-quota email and cannot be answered from the workflow
file: *where did the minutes go, and what would it cost to keep going*. Groups the window's spend by
repo, workflow and job family, and projects the current pace to the end of the cycle.

**Why this exists as a tool rather than a paragraph of advice.** cpc's own CI spent ~1,720 billable
minutes in its first nine days — 84% of a 2,000-minute monthly allowance — and every line of that
workflow had been reviewed. The cost was not in the gate list. It was in the runner mix (Windows
bills ×2, macOS ×10) multiplied by a trigger nobody had priced, and none of it is visible in the
YAML. A rule of thumb would have been wrong here; a measurement was not.

**The multipliers are the whole story**, so they are stated rather than hidden: ubuntu ×1,
windows ×2, macos ×10 (`MULTIPLIERS`). A macOS job that runs for eleven seconds bills for ten
minutes' worth of allowance once per-job rounding is applied, which is why the report prints wall
time beside billed minutes — a row where those two diverge is a row worth moving.

**Two readings, both printed, because GitHub's own numbers sit between them.** `low` sums
`duration x multiplier`; `high` rounds each job up to the whole minute first, which is what the
docs describe. Measured against a real 1,808-minute statement, `low` was the closer of the two. The
gap between them is the per-job rounding tax and is itself a finding: many short jobs on an
expensive runner is the shape that makes them diverge.

**Not `/actions/runs/{id}/timing`.** That endpoint returned `total_ms: 0` for every run measured on
2026-08-15, including one whose own `run_duration_ms` was 878,000. The job list carries
`started_at` / `completed_at` and is computed from instead — slower (one request per run) and
correct. `--json` prints the per-run rows so a disagreement with the statement can be traced.

**Report, never a gate** (ADR-022, ADR-036): exit is 0 whatever the spend, unless `--max` is passed,
which is the caller opting in to a threshold. A reporter that fails a build by default is a gate
wearing a report's name.

**Public repositories consume no allowance** and are skipped with a line saying so — the first
suspect in the incident that produced this tool was a public repo running a cron, and it was free.

Auth: `GITHUB_TOKEN` / `GH_TOKEN`, else `gh auth token` if the CLI is installed and logged in.
Read-only scope is enough. stdlib only (Python 3.11+): `urllib`, no `requests`, no PyYAML.
"""
from __future__ import annotations
import argparse, calendar, json, math, os, subprocess, sys, urllib.error, urllib.request
from collections import defaultdict
from datetime import date, datetime, timezone
from cpc._console import make_console_safe

API = "https://api.github.com"

# GitHub's published per-minute multipliers against the included allowance. A "billable minute" in
# this report is an ALLOWANCE minute: overage is then charged at one flat rate (~$0.008 at the time
# of writing) because the runner's price is already folded into the multiplier below.
MULTIPLIERS = (("macos", 10), ("windows", 2))   # first match wins; everything else is ubuntu (×1)
UBUNTU = 1

_TIMEOUT = 30


def multiplier(labels: str) -> tuple[int, str]:
    """The billing multiplier for a job, from its runner labels. Unknown labels bill as ubuntu.

    Defaulting an unrecognised label to ×1 UNDER-reports rather than over-reports. That is the
    deliberate direction: this number gets quoted, and a tool that inflates the bill to look useful
    is worse than one that admits it saw a runner it did not recognise.
    """
    low = labels.lower()
    for name, mult in MULTIPLIERS:
        if name in low:
            return mult, name
    return UBUNTU, "ubuntu"


def token() -> str | None:
    """A GitHub token from the environment, else from `gh auth token`. None if neither answers."""
    for var in ("GITHUB_TOKEN", "GH_TOKEN"):
        if os.environ.get(var):
            return os.environ[var]
    try:
        out = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.SubprocessError):
        return None
    return out.stdout.strip() or None


def api(path: str, tok: str) -> dict:
    """One GET against the REST API. Raises `urllib.error.HTTPError` for the caller to name."""
    req = urllib.request.Request(
        f"{API}/{path.lstrip('/')}",
        headers={"Authorization": f"Bearer {tok}", "Accept": "application/vnd.github+json",
                 "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "cpc-ci-budget"})
    with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:      # noqa: S310 - fixed https host
        return json.loads(resp.read().decode("utf-8"))


def parse_ts(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def job_minutes(job: dict) -> tuple[float, float, float, str]:
    """(wall, low, high, runner) for one job, in minutes. A job with no timestamps costs nothing."""
    start, end = job.get("started_at"), job.get("completed_at")
    if not start or not end:
        return 0.0, 0.0, 0.0, "ubuntu"
    wall = max(0.0, (parse_ts(end) - parse_ts(start)).total_seconds() / 60)
    mult, runner = multiplier(",".join(job.get("labels") or []))
    return wall, wall * mult, math.ceil(wall) * mult if wall else 0.0, runner


def collect(repo: str, since: str, tok: str, max_runs: int | None = None) -> list[dict]:
    """Every job of every run in `repo` created on/after `since`, as flat rows.

    One request lists the runs; one more per run lists its jobs. That is the cost of not trusting
    `/timing`, and on a repo with 27 runs it is 28 requests.
    """
    runs = api(f"repos/{repo}/actions/runs?created=>={since}&per_page=100", tok).get(
        "workflow_runs", [])
    if max_runs is not None:
        runs = runs[:max_runs]
    rows = []
    for run in runs:
        jobs = api(f"repos/{repo}/actions/runs/{run['id']}/jobs?per_page=100", tok).get("jobs", [])
        for job in jobs:
            wall, low, high, runner = job_minutes(job)
            rows.append({"repo": repo, "workflow": run.get("name") or "?", "event": run.get("event"),
                         "created": (run.get("created_at") or "")[:10], "job": job.get("name") or "?",
                         "runner": runner, "wall": wall, "low": low, "high": high})
    return rows


def family(job_name: str) -> str:
    """A matrix job's family — `tests (py3.11, ubuntu-latest)` and its siblings collapse to `tests`.

    Grouping by the raw name spreads one decision across twelve rows, and the decision (drop a
    platform, cut a Python version) is taken per family, never per cell.
    """
    return job_name.split("(")[0].strip() or job_name


def _table(title: str, rows: dict[tuple, list[float]], key_width: int) -> list[str]:
    out = [title, f"  {'':{key_width}} {'jobs':>5} {'wall':>8} {'low':>8} {'high':>8}"]
    for key, (wall, low, high, n) in sorted(rows.items(), key=lambda kv: -kv[1][1]):
        label = " / ".join(str(k) for k in key)
        out.append(f"  {label[:key_width]:{key_width}} {int(n):>5} {wall:>8.0f} {low:>8.0f} {high:>8.0f}")
    return out


def report(rows: list[dict], allowance: int | None, since: str, skipped: list[str]) -> list[str]:
    """The text report: totals, per workflow, per job family, and the projection."""
    by_wf: dict[tuple, list[float]] = defaultdict(lambda: [0.0, 0.0, 0.0, 0.0])
    by_fam: dict[tuple, list[float]] = defaultdict(lambda: [0.0, 0.0, 0.0, 0.0])
    by_runner: dict[str, float] = defaultdict(float)
    for r in rows:
        for bucket, key in ((by_wf, (r["repo"], r["workflow"])),
                            (by_fam, (r["repo"], family(r["job"]), r["runner"]))):
            bucket[key][0] += r["wall"]; bucket[key][1] += r["low"]
            bucket[key][2] += r["high"]; bucket[key][3] += 1
        by_runner[r["runner"]] += r["low"]

    low = sum(r["low"] for r in rows)
    high = sum(r["high"] for r in rows)
    runners = " · ".join(f"{k} {v:.0f}" for k, v in
                         sorted(by_runner.items(), key=lambda kv: -kv[1])) or "-"
    out = [f"cpc-ci-budget: {len(rows)} job(s) since {since}",
           f"  BILLED {low:.0f}-{high:.0f} allowance-minutes "
           f"(low = duration x multiplier; high = per-job round-up)",
           f"  by runner: {runners}"]
    if skipped:
        out.append(f"  skipped (public — public repos consume no allowance): {', '.join(skipped)}")
    out += [""] + _table("By workflow:", by_wf, 46) + [""] + _table("By job family:", by_fam, 46)

    if allowance:
        today = datetime.now(timezone.utc).date()
        start = date.fromisoformat(since)
        days = max(1, (today - start).days + 1)
        left_days = calendar.monthrange(today.year, today.month)[1] - today.day
        pace = low / days
        projected = low + pace * left_days
        out += ["",
                f"Allowance: {low:.0f} of {allowance} used over {days} day(s) "
                f"— {low / allowance * 100:.0f}%, {allowance - low:.0f} left",
                f"Pace: {pace:.0f} min/day over the window. {left_days} day(s) to the reset "
                f"→ ~{projected:.0f} for the cycle"
                + (f", {projected - allowance:.0f} OVER" if projected > allowance else ""),
                "The pace is HISTORICAL: it includes whatever you have already changed. Re-run "
                "with --since set to the day of the change to price what you are doing now."]
    out += ["",
            "A row whose `wall` is far under its `low` is paying a multiplier, not doing work: "
            "that is the row to move off macOS/Windows or behind a release trigger (ADR-041).",
            "Report only — this never fails a build unless you pass --max."]
    return out


def main(argv: list[str] | None = None) -> int:
    make_console_safe()
    ap = argparse.ArgumentParser(
        description="Report GitHub Actions spend in billable allowance-minutes (ADR-041). "
                    "Exits 0 unless --max is given.")
    ap.add_argument("--repo", action="append", default=[], metavar="OWNER/NAME",
                    help="repository to measure; repeatable")
    ap.add_argument("--since", default=None, metavar="YYYY-MM-DD",
                    help="window start (default: the 1st of the current UTC month, "
                         "which is how the allowance resets)")
    ap.add_argument("--allowance", type=int, default=None,
                    help="included minutes per cycle (2000 on Free, 3000 on Pro) — enables the "
                         "projection")
    ap.add_argument("--max", type=int, default=None, metavar="MINUTES",
                    help="exit 1 if the window's low estimate exceeds this. Opt-in: without it "
                         "this command is a report and cannot fail a build")
    ap.add_argument("--max-runs", type=int, default=None,
                    help="cap the runs read per repo (one API request each)")
    ap.add_argument("--format", choices=["text", "json"], default="text")
    args = ap.parse_args(argv)

    if not args.repo:
        print("cpc-ci-budget: pass at least one --repo owner/name", file=sys.stderr)
        return 2
    tok = token()
    if not tok:
        print("cpc-ci-budget: no token — set GITHUB_TOKEN/GH_TOKEN, or run `gh auth login`.",
              file=sys.stderr)
        return 2

    since = args.since or date.today().replace(day=1).isoformat()
    rows: list[dict] = []
    skipped: list[str] = []
    for repo in args.repo:
        try:
            if not api(f"repos/{repo}", tok).get("private", True):
                skipped.append(repo)          # free minutes; counting them would misattribute spend
                continue
            rows += collect(repo, since, tok, args.max_runs)
        except urllib.error.HTTPError as exc:
            print(f"cpc-ci-budget: {repo}: HTTP {exc.code} {exc.reason}", file=sys.stderr)
            return 2
        except urllib.error.URLError as exc:
            print(f"cpc-ci-budget: {repo}: {exc.reason}", file=sys.stderr)
            return 2

    if args.format == "json":
        print(json.dumps({"since": since, "skipped": skipped, "rows": rows}, indent=2))
    else:
        print("\n".join(report(rows, args.allowance, since, skipped)))

    low = sum(r["low"] for r in rows)
    if args.max is not None and low > args.max:
        print(f"cpc-ci-budget: {low:.0f} billed minutes over the --max of {args.max}",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
