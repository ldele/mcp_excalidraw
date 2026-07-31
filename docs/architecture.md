<!-- status: active · updated: 2026-07-31 · class: living -->

# Architecture

## Flow
<pipeline / request flow in a few lines or a diagram>

## Modules & responsibilities
| Module | Owns | Public contract |
|--------|------|-----------------|
| <…>    | <…>  | <…>             |

## Concept map
<!-- organizing principle: <state it in one line — by domain concept / by layer / by feature>;
     record deviations as an ADR (SPEC-concept-map Q5).
     Machine-read by cpc-dod-lint: owned paths place files — a source file no concept owns is a
     G006 WARN ([dodlint.map] unmapped_ok exempts generated/glue files); may-import is the layer
     allow-list (G004; legacy [dodlint.graph] layers still wins while both exist, deprecated).
     A row requires an existing member file: the map records the layout that IS, plus at most
     the split currently being executed — never a speculative structure. -->
| Concept | Responsibility | Owned paths | May-import |
|---------|----------------|-------------|------------|
| <name>  | <one line>     | <src/dir/>  | <concept names, or —> |

## Cross-cutting
<auth, config, error handling, logging — the boundaries>
