#!/usr/bin/env python3
"""dod-lint's shared substrate: severities, config, allow-pragmas, and the AST normalizer.

Split out of `dod_lint.py` (984 lines against §16's ~500) along the rule families it already had —
the same concept-seam split `docs_check.py` took in PR-27. Nothing here decides a finding; it is
what the four rule modules agree on.

`_function_fingerprint` lives here rather than with the duplication rules, and that placement is the
point: `FileChecker` calls it to BUILD a record and `check_duplication` compares the records it
built. Two spellings of "what makes two functions the same" is precisely the drift KI-7 was — one
predicate, several readers.

Stdlib only (ADR-002): this travels in the vendored drop and must run on a bare interpreter.
"""
from __future__ import annotations

import ast
import copy
import re
import sys
from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover - py<3.11
    tomllib = None

ALLOW_RE = re.compile(r"#\s*dod:\s*allow\(([^)]*)\)")

DEFAULT_SEVERITY: dict[str, str] = {
    "G001": "error",  # import cycle
    "G002": "warn",   # module fan-out over limit
    "G003": "info",   # function fan-in over limit
    "G004": "error",  # layer violation
    "G005": "warn",   # dead code (no callers in graph)
    "G006": "warn",   # file no concept-map concept owns (WARN-first, grill Q2)
    "G007": "error",  # malformed concept map (clear error naming the row, never a crash)
    "O001": "error",  # mutable default argument
    "O002": "warn",   # module-level mutable global
    "O003": "warn",   # function mutates its parameter
    "O004": "warn",   # `global` rebinding
    "O005": "warn",   # method returns internal mutable attr by reference
    "M001": "warn",   # plain data class -> @dataclass(slots=True)
    "M002": "warn",   # hand-written derive boilerplate
    "M003": "info",   # oversized class (attr count)
    "M004": "info",   # dataclass without slots=True
    "M005": "info",   # AoS list of objects -> SoA candidate
    "M006": "info",   # inheritance where composition fits (advisory)
    "E001": "info",   # match without assert_never catch-all
    "E002": "info",   # long if/elif chain on one subject, no else
    "E003": "info",   # public function without return annotation (off by default)
    "D001": "warn",   # exact duplicate function body (normalized AST)
    "D002": "info",   # near-duplicate function body
    "N001": "warn",   # identifier matches a forbidden GLOSSARY.md synonym
}

SEV_RANK = {"info": 0, "warn": 1, "error": 2}

MUTATORS = {
    "append", "extend", "insert", "remove", "pop", "clear", "sort",
    "reverse", "add", "discard", "update", "setdefault", "popitem",
}

MUTABLE_CALLS = {"list", "dict", "set", "bytearray", "defaultdict", "deque", "Counter", "OrderedDict"}

SKIP_BASES = {
    "Enum", "IntEnum", "StrEnum", "Flag", "IntFlag", "NamedTuple", "Protocol",
    "TypedDict", "BaseModel", "Exception", "BaseException", "ABC", "TestCase",
}

DERIVE_DUNDERS = {"__eq__", "__hash__", "__repr__", "__lt__", "__le__", "__gt__", "__ge__"}

def load_config(path: Path | None) -> dict:
    cfg: dict = {
        "exclude": ["tests", "test", ".venv", "venv", "build", "dist",
                    "__pycache__", ".git", "node_modules", "migrations"],
        "ignore": [],
        "graph": {
            "max_fan_out": 12,
            "max_fan_in": 25,
            "layers": [],            # ordered top (most dependent) -> bottom
            "entry_points": ["main", "cli", "app", "run", "handler", "lambda_handler"],
        },
        "memory": {"max_attrs": 12, "flag_inheritance": True},
        "ownership": {"allow_upper_constants": True, "check_leaked_mutable": True},
        "exhaustiveness": {"public_api": False},
        "duplication": {"min_statements": 5, "similarity": 0.90, "max_functions": 400},
        "map": {"unmapped_ok": []},   # G006 exempt globs (generated/vendored/glue files)
        "severity": {},
    }
    if path is None:
        return cfg
    if tomllib is None:
        print("dod-lint: tomllib unavailable (need Python 3.11+); using defaults", file=sys.stderr)
        return cfg
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError) as exc:
        print(f"dod-lint: cannot read config {path}: {exc}", file=sys.stderr)
        sys.exit(2)
    section = data.get("dodlint", data)
    for key in ("exclude", "ignore"):
        if key in section:
            cfg[key] = list(section[key])
    for key in ("graph", "memory", "ownership", "exhaustiveness", "duplication", "map", "severity"):
        if key in section:
            cfg[key].update(section[key])
    return cfg

def norm_rule(raw: str) -> str:
    r = raw.strip().upper()
    return r[4:] if r.startswith("DOD-") else r

def collect_allows(source: str) -> dict[int, set[str]]:
    """Map line number -> set of allowed rule ids ('ALL' for allow(all))."""
    allows: dict[int, set[str]] = {}
    for i, line in enumerate(source.splitlines(), start=1):
        m = ALLOW_RE.search(line)
        if m:
            allows[i] = {norm_rule(x) for x in m.group(1).split(",") if x.strip()}
    return allows

def _function_fingerprint(node) -> tuple[str, tuple, int]:
    """Normalized dump, token sequence, and statement weight of a function body.

    Type-2 normalization: locally bound names (params + assigned) and constant
    values are neutralized; free names (imported/builtin callees) and attribute
    names are kept, so different pipelines do not collide.
    """
    fn = copy.deepcopy(node)
    body = fn.body
    if (body and isinstance(body[0], ast.Expr)
            and isinstance(body[0].value, ast.Constant)
            and isinstance(body[0].value.value, str)):
        body = body[1:]  # drop docstring
    if not body:
        return "", (), 0
    a = fn.args
    local = {arg.arg for arg in
             [*a.posonlyargs, *a.args, *a.kwonlyargs,
              *([a.vararg] if a.vararg else []), *([a.kwarg] if a.kwarg else [])]}
    wrapper = ast.Module(body=body, type_ignores=[])
    for sub in ast.walk(wrapper):
        if isinstance(sub, ast.Name) and isinstance(sub.ctx, ast.Store):
            local.add(sub.id)
    mapping: dict[str, str] = {}

    def canon(name: str) -> str:
        if name not in mapping:
            mapping[name] = f"_v{len(mapping)}"
        return mapping[name]

    for sub in ast.walk(wrapper):
        if isinstance(sub, ast.Name) and sub.id in local:
            sub.id = canon(sub.id)
        elif isinstance(sub, ast.arg):
            sub.arg = canon(sub.arg)
        elif isinstance(sub, ast.Constant):
            sub.value = type(sub.value).__name__
    toks: list[str] = []
    weight = 0
    for sub in ast.walk(wrapper):
        weight += isinstance(sub, ast.stmt)
        toks.append(type(sub).__name__)
        if isinstance(sub, ast.Name):
            toks.append(sub.id)
        elif isinstance(sub, ast.arg):
            toks.append(sub.arg)
        elif isinstance(sub, ast.Attribute):
            toks.append(sub.attr)
        elif isinstance(sub, ast.Constant):
            toks.append(str(sub.value))
        elif isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            toks.append(sub.name)
        elif isinstance(sub, ast.keyword):
            toks.append(sub.arg or "**")
    return ast.dump(wrapper), tuple(toks), weight
