#!/usr/bin/env python3
"""dod-lint: data-oriented design linter for Python projects.

Five rule families:
  G - graph modularity, consumes .ast_context.json from project-mapper. G004 layer rules also
      derive from the `## Concept map` table in docs/architecture.md (SPEC-concept-map): the
      may-import column is the allow-list, G006 flags files no concept owns (warn;
      [dodlint.map] unmapped_ok exempts), G007 reports a malformed map (error, names the row).
      Legacy [dodlint.graph] layers wins over the map this release (deprecation warning).
  O - ownership & mutation (Rust-inspired)
  M - memory layout & derive (slots, dataclass, SoA advisories)
  E - exhaustiveness (advisory; real type checking belongs to mypy --strict)
  D - duplication (normalized-AST clone detection across files)

Zero dependencies, Python 3.11+ (tomllib). Exit codes:
  0  clean, or only warn/info without --strict
  1  errors present, or warnings present with --strict
  2  usage or config error

Suppress any finding with an inline pragma on the flagged line or on the
enclosing def/class line:  # dod: allow(O003)  /  # dod: allow(all)
"""

from __future__ import annotations

import argparse
import ast
import copy
import json
import re
import sys
from collections import defaultdict
from difflib import SequenceMatcher
from fnmatch import fnmatch
from pathlib import Path

from cpc.findings import Finding, to_json  # the shared record this file's Finding became (ADR-029)
from cpc.glossary_check import forbidden_map, parse_glossary  # N001 shares the GLOSSARY.md loaders

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


