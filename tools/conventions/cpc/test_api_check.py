#!/usr/bin/env python3
"""No-live-API-in-tests gate — enforce "no API credits burned in tests" (CONVENTIONS §13, ADR-007).

A `pre-commit` gate (NOT a test module — pytest's testpaths=["tests"] confines collection, so this
is never collected). Greps files under test paths for live-call patterns (a paid SDK / network
endpoint) and fails on a hit, so a test suite can't quietly burn credits or hit the network. The
policy is language-agnostic; the *detector* is per-stack (ADR-007) — the default pattern set is
conservative and extendable via conventions.toml. A line carrying `cpc: allow-live-api` is exempt.

  cpc-test-api-check --root . [--strict]

stdlib only (Python 3.11+). Exit 1 on a finding (warnings also fail under --strict).
"""
from __future__ import annotations
import argparse, re
from pathlib import Path
try:
    import tomllib
except ModuleNotFoundError:  # Python < 3.11
    try:
        import tomli as tomllib  # type: ignore
    except ModuleNotFoundError:
        tomllib = None

# Conservative defaults — actual call shapes, not bare URLs (those false-positive on example.com).
DEFAULT_PATTERNS = ["requests.", "httpx.", "urllib.request", "openai", "anthropic", "boto3", ".client("]  # cpc: allow-live-api  (this is the detector's own pattern list, not a live call — exempt it from the self-scan)
PRAGMA = "cpc: allow-live-api"
SKIP_DIRS = {".git", ".venv", "venv", "node_modules", "__pycache__", "dist", "build"}
TEST_NAME_RE = re.compile(r"(^test_.*|.*_test\.py$|.*\.test\.(ts|tsx|js)$|.*\.spec\.ts$)")

def load_patterns(root: Path, explicit: Path | None) -> list[str]:
    pats = list(DEFAULT_PATTERNS)
    path = explicit or (root / "scripts" / "conventions.toml")
    if path and path.exists() and tomllib is not None:
        try:
            with path.open("rb") as fh:
                data = tomllib.load(fh).get("test_api", {})
            pats += [str(p) for p in data.get("extra_patterns", [])]
            allow = {str(p) for p in data.get("allow_patterns", [])}
            pats = [p for p in pats if p not in allow]
        except (OSError, tomllib.TOMLDecodeError):
            pass
    return pats

def is_test_file(rel: str) -> bool:
    name = Path(rel).name
    return bool(TEST_NAME_RE.match(name)) or "/tests/" in f"/{rel}" or "/test/" in f"/{rel}"

def iter_test_files(root: Path):
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        rel = p.relative_to(root).as_posix()
        if is_test_file(rel):
            yield p, rel

def main() -> int:
    ap = argparse.ArgumentParser(description="Forbid live-API/network calls in test files.")
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--config", default=None, type=Path)
    ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()
    root: Path = args.root.resolve()
    patterns = load_patterns(root, args.config)
    errors: list[str] = []
    scanned = 0

    for p, rel in iter_test_files(root):
        scanned += 1
        for i, line in enumerate(p.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            if PRAGMA in line:
                continue
            for pat in patterns:
                if pat in line:
                    errors.append(f"[test-api] live-call pattern `{pat}` in test: {rel}:{i}")
                    break

    for e in errors:
        print(f"ERROR {e}")
    fail = bool(errors)
    print(f"\ntest_api_check: {len(errors)} error(s), 0 warning(s) -> "
          f"{'FAIL' if fail else 'OK'}  (scanned {scanned} test file(s), root={root})")
    return 1 if fail else 0

if __name__ == "__main__":
    raise SystemExit(main())
