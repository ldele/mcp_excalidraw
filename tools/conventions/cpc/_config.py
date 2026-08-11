#!/usr/bin/env python3
"""Shared conventions.toml loader for the deterministic gates (stdlib only, Python 3.11+).

`load_config(root, explicit, defaults)` seeds a config from the caller's module-level `defaults`
(each section deep-copied, so the template is never mutated), then overlays the user's
`scripts/conventions.toml` — or an explicit `--config` path — section by section. Extracted from
docs_check and sprint_check, which carried byte-identical copies (DOD-D001 cleared); each now passes
its own `DEFAULTS` in.

The `tomllib`/`tomli` fallback guard is repeated in the three gates that read toml without going
through `load_config` (`coupling_check`, `init_check`, `test_api_check`); `dod_lint` reads its own
`dodlint.toml` too, with a tomllib-only guard and no `tomli` arm. The *loader* is what is
single-sourced here, not the import. Earlier wording claimed the fallback "isn't duplicated too",
which was never true.
"""
from __future__ import annotations
from pathlib import Path
try:
    import tomllib
except ModuleNotFoundError:  # Python < 3.11
    try:
        import tomli as tomllib  # type: ignore
    except ModuleNotFoundError:
        tomllib = None


def load_config(root: Path, explicit: Path | None, defaults: dict) -> dict:
    """Merge `defaults` with the user's conventions.toml (or `explicit`), section by section."""
    cfg = {k: dict(v) for k, v in defaults.items()}
    path = explicit or (root / "scripts" / "conventions.toml")
    if path and path.exists() and tomllib is not None:
        with path.open("rb") as fh:
            user = tomllib.load(fh)
        for section, vals in user.items():
            cfg.setdefault(section, {}).update(vals)
    return cfg
