#!/usr/bin/env python3
"""Generate `docs/SETTINGS.md`: every tunable knob and every keypoint ritual, derived from code.

  cpc-settings --write | --check [--root .] [--out docs/SETTINGS.md]

Two tables nobody could see without reading source. **What can I turn on?** — the answer lived in
each gate module's `DEFAULTS` dict and again in `templates/conventions.toml`'s comments, so a reader
had to open eight files and trust that two hand-maintained copies agreed. **Which skill fires at
which ritual?** — that lived only in `keypoint.KEYPOINTS`.

Derived, never hand-written, because a third hand-maintained copy of 25 defaults is the duplication
§5 forbids and it drifts on the first change. Register it under `[generate]` so `--check` fails when
it does drift, the same contract `docs/INDEX.md` runs under (ADR-013/ADR-031).

`--check` compares the whole file including the header, which is possible only because the output is
a pure function of the source: the `updated:` date is derived from the newest mtime-independent
input we have (the code's own committed content is not readable here, so the date is carried over
from the existing file when the body is unchanged). See `_stamp`.

stdlib only (Python 3.11+). Exit 1 when `--check` finds drift; 0 otherwise.
"""
from __future__ import annotations
import argparse, datetime as dt, importlib, pkgutil, re
from pathlib import Path

import cpc
from cpc.docs_scan import UPDATED_RE

HEADER = "<!-- status: active · updated: {date} · class: living -->"

# Why a knob exists and when a project turns it on. Keyed by "[section] key". The DEFAULTS dicts
# carry the value; they cannot carry the judgment, and a table of numbers with no "when" is a
# reference nobody can act on. A key missing here renders with an empty cell rather than a guess.
GUIDANCE: dict[str, str] = {
    "[budgets] entry_max_lines": "Raise when the entry file legitimately grows; never to turn a red gate green.",
    "[budgets] entry_max_tokens": "0 = off. Set only after measuring your own entry context — cpc's is ~1.5k.",
    "[budgets] module_claude_max_lines": "Only bites with per-module CLAUDE.md files (§9: 3+ real boundaries).",
    "[budgets] session_max_entries": "0 = off. Turn on once the baton is long enough to stop being read.",
    "[budgets] devlog_max_entries": "0 = off. Same reasoning as the baton cap.",
    "[budgets] devlog_entry_max_tokens": "Rule 13c — the cap on ONE entry, not the file. 13b caps entries while the cost is in tokens: 20 entries at cpc's 940-token median permit ~18.8k. Past this, the reasoning belongs in an ADR and the entry should point at it. 0 = off; the laid template sets 500. cpc runs 0 because DEVLOG is append-only and its existing entries cannot be rewritten to comply.",
    "[adr] require_enforced_by": "Rule 16 — an accepted ADR must name what FAILS if it is violated, or say \"judgment — not enforceable\". Presence, never truth (ADR-007's split). Off by default: switching it on retroactively demands a new section in every ADR a consumer already wrote.",
    "[vault_map] path": "Which file carries the generated mermaid schema. The tool only touches the block between its two markers, and does nothing at all to a file that has none — placing the markers IS the opt-in.",
    "[digest] path": "Where cpc-digest writes. Change only to relocate the artifact; it is registered under [generate], so the path must match there too.",
    "[digest] devlog_entries": "How many DEVLOG headings the digest carries. Raise it if the digest stops covering what a session needs; lower it if the digest itself is getting expensive.",
    "[budgets] uses_max_files": "Sprint read-set ceiling. Calibrate from your own sprints, not from cpc's.",
    "[budgets] uses_max_lines": "As above; the two caps catch different kinds of oversized read-set.",
    "[budgets] uses_max_tokens": "0 = off. The honest ceiling once files vary wildly in density.",
    "[entry] enforce_stub": "On for an AGENTS-canonical repo; off if you stayed CLAUDE.md-canonical.",
    "[generate] artifact": "One entry per derived artifact. `path` also exempts it from rule 12.",
    "[headers] exempt": "Paths that need no status header. Widen reluctantly — it un-governs lifecycle too.",
    "[plan] require_prior_art": "On once the project is old enough that reinvention is a real risk.",
    "[routes] extensions": "Which backtick tokens count as routes. `.md` alone suits most projects.",
    "[routes] check_md_links": "Leave on. Off only if your docs link heavily outside the repo.",
    "[routes] check_docs_links": "`warn` (default) | `error` | `off` — rule 4b's second tier, over `docs/**`. That surface had never been link-checked at all (KI-10); one consumer audited its own and found 76 broken. WARN because years of history live there and a widened rule that hard-fails a re-vendor gets switched off. `--strict` still fails on it, which is how a repo holds itself to zero.",
    "[routes] check_adr_refs": "On for a self-contained project; off if you cite another repo's ADRs.",
    "[routes] check_superseded_refs": "Leave on. It is the rule that catches a dead decision cited as live.",
    "[routes] exempt": "Sources whose recorded paths are historical. Does NOT exempt rule 12.",
    "[routes] allow_missing": "Targets that live in a consumer or sibling repo, not here.",
    "[sprint] require_spec_ledger": "On once you run sprint contracts; vacuous until one is started.",
    "[staleness] disposable_days": "How long a PLAN_/REVIEW_ may sit active before the gate asks.",
    "[staleness] living_bump": "Leave on. `off` only if you manage living dates by hand.",
    "[staleness] resolved_ki_days": "0 = off. Set once KNOWN_ISSUES is long enough to need archiving.",
    "[tags] vocabulary": "Empty = rule 1b silent. Add tags deliberately; keep the list short.",
    "[tags] exempt": "Rule 1b's own list — deliberately not `[headers] exempt`.",
    "[uses] superset_affects": "`warn` or `error`: must a sprint read everything it changes?",
    "[uses] superset_affects_exempt": "Globs tier 3 skips — the bookkeeping registers every sprint appends to without reading (DEVLOG, the baton, CHANGELOG, the archives). Empty in code; `templates/conventions.toml` ships those four filled. Keep it narrow: `[\"**\"]` disables tier 3 and still prints 0 warnings.",
}


