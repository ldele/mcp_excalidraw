#!/usr/bin/env python3
"""Deterministic documentation-convention gate.

Checks (see claude-project-conventions/CONVENTIONS.md):
  1. status header present on docs/**.md and .claude/**.md — embedded trees are skipped
     (`.venv`/`node_modules`/`.git` dirs, and any nested git checkout: a dir carrying its own
     `.git`, e.g. Claude Code's background-task worktrees under `.claude/worktrees/`)
  1b. tag vocabulary (opt-in, ADR-032): a header's optional `tags:` values must come from
     `[tags] vocabulary`. Silent when no vocabulary is configured; never requires a doc to
     carry tags, only governs the ones it does carry
  2. entry-context budget: root CLAUDE.md + .claude/CONTEXT.md <= entry_max_lines
  3. module CLAUDE.md budget: each <module>/CLAUDE.md <= module_claude_max_lines
  4. broken routes: a path in `backticks` inside any CLAUDE.md / .claude/*.md / AGENTS.md, or a
     root-level doc carrying a `class:` header (KI-5), must exist (a `docs/X` reference resolves to
     `docs/archive/X` too, so archiving never breaks history). `[routes] exempt` drops a source
     whose paths are historical (CHANGELOG.md by default); `[routes] allow_missing` drops a TARGET
     that lives in a consumer or sibling repo
  4d. superseded citation: a live doc citing a superseded/archived ADR on a line that does not
     say so — a dead decision presented as current. On by default ([routes] check_superseded_refs);
     docs/archive/** and the ADR itself are exempt, as is any line containing "supersed"
  5. stale disposable: PLAN_*/REVIEW_* still 'active' older than disposable_days
  6. archive hygiene: docs/archive/** must be status superseded|archived
  7. unarchived disposable: a 'disposable' doc marked superseded/archived must live under
     docs/archive/ — scans docs/**, .claude/** and opted-in root docs (KI-5)
  9. stub-stays-stub (opt-in, ADR-014): with [entry] enforce_stub on, root CLAUDE.md must be a
     bare `@AGENTS.md` import — fails if it holds anything else; silent off or when CLAUDE.md absent
  10. prior-art (opt-in, ADR-016): [plan] require_prior_art on -> docs/PLAN.md must carry a
     non-empty `## Prior art` section; silent when off or when PLAN.md is absent
  11. baton (ADR-018): .claude/SESSION.md — 11a dated `## ` entries must be non-increasing
     top-to-bottom (ERROR, always on — the file's own "newest on top" invariant); 11b entry count
     over [budgets] session_max_entries -> rotate (WARN; cap 0 = off)
  12. living-doc bump (ADR-018): a class:living doc under docs/, .claude/, or the repo root
     (KI-5) whose LAST GIT COMMIT is newer than its `updated:` header was edited without bumping
     the date (WARN); default on ([staleness] living_bump), skips exempt paths + degrades to a
     silent skip outside git
  13. devlog (ADR-023): docs/DEVLOG.md — 13a dated `## ` entries must be non-increasing
     top-to-bottom (ERROR, always on — the file's own "newest first" invariant); 13b entry count
     over [budgets] devlog_max_entries -> rotate to docs/archive/DEVLOG-archive-NNN.md
     (WARN; cap 0 = off). Same mechanism as the rule-11 baton.
  14. resolved known issue still live (ADR-023): a `## ` heading in .claude/KNOWN_ISSUES.md
     marked RESOLVED with a date older than [staleness] resolved_ki_days -> summarize it into
     the file's Resolved index and move the full entry to docs/archive/KNOWN_ISSUES-archive-NNN.md
     (WARN; 0 = off). An undated RESOLVED heading warns too — it can never age out.
  15. spec ledger (opt-in, ADR-027): [sprint] require_spec_ledger on -> an active sprint contract
     carrying the `- **started:**` stamp (ADR-019) must name >=1 docs/specs/SPEC-*.md, and every
     named SPEC must hold a `## Open questions` ledger with >=1 row and no row still `open`
     (ERROR). The scoped grill (grill-me, keypoint sprint-start) fills the ledger; this gate
     only checks the interrogation happened — resolution quality is sprint-review's judgment.
     15c (same toggle, SPEC-keypoint-stamp): the started contract must also carry the
     `- **keypoint:** sprint-start <ts>` stamp a green `cpc-keypoint sprint-start` floor writes
     (ERROR) — so a skipped activation ritual is visible. --pre-stamp skips 15c only: the
     keypoint's own floor runs before the stamp it is about to write can exist.

The canonical entry file is AGENTS.md (ADR-014) with CLAUDE.md a one-line `@AGENTS.md` stub; the
entry-budget, route, and glossary checks read whichever the project carries (AGENTS.md if present).

stdlib only (Python 3.11+). Exit 1 on errors; warnings fail too under --strict.
"""
from __future__ import annotations
import argparse, datetime as dt, subprocess
from pathlib import Path

