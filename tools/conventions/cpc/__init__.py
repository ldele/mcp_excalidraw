"""claude-project-conventions gates, packaged as a stdlib-only CLI (ADR-002; vendored into
consumer repos at cpc-init time per ADR-015).

Console entry points (see pyproject.toml [project.scripts]):
  cpc-docs-check  -> cpc.docs_check:main
  cpc-sprint-check -> cpc.sprint_check:main
  cpc-sprint-start -> cpc.sprint_start:main
  cpc-roadmap-sync -> cpc.roadmap_sync:main

The historical `python scripts/<name>.py` paths still work via thin shims in scripts/.
Single source of truth for each gate's logic lives here.
"""

__version__ = "1.3.0"
