/**
 * Portable price proxy — the ONLY networked component of the project.
 *
 * Privacy by architecture: it receives a single `isin` query parameter and
 * returns one EUR price. It never sees holdings, quantities or amounts, keeps
 * no state, and logs nothing. Same handler runs locally (Node) and on a
 * Cloudflare Worker (see worker.js / server.js).
 *
 * Sources mirror tr_board.py: Deutsche Börse / Xetra first (EUR reference
 * venue, closest to Trade Republic), Yahoo Finance as an international fallback.
 */

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
const EXCH_EU = new Set(["GER", "FRA", "STU", "MUN", "HAM", "DUS", "BER", "MIL", "PAR", "AMS", "EBS", "MCE", "VIE", "LSE"]);

async function httpJson(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error("http " + r.status);
  return r.json();
}

/** EUR price via Deutsche Börse / Xetra. null if unavailable. */
async function fromXetra(isin) {
  for (const mic of ["XETR", "XFRA"]) {
    try {
      const d = await httpJson(`https://api.boerse-frankfurt.de/v1/data/quote_box/single?isin=${isin}&mic=${mic}`);
      let cur = d.currency;
      if (cur && typeof cur === "object") cur = cur.originalValue;
      if (d.lastPrice && (cur == null || cur === "EUR")) return Math.round(Number(d.lastPrice) * 100) / 100;
    } catch { /* try next venue */ }
  }
  return null;
}

async function yahooMeta(symbol) {
  const d = await httpJson("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol));
  return d.chart.result[0].meta;
}

/** EUR price via Yahoo Finance (fallback), converting the currency if needed. */
async function fromYahoo(isin) {
  const d = await httpJson("https://query1.finance.yahoo.com/v1/finance/search?q=" + isin);
  const quotes = d.quotes || [];
  if (!quotes.length) return null;
  const eu = quotes.filter((q) => EXCH_EU.has(q.exchange));
  const meta = await yahooMeta((eu[0] || quotes[0]).symbol);
  const price = meta.regularMarketPrice;
  const cur = meta.currency;
  if (price == null) return null;
  const rate = cur === "EUR" ? 1 : (await yahooMeta(cur + "EUR=X")).regularMarketPrice;
  return rate ? Math.round(price * rate * 100) / 100 : null;
}

async function resolvePrice(isin) {
  for (const [name, src] of [["xetra", fromXetra], ["yahoo", fromYahoo]]) {
    try {
      const price = await src(isin);
      if (price != null) return { price, source: name };
    } catch { /* try next source */ }
  }
  return null;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

/** Web-standard request handler shared by every runtime. */
export async function handle(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(request.url);
  if (url.pathname === "/health") return json({ ok: true });
  const isin = (url.searchParams.get("isin") || "").toUpperCase().trim();
  if (!ISIN_RE.test(isin)) return json({ error: "invalid isin" }, 400);
  const res = await resolvePrice(isin);
  // Unknown ISIN -> price:null (the app keeps the last value / lets you type it).
  if (!res) return json({ isin, price: null });
  return json({ isin, price: res.price, currency: "EUR", source: res.source });
}