class FileChecker(ast.NodeVisitor):
    """O/M/E rule families on one file's AST."""

    def __init__(self, path: str, source: str, cfg: dict,
                 forbidden: dict[str, tuple[str, str]] | None = None):
        self.path = path
        self.cfg = cfg
        self.forbidden = forbidden or {}   # N001: forbidden-synonym -> (canonical, entry-id)
        self.allows = collect_allows(source)
        self.findings: list[Finding] = []
        self.func_records: list[dict] = []
        self.scope_lines: list[int] = []  # def/class header lines for pragma scope

    # -- helpers ----------------------------------------------------------

    def emit(self, rule: str, node: ast.AST, message: str) -> None:
        line = getattr(node, "lineno", 1)
        for ln in (line, *self.scope_lines[-1:]):
            allowed = self.allows.get(ln, set())
            if "ALL" in allowed or rule in allowed:
                return
        self.findings.append(Finding(rule, "", self.path, line, message))

    @staticmethod
    def _is_mutable_literal(node: ast.AST) -> bool:
        if isinstance(node, (ast.List, ast.Dict, ast.Set, ast.ListComp, ast.DictComp, ast.SetComp)):
            return True
        if isinstance(node, ast.Call):
            fn = node.func
            name = fn.id if isinstance(fn, ast.Name) else fn.attr if isinstance(fn, ast.Attribute) else ""
            return name in MUTABLE_CALLS
        return False

    def _is_mutable_attr_value(self, node: ast.AST) -> bool:
        """True if an __init__ attribute value is a mutable literal or MUTABLE_CALLS ctor."""
        return self._is_mutable_literal(node)

    @staticmethod
    def _decorator_names(node: ast.ClassDef | ast.FunctionDef | ast.AsyncFunctionDef) -> set[str]:
        names = set()
        for dec in node.decorator_list:
            target = dec.func if isinstance(dec, ast.Call) else dec
            if isinstance(target, ast.Name):
                names.add(target.id)
            elif isinstance(target, ast.Attribute):
                names.add(target.attr)
        return names

    # -- module level (O002) ------------------------------------------------

    def check_module(self, tree: ast.Module) -> None:
        for node in tree.body:
            targets: list[ast.expr] = []
            value = None
            if isinstance(node, ast.Assign):
                targets, value = node.targets, node.value
            elif isinstance(node, ast.AnnAssign) and node.value is not None:
                ann = ast.unparse(node.annotation)
                if "Final" in ann or "ClassVar" in ann:
                    continue
                targets, value = [node.target], node.value
            if value is None or not self._is_mutable_literal(value):
                continue
            skip_upper = self.cfg["ownership"]["allow_upper_constants"]
            for t in targets:
                if not isinstance(t, ast.Name) or t.id == "__all__":
                    continue
                if skip_upper and t.id.isupper():
                    continue  # ALL_CAPS = constant by convention; see references/dod-python.md
                if True:
                    self.emit("O002", node,
                              f"module-level mutable global `{t.id}` - shared mutable state; "
                              "freeze it (tuple/frozenset/MappingProxyType), make it Final, "
                              "or pass it explicitly")
        if self.forbidden:
            self.check_names(tree)
        self.visit(tree)

    # -- naming vs glossary (N001) ------------------------------------------

    def check_names(self, tree: ast.Module) -> None:
        """Flag an identifier that matches a forbidden GLOSSARY.md synonym.

        Names only (def/class/argument/assigned target), not string literals or
        comments — a *name* violation is what the glossary forbids; the prose
        surface is the cpc-glossary text gate's job. Whole-token match (the
        forbidden map keys), case-sensitive. allow(N001) suppresses per scope.
        """
        for node in ast.walk(tree):
            checks: list[tuple[str, ast.AST]] = []
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                checks.append((node.name, node))
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    for a in (*node.args.posonlyargs, *node.args.args, *node.args.kwonlyargs):
                        checks.append((a.arg, a))
                    if node.args.vararg:
                        checks.append((node.args.vararg.arg, node.args.vararg))
                    if node.args.kwarg:
                        checks.append((node.args.kwarg.arg, node.args.kwarg))
            elif isinstance(node, ast.Assign):
                for t in node.targets:
                    if isinstance(t, ast.Name):
                        checks.append((t.id, t))
                    elif isinstance(t, ast.Attribute):
                        checks.append((t.attr, t))
            elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
                checks.append((node.target.id, node.target))
            for name, where in checks:
                hit = self.forbidden.get(name)
                if hit:
                    canonical, eid = hit
                    self.emit("N001", where,
                              f"identifier `{name}` is a forbidden synonym - "
                              f"use canonical `{canonical}` ({eid}); "
                              "or `# dod: allow(N001)` if this name is deliberate")

    # -- functions (O001, O003, O004, E003) ---------------------------------

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._check_function(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._check_function(node)

    def _check_function(self, node) -> None:
        self.scope_lines.append(node.lineno)
        args = node.args
        for default in [*args.defaults, *[d for d in args.kw_defaults if d is not None]]:
            if self._is_mutable_literal(default):
                self.emit("O001", default,
                          f"mutable default argument in `{node.name}` - evaluated once at def "
                          "time and shared across calls; use None + construct inside")
        for stmt in node.body:
            if isinstance(stmt, ast.Global):
                self.emit("O004", stmt,
                          f"`global` rebinding in `{node.name}` - hidden write to module state; "
                          "return the value or hold it in an explicit object")
        params = {a.arg for a in [*args.posonlyargs, *args.args, *args.kwonlyargs]} - {"self", "cls"}
        if params:
            self._check_param_mutation(node, params)
        ex = self.cfg["exhaustiveness"]
        if ex.get("public_api") and not node.name.startswith("_") and node.returns is None:
            self.emit("E003", node,
                      f"public function `{node.name}` has no return annotation "
                      "(overlaps ruff ANN201 - prefer that if you run ruff)")
        self._record_function(node)
        self.generic_visit(node)
        self.scope_lines.pop()

    def _record_function(self, node) -> None:
        """Collect a normalized fingerprint for the D (duplication) family."""
        fp, toks, weight = _function_fingerprint(node)
        if weight < self.cfg["duplication"]["min_statements"]:
            return
        allowed: set[str] = set(self.allows.get(node.lineno, set()))
        if len(self.scope_lines) > 1:  # enclosing class/def header pragma
            allowed |= self.allows.get(self.scope_lines[-2], set())
        self.func_records.append({
            "path": self.path, "line": node.lineno, "name": node.name,
            "fp": fp, "toks": toks, "weight": weight, "allowed": allowed,
        })

    def _check_param_mutation(self, fn, params: set[str]) -> None:
        for sub in ast.walk(fn):
            if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Attribute):
                base = sub.func.value
                if isinstance(base, ast.Name) and base.id in params and sub.func.attr in MUTATORS:
                    self.emit("O003", sub,
                              f"`{fn.name}` mutates parameter `{base.id}` via .{sub.func.attr}() - "
                              "callers cannot see this from the signature; return a new value "
                              "or document with `# dod: allow(O003)` if in-place is the contract")
            elif isinstance(sub, (ast.Assign, ast.AugAssign)):
                tgts = sub.targets if isinstance(sub, ast.Assign) else [sub.target]
                for t in tgts:
                    inner = t.value if isinstance(t, (ast.Subscript, ast.Attribute)) else None
                    if isinstance(inner, ast.Name) and inner.id in params:
                        kind = "item" if isinstance(t, ast.Subscript) else "attribute"
                        self.emit("O003", sub,
                                  f"`{fn.name}` writes an {kind} of parameter `{inner.id}` - "
                                  "hidden mutation of caller-owned data")

    # -- classes (M001, M002, M003, M004, M006) + leaked-mutable (O005) -------

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        base_names = set()
        for b in node.bases:
            if isinstance(b, ast.Name):
                base_names.add(b.id)
            elif isinstance(b, ast.Attribute):
                base_names.add(b.attr)
        decorators = self._decorator_names(node)
        is_dataclass = "dataclass" in decorators or "define" in decorators or "attrs" in decorators
        skip = bool(base_names & SKIP_BASES)

        methods = {n.name: n for n in node.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}
        ann_attrs = {n.target.id for n in node.body
                     if isinstance(n, ast.AnnAssign) and isinstance(n.target, ast.Name)}
        init = methods.get("__init__")
        self_attrs: set[str] = set()
        init_is_plain = init is not None
        if init is not None:
            for stmt in init.body:
                if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Constant):
                    continue  # docstring
                if (isinstance(stmt, ast.Assign) and len(stmt.targets) == 1
                        and isinstance(stmt.targets[0], ast.Attribute)
                        and isinstance(stmt.targets[0].value, ast.Name)
                        and stmt.targets[0].value.id == "self"):
                    self_attrs.add(stmt.targets[0].attr)
                elif (isinstance(stmt, ast.AnnAssign) and isinstance(stmt.target, ast.Attribute)
                        and isinstance(stmt.target.value, ast.Name)
                        and stmt.target.value.id == "self"):
                    self_attrs.add(stmt.target.attr)
                else:
                    init_is_plain = False

        if not skip and not is_dataclass:
            if init is not None and init_is_plain and self_attrs and set(methods) == {"__init__"}:
                self.emit("M001", node,
                          f"class `{node.name}` is a plain data holder ({len(self_attrs)} attrs, "
                          "no behaviour) - derive it: @dataclass(slots=True) removes the "
                          "per-instance __dict__ and the hand-written __init__")
            derive_hits = sorted(DERIVE_DUNDERS & set(methods))
            if len(derive_hits) >= 2:
                self.emit("M002", node,
                          f"class `{node.name}` hand-writes {', '.join(derive_hits)} - "
                          "derive instead: @dataclass(eq=True) / order=True, or "
                          "functools.total_ordering for the comparisons")

        if is_dataclass and not skip and not node.bases:
            has_slots = any(
                isinstance(dec, ast.Call) and any(
                    kw.arg == "slots" and isinstance(kw.value, ast.Constant) and kw.value.value is True
                    for kw in dec.keywords)
                for dec in node.decorator_list)
            if not has_slots and "__slots__" not in ann_attrs:
                self.emit("M004", node,
                          f"@dataclass `{node.name}` without slots=True - each instance carries "
                          "a dict (~57% more memory, slower attribute access); "
                          "slots=True needs Python >=3.10")

        attr_count = len(self_attrs | ann_attrs - {"__slots__"})
        if attr_count > self.cfg["memory"]["max_attrs"]:
            self.emit("M003", node,
                      f"class `{node.name}` holds {attr_count} attributes "
                      f"(limit {self.cfg['memory']['max_attrs']}) - split by access pattern: "
                      "fields read together belong together (cache line), rarely-used fields "
                      "belong in a side table")

        # M006 - inheritance used for code-reuse where composition fits (advisory).
        # Fires only on a project-local base (bare Name, not a framework/typing base in
        # SKIP_BASES) when the subclass adds state or overrides <=1 method. Advisory: many
        # inheritance uses are correct subtyping; this names a candidate, never a verdict.
        if self.cfg["memory"].get("flag_inheritance", True) and not skip:
            local_bases = [b.id for b in node.bases if isinstance(b, ast.Name)
                           and b.id not in SKIP_BASES]
            if local_bases and self_attrs:
                self.emit("M006", node,
                          f"class `{node.name}` inherits from `{local_bases[0]}` and adds its own "
                          f"state ({len(self_attrs)} attr(s)) - inheriting to reuse code while "
                          "carrying own data is a composition smell; prefer holding a "
                          f"`{local_bases[0]}` as a field, or allow(M006) if it is genuine "
                          "substitutability (Liskov)")

        # O005 - a method returns an internal mutable attribute by reference, letting callers
        # mutate private state. Only flags attrs proven mutable from __init__ (literal or a
        # MUTABLE_CALLS constructor). Returning a copy/view is fine - suppress with allow(O005).
        if self.cfg["ownership"].get("check_leaked_mutable", True) and not is_dataclass:
            mutable_attrs = set()
            if init is not None:
                for stmt in init.body:
                    tgt = val = None
                    if (isinstance(stmt, ast.Assign) and len(stmt.targets) == 1
                            and isinstance(stmt.targets[0], ast.Attribute)
                            and isinstance(stmt.targets[0].value, ast.Name)
                            and stmt.targets[0].value.id == "self"):
                        tgt, val = stmt.targets[0].attr, stmt.value
                    elif (isinstance(stmt, ast.AnnAssign) and stmt.value is not None
                            and isinstance(stmt.target, ast.Attribute)
                            and isinstance(stmt.target.value, ast.Name)
                            and stmt.target.value.id == "self"):
                        tgt, val = stmt.target.attr, stmt.value
                    if tgt is not None and self._is_mutable_attr_value(val):
                        mutable_attrs.add(tgt)
            if mutable_attrs:
                for mname, m in methods.items():
                    if mname == "__init__":
                        continue
                    leaked = None
                    for sub in ast.walk(m):
                        if (isinstance(sub, ast.Return) and isinstance(sub.value, ast.Attribute)
                                and isinstance(sub.value.value, ast.Name)
                                and sub.value.value.id == "self"
                                and sub.value.attr in mutable_attrs):
                            leaked = sub.value.attr
                            break
                    if leaked is not None:
                        self.emit("O005", m,
                                  f"`{node.name}.{mname}` returns internal mutable "
                                  f"`self.{leaked}` by reference - callers can mutate "
                                  "private state; return a copy (list(...)/dict(...)) or an "
                                  "immutable view, or allow(O005) if sharing is intended")

        self.scope_lines.append(node.lineno)
        self.generic_visit(node)
        self.scope_lines.pop()

    # -- SoA candidates (M005) ----------------------------------------------

    def visit_ListComp(self, node: ast.ListComp) -> None:
        self._soa_check(node, node.elt)
        self.generic_visit(node)

    def _soa_check(self, node: ast.AST, elt: ast.AST) -> None:
        if isinstance(elt, ast.Call):
            fn = elt.func
            name = fn.id if isinstance(fn, ast.Name) else fn.attr if isinstance(fn, ast.Attribute) else ""
            if name[:1].isupper():
                self.emit("M005", node,
                          f"building a list of `{name}` objects (array-of-structs) - if this is "
                          "a hot path, parallel lists/arrays of fields (struct-of-arrays) cut "
                          "memory and cache misses; advisory only, measure first")

    # -- exhaustiveness (E001, E002) ------------------------------------------

    def visit_Match(self, node: ast.Match) -> None:
        last = node.cases[-1].pattern if node.cases else None
        is_catchall = isinstance(last, ast.MatchAs) and last.pattern is None
        if not is_catchall:
            self.emit("E001", node,
                      "match without a catch-all arm - add `case _: assert_never(x)` "
                      "(typing.assert_never) so mypy proves exhaustiveness when the "
                      "subject is an Enum or Literal union")
        self.generic_visit(node)

    def visit_If(self, node: ast.If) -> None:
        subject = self._compare_subject(node.test)
        if subject is not None:
            chain = 1
            cur = node
            while len(cur.orelse) == 1 and isinstance(cur.orelse[0], ast.If):
                nxt = cur.orelse[0]
                if self._compare_subject(nxt.test) != subject:
                    break
                chain += 1
                cur = nxt
            if chain >= 3 and not cur.orelse:
                self.emit("E002", node,
                          f"{chain}-branch if/elif chain on `{subject}` with no else - "
                          "a match statement with assert_never makes the missing case "
                          "a type error instead of a silent fall-through")
        self.generic_visit(node)

    @staticmethod
    def _compare_subject(test: ast.AST) -> str | None:
        if isinstance(test, ast.Compare) and isinstance(test.left, ast.Name):
            return test.left.id
        return None


