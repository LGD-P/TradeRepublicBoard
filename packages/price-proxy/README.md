# Price proxy

The **only** networked part of TradeRepublicBoard. It exists because a browser
cannot call the price APIs directly (CORS), and because the strict CSP forbids
talking to anything but this proxy.

**Privacy by architecture:** it takes a single `isin` and returns one EUR price.
It never receives your holdings, quantities or amounts, keeps no state, and logs
nothing.

```
GET /?isin=IE00B4L5Y983   ->  { "isin": "IE00B4L5Y983", "price": 92.34, "currency": "EUR", "source": "xetra" }
GET /health               ->  { "ok": true }
```

Sources (same as the Python tool): Deutsche Börse / Xetra first, Yahoo Finance
fallback. Unknown ISIN → `{ "price": null }` (the app keeps the last value).

## Run it locally

```bash
cd packages/price-proxy
npm start            # http://localhost:8787
```

Or with Docker Compose from the repo root (`docker compose up` starts the web
app **and** this proxy).

## Deploy to Cloudflare (optional, later)

```bash
npm run deploy       # needs a Cloudflare account + wrangler
```

Then point the app at the Worker URL in **Settings → Online prices**, and add
that origin to `connect-src` in `packages/web/svelte.config.js`.
