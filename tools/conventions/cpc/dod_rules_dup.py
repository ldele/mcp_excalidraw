#!/usr/bin/env python3
"""The D rule family: duplicate and near-duplicate function bodies.

Compares the fingerprints `FileChecker` recorded — it never re-parses. D001 is an exact normalized
match, D002 a similarity ratio; the normalizer that makes "exact" mean anything lives in
`cpc.dod_scan`, deliberately shared with the side that builds the records.

Stdlib only (ADR-002).
"""
from __future__ import annotations

import sys
from collections import defaultdict
from difflib import SequenceMatcher

from cpc.findings import Finding


def check_duplication(records: list[dict], cfg: dict) -> list[Finding]:
    findings: list[Finding] = []
    dup = cfg["duplication"]
    threshold = float(dup["similarity"])
    groups: dict[str, list[dict]] = defaultdict(list)
    for r in records:
        groups[r["fp"]].append(r)

    # D001 - identical normalized bodies
    for grp in groups.values():
        if len(grp) < 2:
            continue
        grp.sort(key=lambda r: (r["path"], r["line"]))
        first = grp[0]
        for r in grp[1:]:
            if "ALL" in r["allowed"] or "D001" in r["allowed"]:
                continue
            findings.append(Finding("D001", "", r["path"], r["line"],
                            f"`{r['name']}` duplicates `{first['name']}` "
                            f"({first['path']}:{first['line']}) - identical normalized body; "
                            "extract one shared function and delete the copy"))

    # D002 - near-duplicates, compared on one representative per exact group
    reps = sorted((g[0] for g in groups.values()), key=lambda r: (r["path"], r["line"]))
    if len(reps) > dup["max_functions"]:
        print(f"dod-lint: D002 skipped ({len(reps)} functions > "
              f"max_functions {dup['max_functions']}; O(n^2) pass)", file=sys.stderr)
        return findings
    from collections import Counter
    bags = [Counter(r["toks"]) for r in reps]
    for i, a in enumerate(reps):
        la = len(a["toks"])
        for j in range(i + 1, len(reps)):
            b = reps[j]
            lb = len(b["toks"])
            lo, hi = (la, lb) if la < lb else (lb, la)
            if lo == 0 or 2 * lo / (lo + hi) < threshold:
                continue  # ratio() can never reach the bar at these lengths
            common = sum(min(c, bags[j][t]) for t, c in bags[i].items())
            if 2 * common / (la + lb) < threshold:
                continue  # cheap quick_ratio equivalent from cached counters
            sm = SequenceMatcher(None, a["toks"], b["toks"], autojunk=False)
            ratio = sm.ratio()
            if ratio >= threshold:
                if "ALL" in b["allowed"] or "D002" in b["allowed"]:
                    continue
                findings.append(Finding("D002", "", b["path"], b["line"],
                                f"`{b['name']}` is {ratio:.0%} similar to `{a['name']}` "
                                f"({a['path']}:{a['line']}) - near-duplicate; if the shape is "
                                "shared, extract it; if coincidental, pragma with a reason"))
    return findings
