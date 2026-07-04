# Done — Initial repo & internationalisation

**Shipped:** 2026-07-04

## Goal
Turn the personal script into a shareable, public-ready open-source project.

## Delivered
- Self-contained generator `tr_board.py` (English code, fully documented).
- **Bilingual output**: `--en` (default) / `--fr`, with a single source of truth
  for every user-facing string.
- Deutsche Börse / Xetra price source (Yahoo fallback) via `--auto-prices`.
- Mark-to-market monthly portfolio value on the Dashboard.
- MIT license, `pyproject.toml` (Poetry) + `requirements.txt` (pip).
- English README with screenshots in [`assets/`](../../assets).
- **Fake** English dataset in [`sample_data/`](../../sample_data) for demos and
  documentation — no personal data in the repo.
- Strict `.gitignore` so real exports, generated workbooks and local notes are
  never committed.

## Verification
Both languages generated and recalculated headlessly with LibreOffice; SUMIFS
criteria, mark-to-market values and weighted-average cost checked against hand
calculations.
