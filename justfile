# mcp_excalidraw — task shortcuts via `just` (https://github.com/casey/just).
#
# FACADE, NOT A GATE (cpc ADR-011). Every recipe only ALIASES a command that is already
# directly runnable. No check, build, or orchestration logic lives ONLY here: CI and every
# cpc gate invoke the underlying command directly, never `just`. A machine without `just`
# is therefore never broken — it just types the longer command. Keep every recipe body a
# single call to an already-extant command; if you are tempted to bury real logic here, put
# it in a script and alias that instead.
#
# `just` is an OPTIONAL, non-default binary — install it only for the shorthand:
#   cargo install just      # or:  brew install just
# Its absence breaks nothing. The lint/check recipes drive the cpc gates that `cpc-init`
# VENDORED into tools/conventions/cpc/ (ADR-015). The gates import each other as a package
# (`from cpc._config import ...`), so they are run as a MODULE with tools/conventions on the
# path — needing only a Python 3.11+ interpreter, nothing fetched from a remote.

# WINDOWS: `just` shells out to `sh` on every platform, and Windows has no `sh` unless something
# put one on PATH — so without the line below every recipe here fails from PowerShell and cmd with
# `could not find the shell 'sh'`. `cmd.exe` is chosen over pointing at Git's `sh.exe` because
# Git's install location is not fixed and an absolute machine path breaks the next machine.
# cmd is NOT a POSIX shell: no `&&` chains, no pipelines, no `$(...)`, and no `VAR=x cmd` prefix
# (which is why PYTHONPATH is exported below instead of inlined). That is affordable ONLY because
# ADR-011 already requires every recipe body to be a single call to a single program.
set windows-shell := ["cmd.exe", "/c"]

# Exported to every recipe, so no body carries the POSIX prefix cmd cannot parse.
export PYTHONPATH := "tools/conventions"

# Never leave bytecode behind (cpc KI-12). CPython validates a `.pyc` on (source mtime, size), so a
# revert to a string of the same length within one second passes validation and the interpreter
# serves code that is no longer on disk — with `git status` clean.
export PYTHONDONTWRITEBYTECODE := "1"

# List the available recipes (runs when you type `just` with no arguments).
default:
    @just --list

# Run the cpc doc/route + integrity gates across the tree (the on-call subset you run by hand).
lint:
    python -m cpc.docs_check --root . --strict
    python -m cpc.integrity_check --root . --strict

# Run just the cpc doc/route gate — a fast subset of `just lint`.
check:
    python -m cpc.docs_check --root . --strict

# --- stack-specific stubs ----------------------------------------------------------------
# Commented so an un-edited justfile never aliases a command this project does not have.
# Uncomment and point each at YOUR stack.

# Run the test suite.
# test:
#     pytest                  # or: cargo test / npm test / flutter test

# Build the project.
# build:
#     python -m build         # or: cargo build / npm run build