def collect_settings() -> list[tuple[str, str, object, str]]:
    """(section, key, code default, owning module) for every `DEFAULTS` dict in the package."""
    rows: dict[tuple[str, str], tuple[object, str]] = {}
    for m in sorted(pkgutil.iter_modules(cpc.__path__), key=lambda x: x.name):
        try:
            mod = importlib.import_module(f"cpc.{m.name}")
        except Exception:                     # a module that will not import owns no settings
            continue
        d = getattr(mod, "DEFAULTS", None)
        if not isinstance(d, dict):
            continue
        for section, vals in d.items():
            if not isinstance(vals, dict):
                continue
            for key, val in vals.items():
                rows.setdefault((section, key), (val, m.name))
    return [(s, k, v, owner) for (s, k), (v, owner) in sorted(rows.items())]


def configured_values(root: Path) -> dict[str, str]:
    """What THIS repo actually sets, parsed from `scripts/conventions.toml` as text.

    `scripts/conventions.toml` and not `templates/conventions.toml`: the template exists only in cpc
    itself, so reading it rendered every cell as `—` in a consumer repo — the table told a project
    with a fully configured gate that it configured nothing. Measured on a freshly `cpc-init`ed
    tree: 37 of 37 cells empty. `scripts/conventions.toml` is the one config file every cpc project
    has (§5, "config is one file"), so this column answers the same question everywhere.

    Text, not `tomllib`: this shows what a maintainer would see on opening the file they edit, and a
    commented-out example is deliberately NOT a value.
    """
    p = root / "scripts" / "conventions.toml"
    if not p.is_file():
        return {}
    out: dict[str, str] = {}
    section = ""
    pending: tuple[str, list[str]] | None = None     # an array spanning several lines
    for raw in p.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if pending is not None:                      # inside a multi-line array
            name, parts = pending
            if line.startswith("]"):
                out[name] = f"[{len(parts)} entries]" if parts else "[]"
                pending = None
            elif line and not line.startswith("#"):
                parts.append(line)
            continue
        if line.startswith("[") and not line.startswith("[["):
            # `[tags.vocabulary]` belongs to `[tags]`; the sub-table's own keys are values, not
            # settings, and simply never match a known setting name.
            section = line.strip("[]").split(".")[0]
            continue
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        name = f"[{section}] {key.strip()}"
        val = val.split("#")[0].strip()
        if val == "[":                               # `key = [` opens a multi-line array
            pending = (name, [])
            continue
        out[name] = val
    return out


