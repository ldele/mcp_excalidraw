#!/usr/bin/env python3
"""Shared finding record + JSON emitter for the cpc gates (ADR-029).

**Extracted from `dod_lint.py`, not invented** (SPEC-verdict-snapshots ledger row 9): dod-lint
already carried this exact `Finding` and a `--format json` path, so the emitter moved here and all
three gates import the one type. A second `Finding` would have been the duplication dod-lint's own
D-family rules exist to catch.

The JSON form is **UNSTABLE and cpc-internal** for this release: it exists so the corpus harness
(`tests/corpus_harness.py`) can pin gate verdicts as golden files, and it is deliberately NOT a
console script, NOT documented for consumers, and NOT covered by the SemVer promise the `cpc-*`
entry-point names carry. A follow-on pins it once the corpus has settled the shape.

`sort` is each gate's own call, not this module's: dod-lint sorts by `Finding.key()` and its
`test_parity_golden` pins that byte-for-byte, while the doc gates need a filesystem-independent
total order (their scan is `rglob`-ordered, which is not guaranteed stable across OSes). So
`to_json` serializes in the order it is given and never reorders.

stdlib only (Python 3.11+).
"""
from __future__ import annotations

import dataclasses
import json
import re
from dataclasses import dataclass

# A gate's rule registry: rule id -> one-line description of what firing it means. Explicit, because
# scraping ids out of source is not merely fragile but wrong — `grep -oE '\[[a-z0-9-]+\]'` over
# docs_check.py returns `[0]`, `[1]`, `[str]`, `[text]` alongside the real tags (ledger row 8).
# `tests/test_rule_inventory.py` asserts every registered id is exercised by the corpus.
RuleRegistry = dict[str, str]


@dataclass(slots=True)
class Finding:
    """One gate finding. `path`/`line` are file-and-line coordinates when the gate has them.

    dod-lint walks an AST and fills both. The doc gates (`docs_check`, `sprint_check`) are
    tree-level checkers that carry the path *inside* the message and track no line numbers, so they
    emit `path=""`, `line=0` rather than regex-guessing coordinates out of prose — an honest empty
    beats a fabricated coordinate (ADR-007). Their `message` is the full payload.

    NOT frozen: dod-lint assigns `severity` after construction, once config-resolved.
    """

    rule: str
    severity: str
    path: str
    line: int
    message: str

    def key(self) -> tuple:
        return (self.path, self.line, self.rule)

    def total_key(self) -> tuple:
        """Filesystem-independent total order, for gates whose scan order is not guaranteed."""
        return (self.path, self.line, self.rule, self.message)


def as_dict(fd: Finding) -> dict:
    """`dataclasses.asdict`, NOT `fd.__dict__` — `slots=True` removes the instance dict, so the
    pre-extraction `fd.__dict__` spelling would raise AttributeError here."""
    return dataclasses.asdict(fd)


# `[tag] message` — the shape every docs_check / sprint_check finding is already written in. Parsing
# our own strictly-formatted prefix is reliable; parsing a *path* back out of the prose is not, which
# is why `from_tagged` leaves path/line empty instead of guessing.
TAGGED_RE = re.compile(r"^\[([a-z][a-z0-9-]*)\]\s*(.*)$", re.S)


def from_tagged(severity: str, text: str) -> Finding:
    """Build a Finding from a doc gate's `[tag] message` string.

    An unparseable string yields rule `untagged` rather than an exception: a gate must never crash
    on its own report line, and `untagged` is loud enough for the rule-inventory test to catch.
    """
    m = TAGGED_RE.match(text)
    if not m:
        return Finding("untagged", severity, "", 0, text)
    return Finding(m.group(1), severity, "", 0, m.group(2))


def to_json(findings: list[Finding]) -> str:
    """Serialize in the given order (callers sort). Matches dod-lint's pre-extraction output
    exactly: a flat list of objects at `indent=2`, no envelope — one golden shape for the repo."""
    return json.dumps([as_dict(fd) for fd in findings], indent=2)