from cpc import docs_rules_history, docs_rules_refs, docs_rules_sprint
from cpc._config import load_config
from cpc.docs_scan import (CLASS_RE, DATE_IN_NAME_RE, HEADER_RE, UPDATED_RE, class_files,
                           entry_file, head_block, header_of, in_embedded_tree, is_exempt, lines,
                           md_files, tags_of, text_of)
from cpc.findings import Finding, RuleRegistry, from_tagged, to_json
from cpc.tokens import estimate_tokens
from cpc._console import make_console_safe


DEFAULTS = {
    # module_claude_max_lines: 80 as of ADR-024 (was 40) — the fleet's module CLAUDE.md files kept
    # hitting the cap for legitimate content (BlackBox); raising per-project was the norm, so the
    # default moved to where projects actually landed. Tune per project, never silently.
    "budgets": {"entry_max_lines": 600, "module_claude_max_lines": 80, "entry_max_tokens": 0,
                # session_max_entries (rule 11b, ADR-018) / devlog_max_entries (rule 13b, ADR-023):
                # entry-count caps. 0 = off, the token-cap precedent — no silent behaviour change
                # for existing consumers; cpc and the laid template set 10 / 20.
                "session_max_entries": 0, "devlog_max_entries": 0,
                # devlog_entry_max_tokens (rule 13c): the cap on ONE entry, not the file. Measured
                # 2026-08-07: the entry-count cap is enforced in entries while the cost is in
                # tokens, so 20 entries at cpc's 940-token median silently permit ~18.8k — against a
                # 3000-token cap on the entry context two files away. Capping the entry attacks the
                # cause: a DEVLOG entry that needs 2000 tokens is an ADR with the wrong filename,
                # and should say what changed and point at the decision. 0 = off; cpc sets 500.
                "devlog_entry_max_tokens": 0},
    # living_bump (rule 12, ADR-018): "warn" (default on, fails under --strict) or "off". It enforces
    # §2's declared "edit in place, bump the date" rule for class:living docs, so it ships on like the
    # universal-invariant checks (rule 1/4b); a repo that manages living dates by hand opts out.
    # resolved_ki_days (rule 14, ADR-023): age a RESOLVED known issue may sit in the live file before
    # the gate asks for index+archive. 0 = off (the cap precedent); cpc and the laid template set 30.
    "staleness": {"disposable_days": 90, "living_bump": "warn", "resolved_ki_days": 0},
    "headers": {"exempt": ["docs/specs/**", "**/*.json"]},
    # Controlled tag vocabulary (rule 1b, ADR-032): {tag: one-line meaning}. Empty = the rule is
    # silent, the same opt-in shape as glossary/dod-lint — a project with no vocabulary has not
    # opted into a topical axis, and inventing one for it would be noise. `tags:` in a header is
    # always optional; the rule checks the values used, never that a doc carries any.
    # `exempt` is rule 1b's OWN exclusion set and defaults to empty on purpose. It used to borrow
    # `[headers] exempt`, which exists to spare a path the status-header *requirement* — so
    # `docs/specs/**` being header-exempt silently made every SPEC's tags ungoverned too. Opting a
    # path out of needing a header is not opting it out of vocabulary control.
    "tags": {"vocabulary": {}, "exempt": []},
    # check_md_links: markdown [text](target) link existence (rule 4b) — default on, same existence
    # check as the backtick route gate. check_adr_refs: bare `ADR-NNN` citation existence (rule 4c)
    # — default OFF: a repo that cites another repo's ADRs (cpc cites claude-skills') would false-
    # positive, so it is opt-in. See docs/specs/SPEC-reference-validator.md.
    # check_superseded_refs (rule 4d): default ON, unlike 4c. The cross-repo false positive that
    # forces 4c off cannot occur here — 4d fires only on an ADR that exists LOCALLY and whose own
    # header says superseded/archived, so a foreign ADR-NNN is invisible to it.
    # exempt (KI-5): root-level docs whose recorded routes and citations are HISTORICAL, so the
    # reference rules (4/4b/4d) skip them. `CHANGELOG.md` is the default and the reason the key
    # exists: a release note names the paths that were correct when it was written, and "repoint
    # the line" there means rewriting history to satisfy a gate — the same argument that keeps
    # docs/archive/** out of 4d. It does NOT exempt rule 12: a CHANGELOG committed without bumping
    # `updated:` is the drift KI-5 was opened on.
    # allow_missing: route TARGETS that legitimately do not exist here — a path in a *consumer*
    # repo, or a sibling repo's tree. The finer-grained form of the reasoning that keeps
    # check_adr_refs off by default (cpc cites claude-skills' ADRs). Default empty; a project that
    # documents other repos' layouts, as a standard does, is the case that needs it.
    # check_docs_links (rule 4b, second tier, KI-10): "warn" (default) | "error" | "off". Rule 4b's
    # first tier — entry file + .claude/ + opted-in root docs — stays ERROR. This one covers
    # docs/**, which had never been link-checked at all, and defaults to WARN because that surface
    # carries years of history in every consumer: a widened rule that hard-fails a re-vendor is one
    # that gets switched off. Under --strict a warn still fails, which is how cpc holds itself to 0.
    "routes": {"extensions": [".md"], "check_md_links": True, "check_adr_refs": False,
               "check_superseded_refs": True, "exempt": ["CHANGELOG.md"], "allow_missing": [],
               "check_docs_links": "warn"},
    # enforce_stub: opt-in stub-stays-stub rule (ADR-014, rule 9) — default OFF, like every
    # not-universal gate (glossary, dod-lint). A project that stays CLAUDE.md-canonical leaves it off.
    "entry": {"enforce_stub": False},
    # require_enforced_by (rule 16): an accepted ADR must name what FAILS if its decision is
    # violated — a test, a gate, or the words "judgment — not enforceable". ADR-007's honesty rule
    # ("a prose rule is never dressed up as enforced") turned on ADRs themselves. Checks PRESENCE,
    # never truth: the same presence/observance split ADR-007 draws, and the reason this is a WARN.
    # Default OFF like every not-universal gate — turning it on retroactively demands a new section
    # in every ADR a consumer already has, which is noise rather than a finding. cpc dogfoods it ON.
    "adr": {"require_enforced_by": False},
    "plan": {"require_prior_art": False},
    # require_spec_ledger (rule 15, ADR-027): opt-in in code like every not-universal gate, but
    # vacuous until a contract carries the started: stamp — so the laid template ships it ON.
    "sprint": {"require_spec_ledger": False},
}

