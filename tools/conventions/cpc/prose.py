#!/usr/bin/env python3
"""Advisory prose-tell reporter (ADR-036, CONVENTIONS §17).

  cpc-prose [PATH ...] [--threshold N] [--format {text,json}] [--all]

Counts the habits that mark generated text — the em dash as default connector, crutch adverbs,
marketing register, self-congratulating connectives, balanced antithesis — plus bold density and
sentence-length spread, and prints the worst files first.

**Exit code is 0 on every input.** This is a report, not a gate: §17 rules out gating style, and its
argument holds (a banned-word list catches words, not bad writing, and fires on every document that
quotes a banned word — §17 itself first). A report has a different failure mode: a gate that is
wrong 30% of the time must be argued with, while a count that is wrong 30% of the time still costs
the reader two seconds. So this never fails a build, is in no keypoint floor, and is called by no
other gate. The only non-zero exit is operational: a path that does not exist.

The counts are a prompt to look. A table of bolded labels is fine; twelve em dashes in a README is
not. This tool cannot tell those apart and does not try.

`spread` is the one number a word list cannot fake: the standard deviation of sentence length in
words. Uniform sentence length is the strongest single marker of generated prose and the hardest to
see while writing. Low spread on a long file is worth a look even when every other count is zero.

stdlib only (Python 3.11+). Travels in the vendored drop like every other gate.
"""
from __future__ import annotations
import argparse, json, re, statistics, sys
from pathlib import Path

# One pattern per tell, named as §17 names it. Case-insensitive, multiline.
# Kept deliberately small and NOT configurable (ADR-036): a project that can edit the list can
# silence the counter, which turns a report into a formality.
TELLS: dict[str, str] = {
    "em-dash":        r"—",
    "crutch-adverb":  r"\b(genuinely|exactly|deliberately|truly|simply|actually|really|quite)\b",
    "marketing":      r"\b(seamless|robust|powerful|leverage|delve|elevate|comprehensive|"
                      r"cutting-edge|streamlin\w+)\b",
    "self-congrat":   r"(?:That|which|this) is the point|\bthe honest truth\b|\bwhich is the point\b",
    "not-x-but-y":    r"\bnot [^.,;]{2,40},? but\b|\bisn't just [^.,;]{2,40},? it's\b",
    "rhetorical-q":   r"^[^\n]{0,120}\?\s*$",
}

# Below this many words a file is a stub, a header, or a table; its spread is noise.
_MIN_WORDS_FOR_SPREAD = 120
_SENTENCE_SPLIT = re.compile(r"[.!?]+[\s\n]")
_CODE_FENCE = re.compile(r"^```.*?^```", re.S | re.M)
_INLINE_CODE = re.compile(r"`[^`\n]*`")
_HTML_COMMENT = re.compile(r"<!--.*?-->", re.S)


def prose_only(text: str) -> str:
    """Strip what is not prose: fenced blocks, inline code, and the status header comment.

    A code fence full of em dashes is a code fence, and the header separator `·` is not writing.
    Without this the report is dominated by files that quote output, which is the false positive
    most likely to make a reader stop trusting it."""
    text = _CODE_FENCE.sub("\n", text)
    text = _HTML_COMMENT.sub("", text)
    return _INLINE_CODE.sub("x", text)


def sentence_spread(text: str) -> tuple[float, float]:
    """(mean, stdev) of sentence length in words. (0.0, 0.0) when there is too little to measure.

    Markdown structure is stripped first: a bullet list is not a sequence of sentences, and headings
    would otherwise register as very short ones and inflate the spread."""
    body = "\n".join(ln for ln in text.splitlines()
                     if ln.strip() and not ln.lstrip().startswith(("#", "|", ">", "-", "*", "+")))
    lengths = [len(s.split()) for s in _SENTENCE_SPLIT.split(body) if len(s.split()) > 2]
    if len(lengths) < 5:
        return 0.0, 0.0
    return statistics.fmean(lengths), statistics.stdev(lengths)


