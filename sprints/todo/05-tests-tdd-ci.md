# Sprint 05 — Test suite (TDD) & CI

## Goal
Lock in correctness with tests and automate them, so refactors and dependency
bumps stay safe.

## Scope
- `pytest` suite covering the data layer (pure functions, no Excel needed):
  - saveback matching (credit ↔ same-amount buy);
  - weighted-average cost & realised gains (incl. multiple buys then a sell);
  - mark-to-market monthly value (carry-forward, sells reduce shares);
  - tax summary (interest per year, contributions, realised gains);
  - price preservation (by ISIN, and by normalised name across languages);
  - CSV validation from Sprint 02 (good sample passes, hostile inputs rejected).
- Golden-file test: generate from `sample_data/` and assert key cells via a
  headless LibreOffice recalculation (optional, marked slow).
- GitHub Actions CI: run the suite on push/PR across supported Python versions.
- Follow TDD for new features: write the failing test first.

## Acceptance criteria
- `pytest` green locally and in CI.
- Coverage reported; core data-layer functions well covered.

## Notes
- Keep tests dependency-light (stdlib + pytest). The headless-recalc test is
  opt-in so the fast suite needs no LibreOffice.