# -- duplication family (D) ----------------------------------------------------

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


# -- concept map (docs/architecture.md `## Concept map`, SPEC-concept-map) ----

CONCEPT_HDR_RE = re.compile(r"^##\s+Concept map\s*$", re.I)
_NONE_CELLS = {"", "-", "—", "–"}   # an empty may-import cell: `—` / `-` / blank


def parse_concept_map(text: str) -> tuple[list[dict], list[tuple[int, str]]] | None:
    """Parse the `## Concept map` table (concept | responsibility | owned paths | may-import).
    None = no such section (map rules skip silently). Else (concepts, errors): each concept is
    {name, paths, may_import, line}; each error is (line, message) naming the offending row —
    a malformed map must be a clear gate error, never a crash or a silent skip (SPEC hard
    constraint). Cross-row checks: duplicate names, may-import referencing an unknown concept,
    an empty owned-paths cell."""
    concepts: list[dict] = []
    errors: list[tuple[int, str]] = []
    started = False
    for n, ln in enumerate(text.splitlines(), start=1):
        srt = ln.strip()
        if not started:
            if CONCEPT_HDR_RE.match(srt):
                started = True
            continue
        if re.match(r"^#{1,2}\s", srt):       # next h1/h2 ends the section
            break
        if not srt.startswith("|"):
            continue                          # header comment / prose lines
        cells = [c.strip() for c in srt.strip("|").split("|")]
        if all(set(c) <= set("-: ") for c in cells):
            continue                          # the |---|---| separator row
        if cells and cells[0].lower() == "concept":
            continue                          # the header row
        if len(cells) < 4:
            errors.append((n, f"concept-map row `{srt[:60]}` has {len(cells)} cell(s), need 4 "
                              "(concept | responsibility | owned paths | may-import)"))
            continue
        paths = [p.rstrip("/") for p in re.split(r"[,\s]+", cells[2]) if p.strip()]
        raw_mi = cells[3]
        may = [] if raw_mi in _NONE_CELLS else [c.strip() for c in raw_mi.split(",") if c.strip()]
        concepts.append({"name": cells[0], "paths": paths, "may_import": may, "line": n})
    if not started:
        return None
    names = [c["name"] for c in concepts]
    for c in concepts:
        if names.count(c["name"]) > 1:
            errors.append((c["line"], f"concept-map: duplicate concept `{c['name']}`"))
        if not c["paths"]:
            errors.append((c["line"], f"concept-map row `{c['name']}`: empty owned-paths cell"))
        for m in c["may_import"]:
            if m not in names:
                errors.append((c["line"], f"concept-map row `{c['name']}`: may-import names "
                                          f"unknown concept `{m}`"))
    return concepts, errors


