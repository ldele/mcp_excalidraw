#!/usr/bin/env python3
"""Push guard — enforce "never push without permission" (CONVENTIONS §13, ADR-007).

A `pre-push` gate: abort unless the human-set env flag CPC_PUSH_OK is present (any non-empty value).
A human sets it deliberately for the push they intend (`CPC_PUSH_OK=1 git push`); an agent running
non-interactively cannot set it, so it cannot push past this gate. Deterministic, language-agnostic
(git-level) — the one preference whose *observance* a gate can actually enforce.

  cpc-push-guard            # exit 0 iff CPC_PUSH_OK is set

stdlib only (Python 3.11+). Exit 1 to block the push.
"""
from __future__ import annotations
import argparse, os

FLAG = "CPC_PUSH_OK"

def main() -> int:
    # Accept and ignore any args — pre-push hooks are handed the remote name/url.
    ap = argparse.ArgumentParser(description="Block a push unless CPC_PUSH_OK is set.")
    ap.add_argument("--root", default=".")
    ap.add_argument("rest", nargs="*")
    ap.parse_known_args()

    if os.environ.get(FLAG, "").strip():
        print(f"push_guard: {FLAG} set -> OK")
        return 0
    print(
        f"ERROR push blocked by cpc-push-guard (CONVENTIONS §13): {FLAG} is not set.\n"
        f"  This project requires explicit human confirmation before a push.\n"
        f"  To push intentionally:  {FLAG}=1 git push\n"
        f"  Agents must NOT set {FLAG} — pushing is the human's call."
    )
    return 1

if __name__ == "__main__":
    raise SystemExit(main())