def scan(path: Path) -> dict:
    """Count one file. Returns a plain dict so --format json needs no encoder."""
    raw = path.read_text(encoding="utf-8", errors="ignore")
    text = prose_only(raw)
    words = len(text.split())
    hits = {name: len(re.findall(pat, text, re.I | re.M)) for name, pat in TELLS.items()}
    bold = len(re.findall(r"\*\*[^*\n]+\*\*", text))
    mean, spread = sentence_spread(text)
    # Per 1000 words, so a long document is not flagged merely for being long. This is the number
    # to compare across files; the raw count is what you act on.
    per_1k = (sum(hits.values()) / words * 1000) if words else 0.0
    return {"path": path.as_posix(), "words": words, "tells": hits, "bold": bold,
            "tells_per_1k": round(per_1k, 1), "sentence_mean": round(mean, 1),
            "sentence_spread": round(spread, 1)}


def md_files(paths: list[Path]) -> list[Path]:
    """Expand the given paths to markdown files, skipping trees nobody writes by hand."""
    skip = {".venv", "node_modules", ".git", "__pycache__", "site-packages"}
    out: list[Path] = []
    for p in paths:
        found = sorted(p.rglob("*.md")) if p.is_dir() else [p]
        out += [f for f in found if not any(part in skip for part in f.parts)]
    return out


def elide(rel: str, width: int) -> str:
    """Fit a path to `width` by dropping the FRONT, never the tail.

    A path's identifying part is its filename. Truncating from the left keeps every row's first 52
    characters — on an absolute path that is the temp or home prefix, identical for every row — and
    drops the one field the reader is looking for."""
    return rel if len(rel) <= width else "…" + rel[-(width - 1):]


def report(rows: list[dict], threshold: float, show_all: bool) -> list[str]:
    """Format the text report. Worst first, by tells per 1000 words."""
    rows = sorted(rows, key=lambda r: -r["tells_per_1k"])
    shown = [r for r in rows if show_all or r["tells_per_1k"] >= threshold
             or (r["sentence_spread"] and r["sentence_spread"] < 6.0
                 and r["words"] >= _MIN_WORDS_FOR_SPREAD)]
    out = [f"{'file':52} {'words':>6} {'/1k':>5} {'bold':>5} {'spread':>6}  tells"]
    for r in shown:
        hits = ", ".join(f"{k}x{v}" for k, v in sorted(r["tells"].items(), key=lambda kv: -kv[1])
                         if v)
        sp = f"{r['sentence_spread']:.1f}" if r["sentence_spread"] else "-"
        out.append(f"{elide(r['path'], 52):52} {r['words']:6} {r['tells_per_1k']:5.1f} "
                   f"{r['bold']:5} {sp:>6}  {hits or '-'}")
    tot = sum(sum(r["tells"].values()) for r in rows)
    out += ["",
            f"cpc-prose: {len(rows)} file(s), {tot} tell(s), {len(shown)} over threshold "
            f"({threshold}/1k). Advisory only — this never fails a build (ADR-036).",
            "A count is a prompt to look, not a verdict: a table of bolded labels is fine, "
            "twelve em dashes in a README is not.",
            "`spread` is sentence-length stdev in words. Under ~6 on a long file reads as flat."]
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="Count prose tells (CONVENTIONS §17). Advisory: always exits 0.")
    ap.add_argument("paths", nargs="*", default=["."], type=Path,
                    help="files or directories to scan (default: .)")
    ap.add_argument("--threshold", type=float, default=3.0,
                    help="print files at or above this many tells per 1000 words (default 3.0). "
                         "Changes the report, never the exit code")
    ap.add_argument("--all", action="store_true", help="print every file, ignoring --threshold")
    ap.add_argument("--format", choices=["text", "json"], default="text")
    args = ap.parse_args(argv)

    missing = [p for p in args.paths if not p.exists()]
    if missing:
        print(f"cpc-prose: no such path: {', '.join(p.as_posix() for p in missing)}",
              file=sys.stderr)
        return 2                      # operational, not a style verdict

    rows = [scan(f) for f in md_files(list(args.paths))]
    if args.format == "json":
        print(json.dumps(sorted(rows, key=lambda r: r["path"]), indent=2))
    else:
        print("\n".join(report(rows, args.threshold, args.all)))
    return 0                          # ALWAYS. See the module docstring and ADR-036.


if __name__ == "__main__":
    raise SystemExit(main())
