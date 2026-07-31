<!-- status: active · updated: YYYY-MM-DD · class: disposable -->

# SPRINT-000 — <slug>

- **base:** <the branch this merges into — must be a branch that EXISTS in this repo>
- **DoD:** <behavioral acceptance criteria — what proves this is done>
<!-- base: `cpc-sprint-start` fills this from the repo's detected default branch, so prefer
     materializing a contract over hand-copying this template. A base that names no real revision
     does not fail loudly — it silently costs the scope gate its branch-history leg AND disables the
     tier-3 uses ⊇ affects check, while the gate still reports 0 errors. That was KI-4, live for six
     sprints. sprint_check now warns on it (`[base]`, fails under --strict). Override with --base for
     a release branch. -->
- **estimate:** <S|M|L> / <rough hours>  <!-- planner judgment, not a measurement -->
<!-- on activation, sprint_start inserts `- **started:** <ts>` here (ADR-019); a green
     `cpc-keypoint sprint-start` floor then adds `- **keypoint:** sprint-start <ts>` beside it —
     the stamp docs_check rule 15c requires on every started contract -->

<!-- One path (or glob) per bullet. uses/affects/contracts/docs are machine-read by sprint_check.py. -->

## uses
<!-- read-set: the files the agent should load for this sprint, nothing else -->
- docs/specs/SPEC-NNN-<slug>.md  <!-- the executor brief (ADR-019); rule 15 reads its ledger once started -->
- path/to/read_one.py
- docs/decisions/ADR-00X-relevant.md

## affects
<!-- write-set: the change must stay inside this (globs allowed) -->
- path/to/changed.py
- path/to/migrations/0*.py
- path/to/test_feature.py

## contracts
<!-- type: target [ | when: <glob> ]
       test = run in the verify loop (advisory reminder)
       snap = a snapshot file that MUST also change if a `when` file changed
       map  = a pinned map/guard that MUST also change if a `when` file changed -->
- test: path/to/test_feature.py::parity
- snap: docs/openapi.json | when: **/api.py
- map: config/tests/test_gates.py | when: **/api.py

## docs
<!-- must be touched when this lands (the docs gate enforces these appear in the diff) -->
- docs/DEVLOG.md

## gaps
<!-- executor: append planning gaps here, one line each; lifted verbatim into the closeout report -->
