#!/usr/bin/env python3
"""The O / M / E / N rule families: one file's AST, one pass.

Hidden mutation (O), memory layout and derive (M), match exhaustiveness (E), and the forbidden-
synonym check (N001) all read the same tree, so they share a visitor rather than walking the file
four times. Split from `dod_lint.py` 2026-08-07; the class is unchanged.

Stdlib only (ADR-002).
"""
from __future__ import annotations

import ast

from cpc.findings import Finding
from cpc.dod_scan import (DERIVE_DUNDERS, MUTABLE_CALLS, MUTATORS, SKIP_BASES,
                          _function_fingerprint, collect_allows)


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
