#!/usr/bin/env python3
"""Integrity gate: fail on NUL bytes / encoding corruption in tracked text files.

Catches the Windows<->Linux mount truncation hazard (and any other source of binary
garbage) BEFORE it reaches a commit: a "text" file that picked up NUL bytes, or was
truncated mid-write, is corrupt and must never be committed.

What it checks, per candidate file:
  1. NUL byte present            -> corruption (truncation padding / partial write)
  2. invalid UTF-8               -> not the text it claims to be
  3. (advisory) lone CR / mixed  -> only when --check-eol is passed

Scope: git-tracked files by default (uses `git ls-files`); falls back to a recursive
walk when run outside a repo or with --no-git. Binary files are skipped via a content
sniff (NUL in the first 8 KiB is the canonical "this is binary" test) UNLESS the path
matches a known-text glob, so a *.py/*.md/*.toml that contains NUL is always reported.

stdlib only (Python 3.11+). Exit 1 on any corruption; --strict also fails advisories.
"""
from __future__ import annotations
import argparse, subprocess, sys
from pathlib import Path

# Extensions we always treat as text: NUL in any of these = corruption, no exceptions.
TEXT_EXTS = {
    ".py", ".pyi", ".md", ".rst", ".txt", ".toml", ".cfg", ".ini",
    ".yaml", ".yml", ".json", ".js", ".ts", ".tsx", ".jsx", ".html", ".css",
    ".sh", ".rs", ".go", ".java", ".c", ".h", ".cpp", ".hpp", ".dart",
    ".gitattributes", ".gitignore", ".editorconfig",
}
# Always-binary suffixes: skip even the content sniff (legitimately contain NUL).
BINARY_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz",
    ".tar", ".whl", ".so", ".dll", ".dylib", ".o", ".a", ".class", ".pyc",
    ".woff", ".woff2", ".ttf", ".otf", ".mp4", ".mov", ".mp3", ".wasm",
}
SNIFF = 8192  # bytes read for the binary sniff


def tracked_files(root: Path, use_git: bool) -> list[Path]:
    if use_git:
        try:
            out = subprocess.run(
                ["git", "-C", str(root), "ls-files", "-z"],
                capture_output=True, check=True,
            ).stdout
            return [root / p.decode("utf-8", "surrogateescape")
                    for p in out.split(b"\x00") if p]
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass  # not a repo / no git -> fall through to walk
    skip = {".git", "__pycache__", ".venv", "venv", "node_modules",
            ".pytest_cache", ".mypy_cache", ".ruff_cache"}
    return [p for p in root.rglob("*")
            if p.is_file() and not any(part in skip for part in p.parts)]


def is_text_candidate(p: Path, data: bytes) -> bool:
    """True if this file should be held to the text-integrity contract."""
    suffix = p.suffix.lower()
    name = p.name.lower()
    if suffix in BINARY_EXTS:
        return False
    if suffix in TEXT_EXTS or name in TEXT_EXTS:
        return True
    # Unknown extension: treat as text unless it sniffs binary (NUL in the head).
    return b"\x00" not in data[:SNIFF]


def check_file(p: Path, check_eol: bool) -> tuple[list[str], list[str]]:
    """Return (errors, advisories) for one file."""
    errors: list[str] = []
    advisories: list[str] = []
    try:
        data = p.read_bytes()
    except OSError as e:
        return [f"unreadable: {e}"], []
    if not is_text_candidate(p, data):
        return [], []
    if b"\x00" in data:
        n = data.count(b"\x00")
        errors.append(f"contains {n} NUL byte(s) — corrupt/truncated text file")
        return errors, advisories  # NUL implies the UTF-8 check is moot
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as e:
        errors.append(f"invalid UTF-8 at byte {e.start} — not valid text")
        return errors, advisories
    if check_eol:
        if "\r\n" in text and "\n" in text.replace("\r\n", ""):
            advisories.append("mixed CRLF and LF line endings")
        elif "\r" in text.replace("\r\n", ""):
            advisories.append("lone CR (old-Mac) line endings")
    return errors, advisories


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--strict", action="store_true",
                    help="advisories (line-ending issues) also fail the run")
    ap.add_argument("--check-eol", action="store_true",
                    help="also report mixed/lone line endings (advisory)")
    ap.add_argument("--no-git", action="store_true",
                    help="walk the tree instead of using `git ls-files`")
    args = ap.parse_args()
    root: Path = args.root.resolve()

    n_err = n_adv = n_scanned = 0
    for f in sorted(tracked_files(root, use_git=not args.no_git)):
        if not f.exists():
            continue
        errs, advs = check_file(f, check_eol=args.check_eol)
        rel = f.relative_to(root).as_posix() if f.is_relative_to(root) else str(f)
        n_scanned += 1
        for e in errs:
            print(f"ERROR {rel}: {e}")
            n_err += 1
        for a in advs:
            print(f"WARN  {rel}: {a}")
            n_adv += 1

    fail = n_err > 0 or (args.strict and n_adv > 0)
    print(f"\nintegrity_check: {n_err} error(s), {n_adv} advisory(ies) over "
          f"{n_scanned} file(s) -> {'FAIL' if fail else 'OK'}  (root={root})")
    return 1 if fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