# Every finding this gate can emit, by its `[tag]` id (ADR-029). Explicit, not scraped: a grep for
# bracketed lowercase tokens over this file also returns `[0]`, `[1]`, `[str]`, `[text]`. Adding a
# finding means adding its id here — `tests/test_rule_inventory.py` fails when a registered id is
# fired by no corpus tree (or by every tree), so the registry cannot rot into a stale catalogue.
def rule12_skips(rel: str, cfg: dict, exempt: list[str]) -> bool:
    """True when rule 12 does not govern `rel` — a header-exempt path, or a `[generate]` artifact.

    Shared with `keypoint.stale_living_edits`, which PREDICTS this rule before the commit (KI-6).
    They asked the same question separately and answered it differently: the predictor warned that
    rule 12 "will fire" on `README.md`, a registered artifact rule 12 exempts, so a correct tree
    failed its own session-close. One predicate, for the reason KI-7 gives — two spellings of one
    question drift the day either side gains a case.
    """
    generated = {a.get("path") for a in cfg.get("generate", {}).get("artifact", []) if a.get("path")}
    return is_exempt(rel, exempt) or rel in generated


RULES: RuleRegistry = {
    "header":      "rule 1 — a docs/**.md or .claude/**.md file carries no `status:` header",
    "tag":         "rule 1b — a header `tags:` value is outside the controlled vocabulary",
    "budget":      "rules 2/3 — entry-context or module CLAUDE.md over its line/token budget",
    "entry":       "rule 9 — root CLAUDE.md holds more than the bare `@AGENTS.md` import",
    "route":       "rule 4 — a `backtick/path.md` route in an entry/.claude doc does not resolve",
    "link":        "rule 4b — a markdown [text](target) link resolves neither way (ERROR in the "
                   "entry/.claude surface; WARN under docs/** per [routes] check_docs_links)",
    "citation":    "rule 4c — a bare `ADR-NNN` citation has no local docs/decisions file",
    "superseded":  "rule 4d — a live doc cites a superseded/archived ADR without marking it so",
    "stale":       "rule 5 — an active PLAN_/REVIEW_ disposable is past disposable_days",
    "archive":     "rule 6 — a file under docs/archive/ is still status=active",
    "lifecycle":   "rule 7 — a superseded/archived disposable still sits outside docs/archive/",
    "glossary":    "rule 8 — a filled GLOSSARY.md is not referenced from the entry file",
    "plan":        "rule 10 — docs/PLAN.md lacks a non-empty `## Prior art` section",
    "spec":        "rules 15/15c — spec-ledger or keypoint-stamp floor unmet on a started contract",
    "baton":       "rule 11 — .claude/SESSION.md entry order or rotation cap",
    "devlog":      "rule 13 — docs/DEVLOG.md entry order or rotation cap",
    "known-issue": "rule 14 — a RESOLVED known issue is past its grace window",
    "enforced":    "rule 16 — an accepted ADR does not name what would fail if it were violated",
    "living":      "rule 12 — a class:living doc was committed without bumping `updated:`",
    "archive-index": "rule 17 — an archive index does not account for every archived entry",
}


