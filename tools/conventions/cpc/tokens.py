#!/usr/bin/env python3
"""Deterministic token estimate for context budgets (stdlib, no model, no network).

`estimate_tokens(text)` approximates a BPE token count as `round(len(text) / 4)` — the standard
rough English chars-per-token ratio. This is a HEURISTIC, not a real tokenizer: a real BPE
tokenizer (e.g. `tiktoken`) would add a third-party runtime dependency and break the ADR-002
`dependencies = []` invariant. The chars/4 estimate runs roughly +/-15% vs a real tokenizer on
English prose (tighter on prose, looser on code, markup, or non-English text), so it is only ever
used to put a token *ceiling* alongside the existing line budgets — never as an exact count.

Consumed by `docs_check` (entry-context budget) and `sprint_check` (the resolved `uses` read-set).
See docs/specs/SPEC-context-budget-tokens.md.
"""
from __future__ import annotations

CHARS_PER_TOKEN = 4


def estimate_tokens(text: str) -> int:
    """Rough token estimate: ``round(len(text) / 4)``. Deterministic; ~+/-15% vs a BPE tokenizer."""
    return round(len(text) / CHARS_PER_TOKEN)