def check_concept_orphans(rel_files: list[str], concepts: list[dict], cfg: dict) -> list[Finding]:
    """G006: a source file no concept owns. Owned paths match as directory prefixes or fnmatch
    globs; [dodlint.map] unmapped_ok exempts generated/vendored/glue files. WARN by default —
    promote to error only once observed noise is near zero (grill Q2)."""
    ok_globs = cfg["map"]["unmapped_ok"]
    owned = [p for c in concepts for p in c["paths"]]
    findings: list[Finding] = []
    for rel in rel_files:
        posix = Path(rel).as_posix()
        if any(posix == p or posix.startswith(p + "/") or fnmatch(posix, p) for p in owned):
            continue
        if any(fnmatch(posix, g) for g in ok_globs):
            continue
        findings.append(Finding("G006", "", rel, 1,
                        "file matches no concept in the docs/architecture.md `## Concept map` - "
                        "add it to a concept's owned paths, or exempt it via "
                        "[dodlint.map] unmapped_ok"))
    return findings


# -- graph family (G) ---------------------------------------------------------

def check_graph(ctx: dict, cfg: dict, allows_by_module: dict[str, dict[int, set[str]]],
                concepts: list[dict] | None = None) -> list[Finding]:
    findings: list[Finding] = []
    g = cfg["graph"]
    modules = set(ctx)

    def resolve(imp: str) -> list[str]:
        if imp in modules:
            return [imp]
        if f"{imp}/__init__" in modules:
            return [f"{imp}/__init__"]
        # package-form import (`from pkg import name`): the analyzer drops the
        # names, so link to every submodule - coarse but sound for layers, and
        # treats the package as one unit for cycles (documented approximation)
        return [m for m in modules if m.startswith(imp + "/")]

    edges: dict[str, set[str]] = {m: set() for m in modules}
    for m, data in ctx.items():
        for imp in data.get("imports", []):
            for r in resolve(imp):
                if r != m:
                    edges[m].add(r)

    def allowed(module: str, line: int, rule: str) -> bool:
        a = allows_by_module.get(module, {})
        s = a.get(line, set())
        return "ALL" in s or rule in s

    # G001 - cycles via Tarjan SCC
    index: dict[str, int] = {}
    low: dict[str, int] = {}
    on_stack: set[str] = set()
    stack: list[str] = []
    counter = [0]
    sccs: list[list[str]] = []

    def strongconnect(v: str) -> None:
        index[v] = low[v] = counter[0]
        counter[0] += 1
        stack.append(v)
        on_stack.add(v)
        for w in edges[v]:
            if w not in index:
                strongconnect(w)
                low[v] = min(low[v], low[w])
            elif w in on_stack:
                low[v] = min(low[v], index[w])
        if low[v] == index[v]:
            comp = []
            while True:
                w = stack.pop()
                on_stack.discard(w)
                comp.append(w)
                if w == v:
                    break
            if len(comp) > 1 or v in edges[v]:
                sccs.append(sorted(comp))

    sys.setrecursionlimit(max(10000, len(modules) * 4))
    for v in sorted(modules):
        if v not in index:
            strongconnect(v)
    for comp in sccs:
        findings.append(Finding("G001", "", comp[0] + ".py", 1,
                        "import cycle: " + " <-> ".join(comp) +
                        " - break it by moving the shared piece into a module both can import"))

    # G002 - fan-out
    for m in sorted(modules):
        if len(edges[m]) > g["max_fan_out"] and not allowed(m, 1, "G002"):
            findings.append(Finding("G002", "", m + ".py", 1,
                            f"module imports {len(edges[m])} project modules "
                            f"(limit {g['max_fan_out']}) - it knows too much; split it or "
                            "invert the dependency"))

    # G003 - fan-in, G005 - dead code
    entry = set(g["entry_points"])
    for m in sorted(modules):
        for fname, f in ctx[m].get("functions", {}).items():
            line = f.get("line", 1)
            cb = f.get("called_by", [])
            if len(cb) > g["max_fan_in"] and not allowed(m, line, "G003"):
                findings.append(Finding("G003", "", m + ".py", line,
                                f"`{fname}` has {len(cb)} callers (limit {g['max_fan_in']}) - "
                                "fine for a utility; review if it carries business logic"))
            if "." in fname:
                continue  # methods: overrides/protocols make dead-code too noisy
            leaf = fname.split(".")[-1]
            if (not cb and leaf not in entry and not leaf.startswith("test_")
                    and not (leaf.startswith("__") and leaf.endswith("__"))
                    and not allowed(m, line, "G005")):
                findings.append(Finding("G005", "", m + ".py", line,
                                f"`{fname}` has no callers in the project graph - dead code, "
                                "or an external entry point: delete it or mark "
                                "`# dod: allow(G005)`"))

    # G004 - layer violations. Two sources: legacy [dodlint.graph] layers (ordered, linear) or
    # the docs/architecture.md concept map (explicit may-import allow-list, SPEC-concept-map).
    # Both present -> the toml wins this release (main() prints the deprecation warning); the
    # map becomes the single source once the toml section is deleted (grill Q3).
    layers: list[dict] = g.get("layers", [])
    if layers:
        order = {l["path"].rstrip("/"): i for i, l in enumerate(layers)}

        def layer_of(m: str) -> int | None:
            for p, i in order.items():
                if m == p or m.startswith(p + "/"):
                    return i
            return None

        for m in sorted(modules):
            li = layer_of(m)
            if li is None:
                continue
            for dep in sorted(edges[m]):
                ld = layer_of(dep)
                if ld is not None and ld < li and not allowed(m, 1, "G004"):
                    findings.append(Finding("G004", "", m + ".py", 1,
                                    f"layer violation: `{m}` ({layers[li]['name']}) imports "
                                    f"`{dep}` ({layers[ld]['name']}) - lower layers must not "
                                    "import higher ones"))
    elif concepts:
        def concept_of(m: str) -> int | None:
            # A flat-layout map owns files and globs, not directories ("src/cpc/*_check.py" —
            # cpc's own map, the first live consumer). Module ids in the ctx carry no ".py",
            # so match both spellings, mirroring check_concept_orphans' fnmatch.
            f = m + ".py"
            for i, c in enumerate(concepts):
                for p in c["paths"]:
                    if m == p or m.startswith(p + "/") or fnmatch(f, p) or fnmatch(m, p):
                        return i
            return None

        allow_map = {c["name"]: set(c["may_import"]) for c in concepts}
        for m in sorted(modules):
            ci = concept_of(m)
            if ci is None:
                continue                     # unmapped module: G006's business, not G004's
            for dep in sorted(edges[m]):
                cd = concept_of(dep)
                if cd is None or cd == ci:
                    continue
                src, dst = concepts[ci]["name"], concepts[cd]["name"]
                if dst not in allow_map[src] and not allowed(m, 1, "G004"):
                    findings.append(Finding("G004", "", m + ".py", 1,
                                    f"layer violation: `{m}` ({src}) imports `{dep}` ({dst}) - "
                                    f"`{dst}` is not in `{src}`'s may-import "
                                    "(docs/architecture.md concept map)"))
    return findings