def git_last_commit_date(root: Path, rel: str) -> str | None:
    """Author date (YYYY-MM-DD) of the file's last commit, or None if git can't answer — no git on
    PATH, not a repo, or the file has no commit yet. Rule 12 uses this; any failure => silent skip,
    so the stdlib-only / offline invariant holds (git is shelled, never imported). `sprint_check`
    set the git-subprocess precedent (ADR-018). ISO dates compare correctly as strings."""
    try:
        r = subprocess.run(["git", "-C", str(root), "log", "-1", "--format=%as", "--", rel],
                           capture_output=True, text=True, check=False)
    except (OSError, ValueError):
        return None
    if r.returncode != 0:
        return None
    return r.stdout.strip() or None

def main() -> int:
    make_console_safe()   # KI-9: never crash echoing text cpc did not write
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--config", default=None, type=Path)
    ap.add_argument("--strict", action="store_true", help="warnings also fail the run")
    ap.add_argument("--pre-stamp", action="store_true",
                    help="skip rule 15c only (used by cpc-keypoint sprint-start, whose floor "
                         "runs before the stamp it writes on green can exist)")
    ap.add_argument("--format", choices=["text", "json"], default="text",
                    help="text (default, the stable human/CI form) or json. JSON is UNSTABLE and "
                         "cpc-internal (ADR-029): it feeds cpc's own corpus-snapshot harness and "
                         "carries no SemVer promise — do not build on it")
    args = ap.parse_args()
    root: Path = args.root.resolve()
    cfg = load_config(root, args.config, DEFAULTS)
    errors: list[str] = []
    warns: list[str] = []

    docs = root / "docs"
    claude = root / ".claude"

    # 1. status headers. The two scan surfaces are built once, in cpc.docs_scan: `md_files` is
    #    docs/** + .claude/** (rule 1), `class_files` adds the root docs that opted in (KI-5), which
    #    is what rules 1b, 7 and 12 read.
    exempt = cfg["headers"]["exempt"]
    scanned = md_files(root)
    classed = class_files(root)
    for f in scanned:
        rel = f.relative_to(root).as_posix()
        if is_exempt(rel, exempt):
            continue
        status, _ = header_of(f)
        if status is None:
            errors.append(f"[header] missing `status:` header: {rel}")

    # 1b. tag vocabulary (ADR-032). `tags:` is an OPTIONAL header field; this checks the values a
    #     doc does carry against `[tags] vocabulary`. Silent when no vocabulary is configured — a
    #     project that has not declared a topical axis has not opted in, and guessing one would be
    #     noise (same shape as glossary/dod-lint). Scoped to rule 1's scan surface, but with its
    #     OWN `[tags] exempt` list (default empty) rather than `[headers] exempt`: the header list
    #     spares a path the *requirement to carry a header*, and reusing it here silently left
    #     every `docs/specs/**` doc's tags ungoverned — 14 of cpc's 53 tagged docs.
    #     WARN, not ERROR: a tag outside the vocabulary is an uncontrolled synonym — the failure
    #     GLOSSARY exists to prevent — not a broken reference.
    vocab = {t.lower() for t in cfg["tags"].get("vocabulary", {})}
    tag_exempt = cfg["tags"].get("exempt", [])
    if vocab:
        for f in classed:
            rel = f.relative_to(root).as_posix()
            if is_exempt(rel, tag_exempt):
                continue
            for t in tags_of(f):
                if t not in vocab:
                    warns.append(
                        f"[tag] {rel} -> unknown tag {t!r}; "
                        f"use one of [tags] vocabulary or add it there deliberately"
                    )

    # 2. entry budget (lines, plus an opt-in token ceiling — cpc.tokens, chars/4 heuristic).
    #    The entry file is AGENTS.md (ADR-014) when present, else CLAUDE.md (CLAUDE-canonical repos).
    ef = entry_file(root)
    ename = ef.name
    entry = lines(ef) + lines(claude / "CONTEXT.md")
    cap = cfg["budgets"]["entry_max_lines"]
    if entry > cap:
        errors.append(f"[budget] entry context {entry} lines > {cap} "
                      f"(root {ename} + .claude/CONTEXT.md)")
    tok_cap = int(cfg["budgets"].get("entry_max_tokens", 0) or 0)   # 0 = disabled (lines-only)
    if tok_cap > 0:
        entry_tokens = estimate_tokens(text_of(ef) + text_of(claude / "CONTEXT.md"))
        if entry_tokens > tok_cap:
            errors.append(f"[budget] entry context {entry} lines / ~{entry_tokens} tokens "
                          f"> token cap {tok_cap} (root {ename} + .claude/CONTEXT.md)")

    # 9. stub-stays-stub (ADR-014, opt-in [entry] enforce_stub). When AGENTS.md is canonical, root
    #    CLAUDE.md must be a bare `@AGENTS.md` import so the two files cannot drift. Fails if CLAUDE.md
    #    carries anything beyond the import; silent when the toggle is off or CLAUDE.md is absent (a
    #    project that stayed CLAUDE.md-canonical simply leaves the toggle off). Converts the discipline
    #    "don't re-add content to the stub" into a gate (ADR-007 honesty rule).
    if cfg["entry"].get("enforce_stub", False):
        claude_md = root / "CLAUDE.md"
        if claude_md.exists():
            body = [ln.strip() for ln in text_of(claude_md).splitlines() if ln.strip()]
            if body != ["@AGENTS.md"]:
                errors.append("[entry] CLAUDE.md must be a bare `@AGENTS.md` import stub "
                              "([entry] enforce_stub, ADR-014) — entry content belongs in AGENTS.md")

    # 3. module CLAUDE.md budget
    mcap = cfg["budgets"]["module_claude_max_lines"]
    for f in root.rglob("CLAUDE.md"):
        rel = f.relative_to(root).as_posix()
        if rel == "CLAUDE.md" or "/.claude/" in f"/{rel}":
            continue
        if in_embedded_tree(root, f):
            continue
        n = lines(f)
        if n > mcap:
            warns.append(f"[budget] module file {rel} is {n} lines > {mcap}")

    # 4/4b/4c/4d. references — one scan surface, four questions: cpc.docs_rules_refs.
    ref_errors, ref_warns = docs_rules_refs.check(root, cfg)
    errors += ref_errors
    warns += ref_warns

    # 5. stale disposable
    days = cfg["staleness"]["disposable_days"]
    today = dt.date.today()
    if docs.exists():
        for f in docs.rglob("*.md"):
            name = f.name
            if not (name.startswith("PLAN_") or name.startswith("REVIEW_")):
                continue
            rel = f.relative_to(root).as_posix()
            if "/archive/" in f"/{rel}":
                continue
            status, updated = header_of(f)
            if status != "active":
                continue
            datestr = updated
            if not datestr:
                m = DATE_IN_NAME_RE.search(name)
                datestr = m.group(1) if m else None
            if not datestr:
                warns.append(f"[stale] {rel} is active but has no date to age it")
                continue
            try:
                age = (today - dt.date.fromisoformat(datestr)).days
            except ValueError:
                continue
            if age > days:
                warns.append(f"[stale] {rel} active and {age}d old (> {days}); archive it?")

    # 6. archive hygiene
    arch = docs / "archive"
    if arch.exists():
        for f in arch.rglob("*.md"):
            rel = f.relative_to(root).as_posix()
            status, _ = header_of(f)
            if status == "active":
                errors.append(f"[archive] {rel} is in archive/ but status=active")

    # 7. unarchived disposable: a superseded/archived disposable must be relocated to docs/archive/.
    #    Completes the lifecycle — check 5 flags the forgotten *supersede*; this flags the forgotten
    #    *move*. Scoped to class:disposable so append-only ADRs (superseded in place) are never flagged.
    for f in classed:
        rel = f.relative_to(root).as_posix()
        if "/archive/" in f"/{rel}" or is_exempt(rel, exempt):
            continue
        head = head_block(f.read_text(encoding="utf-8", errors="ignore"))
        cm = CLASS_RE.search(head)
        sm = HEADER_RE.search(head)
        if cm and sm and cm.group(1).lower() == "disposable" and sm.group(1).lower() in {"superseded", "archived"}:
            warns.append(f"[lifecycle] disposable {rel} is {sm.group(1).lower()} but not under "
                         f"docs/archive/ — move it (git mv {rel} docs/archive/)")

    # 8. glossary advisory (ADR-010): if a GLOSSARY.md exists, it must be non-stub and referenced
    #    from CLAUDE.md. Advisory only (warns) — the forbidden-synonym *scan* is cpc-glossary's job,
    #    not this layout gate. (Coupling: imports the glossary parser for the non-stub check.)
    glossary = root / "GLOSSARY.md"
    if not glossary.exists():
        glossary = claude / "GLOSSARY.md"
    if glossary.exists():
        try:
            from cpc.glossary_check import parse_glossary
            filled = parse_glossary(glossary.read_text(encoding="utf-8"))
        except Exception:
            filled = []
        # An all-stub GLOSSARY.md is the freshly-laid template (cpc-init lays one in `standard`) —
        # the project has not started using it yet, so stay silent. The advisory only fires once at
        # least one real term exists but the file is not wired into CLAUDE.md.
        if filled:
            grel = glossary.relative_to(root).as_posix()
            ef = entry_file(root)            # AGENTS.md (ADR-014) or the CLAUDE-canonical fallback
            if ef.exists():
                if "GLOSSARY.md" not in text_of(ef):
                    warns.append(f"[glossary] {grel} has filled entries but is not referenced from "
                                 f"{ef.name} — link it so the agent reads it before naming things")

    # 10/15/15c. the planning floor — prior art and the spec ledger: cpc.docs_rules_sprint.
    plan_errors, plan_warns = docs_rules_sprint.check(root, cfg, args.pre_stamp)
    errors += plan_errors
    warns += plan_warns

    # 11/13/14. bounded history — one shape, three files: cpc.docs_rules_history.
    hist_errors, hist_warns = docs_rules_history.check(root, cfg, today)
    errors += hist_errors
    warns += hist_warns

    # 12. living-doc bump (ADR-018 D3). A class:living doc under docs/ or .claude/ whose last git
    #     commit is NEWER than its `updated:` header was edited without bumping the date \u2014 the drift
    #     \u00a72's "edit in place, bump the date" rule declares but never machine-checked. WARN (fails
    #     under --strict, like every warn). Skips exempt paths (docs/specs/** opt out of header
    #     governance, so they opt out of this header-derived check too), non-git trees, and
    #     not-yet-committed files. Catches edited-without-bump deterministically; content staleness
    #     stays docs-audit's judgment call (ADR-007 honest split).
    #     Registered [generate] artifacts are skipped: a generated file is not edited in place, so a
    #     bump rule is the wrong instrument for it, and `cpc-generate --check` already proves its
    #     freshness by comparing content — strictly stronger than comparing a date. Without the skip
    #     the two disagree and nothing can settle it: `--write` regenerates identical content and so
    #     changes nothing, while the file's own header forbids hand-editing the date (finding 7).
    if cfg["staleness"].get("living_bump", "warn") != "off":
        for f in classed:
            rel = f.relative_to(root).as_posix()
            if rule12_skips(rel, cfg, exempt):
                continue
            head = head_block(f.read_text(encoding="utf-8", errors="ignore"))
            cm = CLASS_RE.search(head)
            um = UPDATED_RE.search(head)
            if not (cm and um) or cm.group(1).lower() != "living":
                continue
            committed = git_last_commit_date(root, rel)
            if committed and committed > um.group(1):
                warns.append(f"[living] {rel} last committed {committed} but `updated:` says "
                             f"{um.group(1)} \u2014 edited without bumping the date (rule 12)")

    # report. Text is the stable form and stays byte-identical. JSON prints findings ONLY — no
    # summary line and no `root=` echo, so the output stays parseable and carries no machine-specific
    # absolute path (the corpus goldens depend on both). Exit code is identical in either mode.
    fail = bool(errors) or (args.strict and bool(warns))
    if args.format == "json":
        fds = ([from_tagged("error", e) for e in errors]
               + [from_tagged("warn", w) for w in warns])
        fds.sort(key=Finding.total_key)   # rglob order is not guaranteed stable across platforms
        print(to_json(fds))
    else:
        for w in warns:
            print(f"WARN  {w}")
        for e in errors:
            print(f"ERROR {e}")
        print(f"\ndocs_check: {len(errors)} error(s), {len(warns)} warning(s) "
              f"-> {'FAIL' if fail else 'OK'}  (root={root})")
    return 1 if fail else 0

if __name__ == "__main__":
    raise SystemExit(main())