def render(root: Path) -> str:
    from cpc.keypoint import KEYPOINTS

    tmpl = configured_values(root)
    out: list[str] = [
        "# SETTINGS — every knob, and every ritual",
        "",
        "Generated by `cpc-settings --write` — do not edit by hand. It is derived from the gate",
        "modules' own `DEFAULTS` dicts and from `cpc.keypoint.KEYPOINTS`, so it cannot disagree with",
        "the code; `cpc-settings --check` fails when it has drifted.",
        "",
        "**The two questions this answers:** what can I turn on for my project, and which skill runs",
        "at which moment. Both were previously answerable only by reading source.",
        "",
        "## Settings",
        "",
        "Every non-universal rule ships **off in code and on in the laid template**, so adopting cpc",
        "costs a small project nothing and a long-lived one gets the bounds as it earns them. The two",
        "default columns are that split, and where they differ the difference is deliberate.",
        "",
        "Set these in `scripts/conventions.toml`. Raising a budget is legitimate when the content is",
        "real; raising one *silently* to turn a red gate green is drift, not tuning (§7).",
        "",
        "| Setting | Default in code | Set in this repo | Owner | When to change it |",
        "|---|---|---|---|---|",
    ]
    for section, key, val, owner in collect_settings():
        name = f"[{section}] {key}"
        code = "—" if val in ({}, [], None) else f"`{val!r}`"
        laid = f"`{tmpl[name]}`" if name in tmpl else "—"
        out.append(f"| `{name}` | {code} | {laid} | `{owner}` | {GUIDANCE.get(name, '')} |")

    out += [
        "",
        "A `—` in *Set in this repo* means `scripts/conventions.toml` does not mention the key, so",
        "the code default applies. Read from that file as text, so a commented-out example counts as",
        "unset — which is what it is.",
        "",
        "## Keypoints — which skill fires when",
        "",
        "A keypoint is a moment where workflow discipline routinely decays. Each runs a",
        "**deterministic floor** (gates, which can fail the run) and prints a **judgment checklist**",
        "(which never can). A checklist line naming a skill routes there when the skill library is",
        "installed; without it the line carries the full inline procedure, so the ritual degrades to",
        "something a bare agent can still follow (ADR-020).",
        "",
        "Run: `cpc-keypoint <name>`, or vendored,",
        "`PYTHONPATH=tools/conventions python -m cpc.keypoint <name>`.",
        "",
    ]
    for name in ("plan-start", "session-start", "sprint-start", "sprint-close", "session-close"):
        kp = KEYPOINTS[name]
        floor = ", ".join(f"`{label}`" for label, _, _ in kp["run"]) or "none — judgment only"
        out += [f"### `{name}`", "", f"*{kp['why']}*", "", f"**Deterministic floor:** {floor}", ""]
        if kp.get("reads"):
            out += ["**Reads, in order** — the files an agent loads at this keypoint and nothing "
                    "else. `cpc-keypoint` prints these and checks each against the tree.", "",
                    "| # | Path | Why | Laid by `cpc-init` |", "|---|---|---|---|"]
            for i, (rel, why, laid) in enumerate(kp["reads"], 1):
                out.append(f"| {i} | `{rel}` | {' '.join(why.split())} | {'yes' if laid else 'no'} |")
            out.append("")
        out += ["| Skill | What the step is |", "|---|---|"]
        for skill, text in kp["checklist"]:
            out.append(f"| {f'`{skill}`' if skill else '—'} | {' '.join(text.split())} |")
        out.append("")

    skills = sorted({s for kp in KEYPOINTS.values() for s, _ in kp["checklist"] if s})
    out += [
        f"**{len(skills)} skills are named across the five keypoints:** "
        + ", ".join(f"`{s}`" for s in skills) + ".",
        "",
        "A `—` in the Skill column means no skill owns that step; follow the line as written.",
        "If a named skill is not installed, the line is still the procedure — that is the point of",
        "printing it rather than delegating silently.",
    ]
    return "\n".join(out).rstrip("\n") + "\n"


def _split_stamped(text: str) -> tuple[str | None, str]:
    """(date, body) of a previously generated file, or (None, text) if it is not one of ours."""
    head, _, body = text.partition("\n\n")
    m = UPDATED_RE.search(head)
    return (m.group(1) if m and head.startswith("<!--") else None), body


def _stamp(body: str, existing: str | None) -> str:
    """Prepend the status header, carrying the previous date forward while the body is unchanged.

    Same problem `docs_index` solved with a vault-derived date (finding 7): a generated artifact
    that stamps `today()` is never byte-stable, so `--check` can only compare the body and the file
    drifts on the calendar instead of on content. This body carries no date of its own, so the date
    advances only when the body genuinely changes — which makes `--check` a whole-file comparison
    and the artifact a pure function of the code that produced it."""
    if existing is not None:
        prev_date, prev_body = _split_stamped(existing)
        if prev_date and prev_body == body:
            return HEADER.format(date=prev_date) + "\n\n" + body
    return HEADER.format(date=dt.date.today().isoformat()) + "\n\n" + body


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Generate docs/SETTINGS.md from the code (ADR-037).")
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--out", default="docs/SETTINGS.md")
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true", help="fail if the committed file has drifted")
    args = ap.parse_args(argv)
    root: Path = args.root.resolve()
    target = root / args.out

    existing = target.read_text(encoding="utf-8", errors="ignore") if target.is_file() else None
    want = _stamp(render(root), existing)

    if args.check or not args.write:
        if existing is None:
            print(f"cpc-settings: {args.out} does not exist -> run `cpc-settings --write`")
            return 1
        if existing != want:
            print(f"cpc-settings: {args.out} is STALE -> run `cpc-settings --write`")
            return 1
        print(f"cpc-settings: {args.out} is current -> OK")
        return 0

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(want, encoding="utf-8", newline="")
    n = len(collect_settings())
    print(f"cpc-settings: wrote {args.out} ({n} settings, 5 keypoints)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
