# TradeRepublicBoard

Turn a **Trade Republic** CSV export into a private **portfolio dashboard** —
dollar-cost averaging (DCA), savebacks, single-stock picking, per-asset
drilldowns, a French tax summary, and a month-by-month *mark-to-market* history.

Runs **100 % in your browser** — nothing is uploaded, no account, no server.
A companion **command-line tool** builds the same view as a polished Excel
workbook. **English or French · light / dark.**

> **Unofficial project.** Not affiliated with, endorsed by, or connected to
> Trade Republic. It only reads a CSV you export yourself. Personal tracking
> tool, **not** investment or tax advice.

![Overview](assets/web/overview.png)

---

## Web dashboard — run it with Docker

The main app is a **fully local** SvelteKit dashboard. It reads your Trade
Republic CSV **in your browser**; the data never leaves your device. One command
brings it up (a small, **non-root** nginx serves a static build — no Node needed):

```bash
docker compose up --build
# then open http://localhost:8080
```

That starts the app and, optionally, the price proxy (see *Online prices* below).
For development instead: `cd packages/web && npm install && npm run dev` (Node 22+).

### What you get

- **Overview** — portfolio value, KPIs (contributions, saveback, fees, market
  performance, saveback worth), a value-vs-cost chart, an allocation donut,
  movers and a holdings table.
- **Click any holding → its own page** — a value-over-time chart for *that* line
  and its investment history, year by year and month by month.
- **Per-year monthly recap** with **expandable rows**: open a month to see each
  instrument (amounts and gains), the total kept end-of-line.
- **Issuer & ISIN** — each ETF shows its issuer (iShares, Amundi, Vanguard,
  Xtrackers…), parsed offline from its name; the ISIN links out to justETF for
  more detail.
- **Print / Save as PDF** and **Export `.xlsx`** — the workbook mirrors the CLI
  (styling and charts included), built entirely in-browser with **no dependency
  and no network**.
- **Prices your way** — type current prices by hand in **Settings**, or fetch
  them online (opt-in, see below). Gains are green, losses red, everywhere.
- **Privacy blur** — hit 👁 or press `H` to blur every figure at once (a
  colleague walks by); never leaks into a print.
- **Responsive sidebar** — collapses to an icon-only rail below ~980px, so
  navigation still works with two windows side by side.

![Privacy blur](assets/web/privacy-blur.png)

| Per-asset drilldown | Settings (prices, privacy) |
|---|---|
| ![Asset drilldown](assets/web/asset.png) | ![Settings](assets/web/settings.png) |

### Online prices (opt-in — the only networked feature)

A tiny [price proxy](packages/price-proxy) fetches current prices **by ISIN**
(Deutsche Börse / Xetra, Yahoo fallback) — **only the ISIN ever leaves your
browser, never your holdings**. It runs as a local Node server (`docker compose
up` starts it alongside the app) or a Cloudflare Worker. It's **off by default**:
flip **Settings → Online prices → Auto-refresh** to **ON** (refreshes on import
and every minute), or hit **Refresh** for a one-shot. The strict CSP limits
`connect-src` to that proxy and nothing else. The proxy address is baked into the
build (`PROXY_URL` in `packages/web/src/lib/state.ts`, `http://localhost:8787` by
default).

---

## Command-line tool — Excel workbook

