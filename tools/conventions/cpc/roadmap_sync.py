#!/usr/bin/env python3
"""Generate a sprint contract stub per ROADMAP PR row (iterative-planning tie-in).

Parses the markdown PR table in docs/ROADMAP.md (columns: PR | Scope | Status | Spec) and,
for each not-done row, ensures docs/sprints/SPRINT-NNN-slug.md exists — seeded with the row's
scope (DoD) and spec (uses). Idempotent: never overwrites a filled contract.
  python roadmap_sync.py --root . [--base main] [--archive-done]

--archive-done flips an existing contract's header to `superseded` when its row reads done,
so the next docs_check/audit sweep moves it to docs/archive/.
"""
from __future__ import annotations
import argparse, datetime as dt, re
from pathlib import Path

DONE = re.compile(r"\b(done|complete|completed|merged|shipped)\b|✅|✔|✓", re.I)
NUM = re.compile(r"(\d+)")

CONTRACT_TMPL = """<!-- status: active · updated: {date} · class: disposable -->

# SPRINT-{num} — {slug}

- **base:** {base}
- **DoD:** {dod}

## uses
{uses}

## affects
- <file this sprint will create/modify>

## contracts
- test: <path/test_x.py::ident>
- snap: docs/openapi.json | when: **/api.py

## docs
- docs/DEVLOG.md
"""

def slugify(s: str, words: int = 5) -> str:
    toks = re.findall(r"[A-Za-z0-9]+", s.lower())
    return "-".join(toks[:words]) or "sprint"

def resolve_contract(sprints: Path, num: str, slug: str) -> Path:
    """Locate PR `num`'s contract. Prefer an existing `SPRINT-<num>-*.md` whatever its slug: the
    ROADMAP-derived slug often differs from the hand-picked filename (KI-3), so matching only the
    exact derived name silently no-ops `--archive-done` (and would let the create path emit a
    duplicate-number contract). Fall back to the derived name when none exists yet, to create it."""
    existing = sorted(sprints.glob(f"SPRINT-{num}-*.md"))
    return existing[0] if existing else sprints / f"SPRINT-{num}-{slug}.md"

def parse_table(md: str) -> list[dict]:
    rows = [ln for ln in md.splitlines() if ln.strip().startswith("|")]
    if not rows:
        return []
    header = [c.strip().lower() for c in rows[0].strip("|").split("|")]
    if not ("pr" in header and ("scope" in header or "status" in header)):
        return []
    def idx(name): return header.index(name) if name in header else None
    ip, isc, ist, isp = idx("pr"), idx("scope"), idx("status"), idx("spec")
    out = []
    for ln in rows[1:]:
        cells = [c.strip() for c in ln.strip("|").split("|")]
        if not cells or set("".join(cells)) <= set("-: "):  # separator row
            continue
        def get(i): return cells[i] if i is not None and i < len(cells) else ""
        out.append({"pr": get(ip), "scope": get(isc), "status": get(ist), "spec": get(isp)})
    return out

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--base", default="main")
    ap.add_argument("--archive-done", action="store_true")
    args = ap.parse_args()
    root = args.root.resolve()
    roadmap = root / "docs" / "ROADMAP.md"
    if not roadmap.exists():
        raise SystemExit("no docs/ROADMAP.md")
    sprints = root / "docs" / "sprints"
    sprints.mkdir(parents=True, exist_ok=True)
    date = dt.date.today().isoformat()
    rows = parse_table(roadmap.read_text(encoding="utf-8", errors="ignore"))
    if not rows:
        raise SystemExit("no PR table found (need columns: PR | Scope | Status [| Spec])")
    created = skipped = archived = 0
    for r in rows:
        m = NUM.search(r["pr"])
        if not m:
            continue
        num = m.group(1).zfill(3)
        slug = slugify(r["scope"])
        f = resolve_contract(sprints, num, slug)
        done = bool(DONE.search(r["status"]))
        if done:
            if args.archive_done and f.exists():
                t = f.read_text(encoding="utf-8")
                t2 = re.sub(r"status:\s*active", "status: superseded", t, count=1)
                if t2 != t:
                    f.write_text(t2, encoding="utf-8", newline=""); archived += 1
                    print(f"~ superseded (done): {f.name}")
            continue
        if f.exists():
            skipped += 1
            continue
        spec = r["spec"].strip("` ")
        uses = f"- {spec}" if spec and "<" not in spec else "- <file the agent should load>"
        dod = r["scope"] or "<behavioral acceptance criteria>"
        f.write_text(CONTRACT_TMPL.format(date=date, num=num, slug=slug, base=args.base,
                                          dod=dod, uses=uses), encoding="utf-8", newline="")
        created += 1
        print(f"+ created: {f.name}")
    print(f"\nroadmap_sync: {created} created, {skipped} existing, {archived} archived")
    if created:
        # plan-start anchor (claude-skills ADR-030): materializing contracts IS the planning
        # moment -- remind, never fail (ADR-020 honesty rule; banner is stateless by design).
        print("note: new contract(s) materialized -- if you haven't this session, run "
              "`cpc-keypoint plan-start` BEFORE decomposing further (lock scope/DoD, "
              "stress-test the plan).")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
