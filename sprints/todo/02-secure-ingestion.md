# Sprint 02 — Hardened CSV ingestion

## Goal
Make sure the file we ingest really is a Trade Republic export and nothing
hostile — the classic checks for an untrusted input file — while keeping the
tool light.

## Scope (validations, before parsing)
- **Size limit**: reject files larger than a sane cap (e.g. 10 MB) to avoid
  memory blowups / zip-bomb-style CSVs.
- **Extension & encoding**: `.csv` only, decode as UTF-8 (with BOM) and fail
  cleanly on invalid bytes.
- **Header allow-list**: the exact expected columns must be present; refuse
  anything else (no silent "extra columns are fine").
- **Row/field caps**: bound the number of rows and the length of any single
  field (defend against pathological cells).
- **Formula-injection safety**: never let a cell value be written to Excel as a
  live formula. Values that start with `= + - @` (CSV injection vectors) must be
  treated as text when they land in the workbook.
- **Type checks**: dates match `%Y-%m-%d`, numeric columns parse as numbers.

## Acceptance criteria
- A crafted CSV (oversized, wrong header, `=cmd|...` cell, bad encoding) is
  rejected with a clear message and a non-zero exit; the good sample passes.
- No useless data retained: nothing is written outside the requested `--fo`.

## Security / privacy (OWASP-aligned)
- Treat the CSV as untrusted input; validate before use (A03 Injection, A08
  Integrity).
- No `eval`, no shell, no dynamic imports.
- Pin/limit dependencies; keep the surface small (stdlib + openpyxl only).

## Notes
- Deliver as a `validate_export(path) -> rows` function reused by the CLI and by
  the watcher (Sprint 01). Cover it with tests (Sprint 05).
