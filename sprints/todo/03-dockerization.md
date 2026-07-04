# Sprint 03 — Dockerisation

## Goal
Run the tool anywhere with one command, in a small, easy-to-patch image.

## Scope
- A minimal `Dockerfile` on a slim, well-maintained base (e.g. `python:3.12-slim`)
  to keep the CVE surface small and updates easy.
- Non-root user; read-only bind mount for the input CSV; output written to a
  mounted volume only.
- No build tools left in the final image (multi-stage if needed).
- `docker run` example wired to the watched folder from Sprint 01.

## Acceptance criteria
```bash
docker build -t traderepublicboard .
docker run --rm -v "$PWD/data:/data" traderepublicboard \
  --fi /data/transactions.csv --fo /data/board.xlsx --en
```
produces the workbook; the container keeps no state.

## Security / privacy
- Runs offline by default; network is only needed for `--auto-prices`.
- Pin the base image by digest; document the update/patch cadence.
- No secrets, no CDN, no telemetry baked in.
