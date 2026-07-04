# Sprint 04 — Web dashboard

## Goal
A clean, professional web dashboard with real, detailed charts, that ingests the
Trade Republic CSV and refreshes itself — without becoming a maintenance burden.

## Scope
- A small local web app (single service) that reads the same parsed data model as
  the Excel generator (share the data layer, don't duplicate it).
- Real charts (portfolio value over time, allocation, per-year drilldown,
  realised vs unrealised P/L) rendered **client-side from bundled assets** — no
  external CDN.
- Upload / drop a CSV → validated (Sprint 02) → dashboard updates → the raw file
  is discarded once parsed (no useless retention).
- Same bilingual support (en/fr).

## Acceptance criteria
- Start the app, drop the sample CSV, see the dashboard populate.
- No request leaves the machine except optional price lookups by ISIN.

## Security / privacy (OWASP top 10)
- All assets self-hosted (no CDN); strict Content-Security-Policy.
- Validate and size-limit uploads; reject non-CSV.
- No persistence of personal data beyond the current session; clear on exit.
- Keep dependencies minimal and patchable; document the update policy.

## Notes
- Keep it lightweight: a single small framework, no heavy front-end toolchain.
  The Excel workbook remains the reference output; the web app is a companion.
