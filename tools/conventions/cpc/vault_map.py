#!/usr/bin/env python3
"""The README's vault schema — a mermaid diagram generated from the tree it describes.

  cpc-vault-map --root . [--check | --write]

Rewrites the block between `<!-- cpc:vault-map:start -->` and `<!-- cpc:vault-map:end -->` in
README.md. GitHub renders mermaid in markdown natively, so the diagram needs no image file and no
build step.

**Generated, because a hand-drawn one goes stale silently and this repo has the receipts.** Twice
in one week a prose state line described a project that had moved on: `AGENTS.md` was frozen three
days and seven waves behind, and the CHANGELOG's own summary still described a release that had
grown by more than half. Both were caught by a human reading them, not by a gate. Every number in
this diagram — doc counts, token costs — is measured at generation time, and `cpc-generate --check`
fails when the tree moves away from it.

stdlib only (Python 3.11+).
"""
from __future__ import annotations
import argparse, sys
from pathlib import Path

from cpc.tokens import estimate_tokens

DEFAULTS = {"vault_map": {"path": "README.md"}}

START = "<!-- cpc:vault-map:start -->"
END = "<!-- cpc:vault-map:end -->"


def _tok(root: Path, rel: str) -> int:
    p = root / rel
    return estimate_tokens(p.read_text(encoding="utf-8", errors="ignore")) if p.is_file() else 0


def _count(root: Path, rel: str, pat: str) -> int:
    d = root / rel
    return len([p for p in d.glob(pat) if "template" not in p.name]) if d.is_dir() else 0


def render(root: Path) -> str:
    entry = _tok(root, "AGENTS.md") + _tok(root, ".claude/CONTEXT.md")
    digest = _tok(root, "docs/DIGEST.md")
    logs = _tok(root, "docs/DEVLOG.md") + _tok(root, ".claude/KNOWN_ISSUES.md")
    n_adr = _count(root, "docs/decisions", "ADR-*.md")
    n_spec = _count(root, "docs/specs", "SPEC-*.md")
    n_feat = _count(root, "docs/features", "FEATURE-*.md")
    n_res = _count(root, "docs/research", "RESEARCH-*.md")
    # Mermaid labels are quoted throughout: a bare label containing `(`, `,` or `—` is a parse
    # error on GitHub's renderer, and the numbers below routinely produce all three.
    return "\n".join([
        "```mermaid",
        "flowchart TD",
        "  subgraph S[\"Read at session start\"]",
        "    direction LR",
        f"    A[\"AGENTS.md + CONTEXT.md<br/>the router and the facts<br/>~{entry} tok · capped at 3000\"]",
        "    N[\"NORTH_STAR.md<br/>audience and register\"]",
        f"    D[\"DIGEST.md · generated<br/>every known issue + recent work<br/>~{digest} tok\"]",
        "    A --> N --> D",
        "  end",
        "  subgraph O[\"Opened only when the digest points at one\"]",
        "    direction LR",
        f"    L[\"DEVLOG.md + KNOWN_ISSUES.md<br/>~{logs} tok in full\"]",
        "  end",
        "  subgraph W[\"Authored on demand — one question each\"]",
        "    direction LR",
        f"    ADR[\"decisions/ADR-NNN · {n_adr}<br/>why we chose this\"]",
        f"    SPEC[\"specs/SPEC-slug · {n_spec}<br/>what to build\"]",
        f"    FEAT[\"features/FEATURE-NNN · {n_feat}<br/>what exists, and how much is verified\"]",
        f"    RES[\"research/RESEARCH-slug · {n_res}<br/>no answer to look up\"]",
        "  end",
        "  subgraph G[\"Generated — never hand-edited\"]",
        "    direction LR",
        "    IDX[\"INDEX.md<br/>what cites what\"]",
        "    SET[\"SETTINGS.md<br/>every knob and its owner\"]",
        "  end",
        # Node-to-node only. An edge into a subgraph renders inconsistently across mermaid
        # versions, and one from a node to its OWN containing subgraph is meaningless.
        "  D -.->|\"open one entry\"| L",
        "  D -.->|\"--tag a,b\"| FEAT",
        "  FEAT -->|\"Decided by\"| ADR",
        "  FEAT -->|\"Built to\"| SPEC",
        "  ADR -.->|\"--of ADR-NNN\"| IDX",
        "  RES -.->|\"before proposing an approach\"| ADR",
        "```",
    ])


def _split(text: str) -> tuple[str, str] | None:
    if START not in text or END not in text:
        return None
    head, rest = text.split(START, 1)
    _, tail = rest.split(END, 1)
    return head, tail


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Generate the README's mermaid vault schema.")
    ap.add_argument("--root", default=".", type=Path)
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="fail if the schema has drifted (default)")
    mode.add_argument("--write", action="store_true", help="regenerate the schema in place")
    args = ap.parse_args(argv)
    root: Path = args.root.resolve()
    target = root / "README.md"

    if not target.is_file():
        print("cpc-vault-map: no README.md -> OK (nothing to do)")
        return 0
    text = target.read_text(encoding="utf-8", errors="ignore")
    parts = _split(text)
    if parts is None:
        print(f"cpc-vault-map: README.md carries no {START} / {END} markers -> OK (nothing to do)")
        return 0
    head, tail = parts
    fresh = f"{head}{START}\n{render(root)}\n{END}{tail}"

    if args.write:
        target.write_text(fresh, encoding="utf-8", newline="")
        print("cpc-vault-map: wrote README.md")
        return 0
    if text != fresh:
        print("cpc-vault-map: README.md schema has drifted -> regenerate: cpc-vault-map --write",
              file=sys.stderr)
        return 1
    print("cpc-vault-map: README.md schema is current -> OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