# -- driver -------------------------------------------------------------------

def collect_files(root: Path, excludes: list[str]) -> list[Path]:
    out = []
    for p in sorted(root.rglob("*.py")):
        rel_parts = p.relative_to(root).parts
        if any(part in excludes for part in rel_parts[:-1]):
            continue
        out.append(p)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(prog="dod_lint", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("root", type=Path, help="project root to lint")
    ap.add_argument("--config", type=Path, default=None, help="dodlint.toml (default: <root>/dodlint.toml if present)")
    ap.add_argument("--ast-context", type=Path, default=None,
                    help=".ast_context.json (default: <root>/.ast_context.json); graph rules skip if absent")
    ap.add_argument("--architecture", type=Path, default=None,
                    help="doc carrying the `## Concept map` (default: <root>/docs/architecture.md); "
                         "map rules (G004-from-map/G006/G007) skip if absent")
    ap.add_argument("--glossary", type=Path, default=None,
                    help="GLOSSARY.md for N001 (default: <root>/GLOSSARY.md); N rules skip if absent")
    ap.add_argument("--strict", action="store_true", help="warnings also fail the run")
    ap.add_argument("--format", choices=["text", "json"], default="text")
    ap.add_argument("--select", default=None, help="comma list of rule ids to run exclusively")
    args = ap.parse_args()

    root = args.root.resolve()
    if not root.is_dir():
        print(f"dod-lint: not a directory: {root}", file=sys.stderr)
        return 2

    cfg_path = args.config or (root / "dodlint.toml" if (root / "dodlint.toml").is_file() else None)
    cfg = load_config(cfg_path)

    # N001: load the project's GLOSSARY.md forbidden map once (skip the N family if absent).
    glossary_path = args.glossary or (root / "GLOSSARY.md")
    forbidden: dict[str, tuple[str, str]] = {}
    if glossary_path.is_file():
        forbidden = forbidden_map(parse_glossary(glossary_path.read_text(encoding="utf-8")))
    severities = dict(DEFAULT_SEVERITY)
    severities.update({norm_rule(k): v for k, v in cfg["severity"].items()})
    ignored = {norm_rule(r) for r in cfg["ignore"]}
    selected = {norm_rule(r) for r in args.select.split(",")} if args.select else None

    findings: list[Finding] = []
    func_records: list[dict] = []
    allows_by_module: dict[str, dict[int, set[str]]] = {}

    files = collect_files(root, cfg["exclude"])
    for f in files:
        try:
            source = f.read_text(encoding="utf-8", errors="ignore")
            tree = ast.parse(source)
        except SyntaxError as exc:
            print(f"dod-lint: skipping {f}: {exc}", file=sys.stderr)
            continue
        rel = str(f.relative_to(root))
        checker = FileChecker(rel, source, cfg, forbidden)
        checker.check_module(tree)
        findings.extend(checker.findings)
        func_records.extend(checker.func_records)
        allows_by_module[str(f.relative_to(root).with_suffix(""))] = checker.allows

    findings.extend(check_duplication(func_records, cfg))

    # Concept map (SPEC-concept-map): no docs/architecture.md or no `## Concept map` section ->
    # silent skip, like every not-universal gate. Malformed rows -> G007 findings and the
    # half-parsed map derives NOTHING (cascading rules off a broken map would bury the signal).
    concepts: list[dict] | None = None
    arch_path = args.architecture or root / "docs" / "architecture.md"
    if arch_path.is_file():
        parsed = parse_concept_map(arch_path.read_text(encoding="utf-8", errors="ignore"))
        if parsed is not None:
            concepts, map_errors = parsed
            arch_rel = (arch_path.relative_to(root).as_posix()
                        if arch_path.is_relative_to(root) else str(arch_path))
            for line, msg in map_errors:
                findings.append(Finding("G007", "", arch_rel, line, msg))
            if map_errors:
                concepts = None
            else:
                findings.extend(check_concept_orphans(
                    [str(f.relative_to(root)) for f in files], concepts, cfg))
                if cfg["graph"]["layers"]:
                    print("dod-lint: both [dodlint.graph] layers and the docs/architecture.md "
                          "concept map define layer rules - the toml wins this release "
                          "(deprecated); delete [dodlint.graph] layers to adopt the map",
                          file=sys.stderr)

    ctx_path = args.ast_context or root / ".ast_context.json"
    if ctx_path.is_file():
        try:
            ctx = json.loads(ctx_path.read_text(encoding="utf-8"))
            findings.extend(check_graph(ctx, cfg, allows_by_module, concepts))
        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            print(f"dod-lint: bad ast context {ctx_path}: {exc}", file=sys.stderr)
    else:
        print("dod-lint: no .ast_context.json - graph rules (G*) skipped; "
              "run project-mapper / py_ast_context.py first", file=sys.stderr)

    final = []
    for fd in findings:
        if fd.rule in ignored or (selected is not None and fd.rule not in selected):
            continue
        fd.severity = severities.get(fd.rule, "info")
        final.append(fd)
    final.sort(key=Finding.key)

    counts = {"error": 0, "warn": 0, "info": 0}
    for fd in final:
        counts[fd.severity] += 1

    if args.format == "json":
        print(to_json(final))   # `fd.__dict__` before the extraction; slots=True has no instance dict
    else:
        for fd in final:
            print(f"{fd.path}:{fd.line}: {fd.severity.upper():5s} DOD-{fd.rule} {fd.message}")
        total = sum(counts.values())
        print(f"\ndod-lint: {total} finding(s) - "
              f"{counts['error']} error, {counts['warn']} warn, {counts['info']} info")

    if counts["error"] or (args.strict and counts["warn"]):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