Prefer a file you can keep? `tr_board.py` turns the same CSV into a styled,
self-contained **Excel workbook** (Dashboard, By-ETF with charts, Yearly, Tax,
Stock Picking, Read me). Its only runtime dependency is
[`openpyxl`](https://pypi.org/project/openpyxl/); needs **Python 3.9+**.

```bash
python -m pip install -r requirements.txt
python tr_board.py --fi transactions.csv --fo board.xlsx --en   # or --fr
```

Re-run it every month on a fresh export: the journal is rebuilt and your prices
are **preserved by ISIN**. Add `--auto-prices` to fetch quotes by ISIN, or
`--watch DIR` for a one-shot the OS scheduler can call (it processes an export
dropped in `DIR` and deletes it on success).

| Option | What it does | Default |
|---|---|---|
| `--fi` / `--fo` | Input CSV / output workbook | `transactions.csv` / `TradeRepublicBoard.xlsx` |
| `--en` / `--fr` | Workbook language | `--en` |
| `--auto-prices` | Fetch current prices by ISIN (needs internet) | off |

Try it on the bundled fake data:

```bash
python tr_board.py --fi sample_data/transactions_sample.csv --fo demo.xlsx --en
```

![By-ETF workbook sheet](assets/05-by-etf.png)

---

## Deploy to Cloudflare (optional)

The dashboard is a **static site** and the proxy is already a **Worker**. You get
a shareable URL and anyone can import *their own* CSV — their data stays in their
browser. All you need is a free Cloudflare account and [`wrangler`](https://developers.cloudflare.com/workers/wrangler/)
(`npm i -g wrangler`, then `wrangler login`).

**1 — Deploy the price proxy (Worker):**

```bash
cd packages/price-proxy
wrangler deploy
# → https://traderepublic-price-proxy.<your-subdomain>.workers.dev
```

**2 — Point the app at the Worker.** Set the Worker URL in two places:
`PROXY_URL` in `packages/web/src/lib/state.ts`, and `connect-src` in
`packages/web/svelte.config.js`:

```js
"connect-src": ["self", "https://traderepublic-price-proxy.<your-subdomain>.workers.dev"],
```

**3 — Build and publish the app (Pages, direct upload):**

```bash
cd packages/web
npm install && npm run build
wrangler pages deploy build --project-name traderepublicboard
# → https://traderepublicboard.pages.dev
```

Open the Pages URL — online prices are off by default; turn on
**Settings → Online prices** to use the Worker. The bundled `static/_redirects`
handles client-side routes.

> **Direct upload vs. Git integration.** The commands above use **direct upload**:
> Cloudflare never gets access to your repository. If you prefer auto-deploy on
> `git push`, connect the repo in the Pages dashboard instead — but scope the
> Cloudflare GitHub App to **this repository only**, not "all repositories", so it
> can't read your other private repos. Logging into Cloudflare *with* GitHub is
> just SSO (basic profile); repo access is a separate, per-repo grant you control.

---

## Privacy & security

Security and privacy are first-class goals here — see **[SECURITY.md](SECURITY.md)**.

- Everything runs **on your machine**. Your CSV is read in the browser (or by the
  CLI locally) and **never leaves your device**.
- The **only** outbound request is the opt-in price refresh, which sends a single
  **ISIN** (a public identifier) to the proxy — never your holdings or amounts.
  The proxy keeps no state and logs nothing.
- **No CDN, no analytics, no telemetry.** Fonts are self-hosted; a **strict CSP**
  (`default-src 'self'`) limits `connect-src` to the price proxy alone.
- **OWASP-aware**: the CSV is treated as **untrusted input** (size cap, UTF-8
  check, required-column check, row/field caps, and **spreadsheet
  formula-injection** neutralisation of `= + - @`); **no useless data is
  retained** — processed in memory, discarded after use.
- **Test-gated (TDD)**: the Python and TypeScript cores must produce an identical
  model on shared golden [`fixtures/`](fixtures) (CI), so the two can never drift.

---

## How it works

- **ETF portfolio** = transactions with `asset_class = FUND`. **Single stocks** =
  other `TRADING` transactions, routed to their own view.
- **Savebacks** — a `BENEFITS_SAVEBACK` credit reinvested by a buy of the same
  amount is tagged as a *Saveback* (the "free" shares).
- **Realised gains** use the **weighted-average cost** method.
- **Portfolio value over time** is *indicative*: it prices each month at *its own
  transactions* (the only prices in the export); the last point uses the current
  price. Instrument names come straight from the CSV — nothing to maintain.
- **Price sources** (`--auto-prices` / the proxy), by ISIN, with a silent
  fallback: **Deutsche Börse / Xetra** first (EUR reference venue), then
  **Yahoo Finance**.

The portfolio logic is a small, pure data layer with a language-neutral model
contract ([`docs/MODEL.md`](docs/MODEL.md)); `tr_board.py --emit-model --fi <csv>`
prints it as JSON.

```bash
pip install openpyxl pytest && python -m pytest -q
```

Contributions welcome — see **[CONTRIBUTING.md](CONTRIBUTING.md)**. CI gates every
PR on correctness (Python + TS parity, web build), security (gitleaks, `npm audit`,
`pip-audit`, CodeQL), and keeps dependencies current with Dependabot.

## Credits

Time-series charts use
[TradingView Lightweight Charts™](https://www.tradingview.com/lightweight-charts/)
(Apache-2.0). The UI is set in [Inter](https://rsms.me/inter/) by Rasmus
Andersson, self-hosted (latin subset, no CDN) under the
[SIL Open Font License 1.1](packages/web/static/fonts/Inter-OFL.txt).

## License

[MIT](LICENSE) © LGD-P
