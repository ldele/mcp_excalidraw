<!-- status: active · updated: 2026-07-31 · class: living -->

# GLOSSARY — mcp_excalidraw

The pinned vocabulary for this project: one canonical term per concept, the synonyms that are
forbidden, and where each concept is owned. Use the canonical form in code, docs, prompts, and UI.
Enforced (opt-in) by the `cpc-glossary` gate and `cpc-dod-lint` rule N001 — see CONVENTIONS §14.

**Owner:** <who to ask before renaming a canonical term>

> Entries are `D-NNN` (domain noun) or `C-NNN` (code name). The `Forbidden` column is what the gate
> scans — list the words people actually reach for, not a thesaurus. An entry with no `Forbidden`
> words is documentation, not a lock. Delete this note and the example once you have real entries;
> unfilled `<placeholder>` entries are skipped by the gate.

---

## C-001 — <the concept, one line>

**Canonical:** `<the exact string to use>`
**Definition:** <one bounded, refutable sentence — what it is, where it stops>
**Forbidden:** `<synonym>`, `<synonym>`
**Authoritative in:** <type / module / file, or "—">

## D-001 — <a domain noun, one line>

**Canonical:** <the exact word for this concept>
**Definition:** <one bounded, refutable sentence>
**Forbidden:** <word>, <word>
**Authoritative in:** <the doc or model that owns it, or "—">
