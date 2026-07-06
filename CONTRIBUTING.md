# Contributing

Thanks for your interest! This is a privacy-first, security-conscious project —
please keep both in mind when proposing changes.

## Ground rules

- **Never include personal data.** No real Trade Republic exports, generated
  workbooks, screenshots of real portfolios, or `.bak` files. Everything demoable
  must use the fake `sample_data/transactions_sample.csv` (JOHN DOE).
- **Treat the CSV as untrusted input** (OWASP): validate size/type/columns/
  encoding and neutralise spreadsheet formula injection (`= + - @`). No `eval`,
  shell, or dynamic import.
- **No CDN, no analytics, no telemetry.** The web app keeps its strict CSP
  (`default-src 'self'`, `connect-src` limited to the price proxy).
- **TDD.** Add or update a failing test first. The Python and TypeScript cores
  must produce an identical model on the shared golden fixtures.

## Project layout

- `tr_board.py` — the Python CLI (data layer + Excel builders).
- `packages/core` — the TypeScript data layer (mirrors the Python model).
- `packages/web` — the SvelteKit dashboard.
- `packages/price-proxy` — the ISIN-only price proxy (local Node / Cloudflare Worker).
- `fixtures/` — shared golden fixtures that gate Python↔TS parity (see
  [`docs/MODEL.md`](docs/MODEL.md)).

## Running the checks locally

```bash
# Python core (ingestion + model contract)
pip install openpyxl pytest && python -m pytest -q

# TypeScript core (parity against the same fixtures)
cd packages/core && npm ci && npm run typecheck && npm test

# Web app (type-check + static build)
cd packages/web && npm ci && npm run check && npm run build
```

The **model contract** is the heart of the project: `tr_board.py --emit-model
--fi <csv>` prints the canonical model as JSON, and both cores are checked against
`fixtures/`. If you change the model, update the fixtures and make **both** cores
agree — CI enforces it.

## What CI runs on your PR

- **Correctness** — Python tests, TS tests + type-check, web build (`ci.yml`).
- **Security** — secret scan (gitleaks), `npm audit` on shipped deps, `pip-audit`
  (`security.yml`), and CodeQL static analysis (`codeql.yml`).
- **Dependencies** — Dependabot keeps npm / pip / actions pinned and current.

Please make sure the checks pass before requesting review. Small, focused PRs with
a clear description are much easier to accept.
