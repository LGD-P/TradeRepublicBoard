/**
 * View layer — turns the canonical, price-independent `Model` into the
 * dashboard-ready aggregates a UI needs (KPIs, allocation, series, positions).
 *
 * It takes a `prices` map (ISIN -> current price). When omitted it falls back to
 * each instrument's **last transaction price**, so the dashboard is fully usable
 * offline, with zero network, straight from the CSV.
 */
import type { Model } from "./model.js";

const n = (s: string | null | undefined): number => (s == null ? 0 : Number(s));

export interface EtfRow {
  isin: string;
  name: string;
  shares: number;
  costBasis: number;
  buys: number;
  saveback: number;
  price: number;
  value: number;
  gain: number;
  gainPct: number;
}

export interface StockRow {
  isin: string;
  name: string;
  shares: number;
  avgCost: number;
  remainingCost: number;
  price: number;
  value: number;
  unrealised: number;
  unrealisedPct: number;
  realised: number;
}

export interface SeriesPoint {
  year: number;
  month: number;
  cost: number;
  value: number;
}

export interface YearEtfRow {
  isin: string;
  name: string;
  shares: number;
  cost: number;
  value: number;
  gain: number;
  gainPct: number;
}

export interface YearMonthRow {
  month: number;
  buys: number;
  saveback: number;
  cost: number;
  value: number;
  gain: number;
}

export interface YearDetail {
  etfs: YearEtfRow[];
  monthly: YearMonthRow[];
}

export interface View {
  kpis: {
    contributions: number;
    savebackReceived: number;
    totalCost: number;
    fees: number;
    currentValue: number;
    gain: number;
    gainPct: number;
    savebackContribution: number;
  };
  etfs: EtfRow[];
  allocation: { isin: string; name: string; value: number; pct: number }[];
  series: SeriesPoint[];
  stocks: StockRow[];
  realisedTotal: number;
  tax: Model["tax"];
  prices: Record<string, number>;
  pricesAreFallback: boolean;
  years: number[];
  byYear: Record<number, YearDetail>;
}

/** Last transaction price per ISIN (ETF journal + stock trades). */
export function lastTransactionPrices(model: Model): Record<string, number> {
  const p: Record<string, number> = {};
  for (const e of model.etf_journal) if (e.price) p[e.isin] = n(e.price);
  for (const t of model.stock_trades) if (t.price) p[t.isin] = n(t.price);
  return p;
}

export function computeView(model: Model, prices?: Record<string, number>): View {
  const pricesAreFallback = prices === undefined;
  const px = prices ?? lastTransactionPrices(model);

  // Aggregate the ETF journal per instrument.
  const map = new Map<string, EtfRow>();
  for (const e of model.etf_journal) {
    let r = map.get(e.isin);
    if (!r) {
      r = { isin: e.isin, name: e.name, shares: 0, costBasis: 0, buys: 0, saveback: 0,
            price: 0, value: 0, gain: 0, gainPct: 0 };
      map.set(e.isin, r);
    }
    r.shares += n(e.shares);
    if (e.kind === "buy") r.buys += n(e.total);
    else if (e.kind === "saveback") r.saveback += n(e.total);
  }
  const etfs = [...map.values()].map((r) => {
    r.price = px[r.isin] ?? 0;
    r.costBasis = r.buys + r.saveback;
    r.value = r.shares * r.price;
    r.gain = r.value - r.costBasis;
    r.gainPct = r.costBasis ? r.gain / r.costBasis : 0;
    return r;
  });
  etfs.sort((a, b) => b.value - a.value);

  const contributions = etfs.reduce((s, e) => s + e.buys, 0);
  const savebackReceived = etfs.reduce((s, e) => s + e.saveback, 0);
  const totalCost = contributions + savebackReceived;
  const fees = model.etf_journal.reduce((s, e) => s + n(e.fee), 0);
  const currentValue = etfs.reduce((s, e) => s + e.value, 0);
  const gain = currentValue - totalCost;
  const gainPct = totalCost ? gain / totalCost : 0;

  // Saveback contribution = current worth of the "free" shares.
  const savebackShares = new Map<string, number>();
  for (const e of model.etf_journal)
    if (e.kind === "saveback")
      savebackShares.set(e.isin, (savebackShares.get(e.isin) ?? 0) + n(e.shares));
  let savebackContribution = 0;
  for (const [isin, sh] of savebackShares) savebackContribution += sh * (px[isin] ?? 0);

  const allocation = etfs
    .filter((e) => e.value > 0)
    .map((e) => ({ isin: e.isin, name: e.name, value: e.value,
                   pct: currentValue ? e.value / currentValue : 0 }));

  const lastIdx = model.monthly_value.length - 1;
  const series: SeriesPoint[] = model.monthly_value.map((m, i) => ({
    year: m.year,
    month: m.month,
    cost: n(m.cumulative_cost),
    value: i === lastIdx ? currentValue : n(m.portfolio_value),
  }));

  const stocks: StockRow[] = model.stock_positions.map((s) => {
    const price = px[s.isin] ?? 0;
    const shares = n(s.shares_held);
    const remainingCost = n(s.remaining_cost);
    const value = shares * price;
    return {
      isin: s.isin, name: s.name, shares, avgCost: n(s.avg_cost), remainingCost,
      price, value, unrealised: value - remainingCost,
      unrealisedPct: remainingCost ? (value - remainingCost) / remainingCost : 0,
      realised: n(s.realised_gain),
    };
  });
  const realisedTotal = stocks.reduce((s, x) => s + x.realised, 0);

  // --- per-year drilldown (like the "By ETF" sheet): ETF journal + stock trades
  //     unified into movements, grouped by year, with a monthly recap. ---
  interface Mv { year: number; month: number; isin: string; name: string; kind: string; shares: number; total: number; }
  const mvs: Mv[] = [];
  for (const e of model.etf_journal)
    mvs.push({ year: +e.date.slice(0, 4), month: +e.date.slice(5, 7), isin: e.isin, name: e.name, kind: e.kind, shares: n(e.shares), total: n(e.total) });
  for (const tr of model.stock_trades) {
    const sell = tr.dir === "SELL";
    mvs.push({ year: +tr.date.slice(0, 4), month: +tr.date.slice(5, 7), isin: tr.isin, name: tr.name,
               kind: sell ? "sell" : "buy", shares: sell ? -n(tr.qty) : n(tr.qty), total: sell ? -n(tr.amount) : n(tr.amount) });
  }
  const years = [...new Set(mvs.map((m) => m.year))].sort((a, b) => a - b);
  const byYear: Record<number, YearDetail> = {};
  for (const y of years) {
    const rows = new Map<string, YearEtfRow>();
    const months = new Map<number, { buys: number; saveback: number; shares: Map<string, number> }>();
    for (const m of mvs) {
      if (m.year !== y) continue;
      let r = rows.get(m.isin);
      if (!r) rows.set(m.isin, (r = { isin: m.isin, name: m.name, shares: 0, cost: 0, value: 0, gain: 0, gainPct: 0 }));
      r.shares += m.shares;
      if (m.kind === "buy" || m.kind === "saveback") r.cost += m.total;
      let mm = months.get(m.month);
      if (!mm) months.set(m.month, (mm = { buys: 0, saveback: 0, shares: new Map() }));
      if (m.kind === "buy") mm.buys += m.total;
      else if (m.kind === "saveback") mm.saveback += m.total;
      mm.shares.set(m.isin, (mm.shares.get(m.isin) ?? 0) + m.shares);
    }
    const yEtfs = [...rows.values()].map((r) => {
      r.value = r.shares * (px[r.isin] ?? 0);
      r.gain = r.value - r.cost;
      r.gainPct = r.cost ? r.gain / r.cost : 0;
      return r;
    }).sort((a, b) => b.value - a.value);
    const monthly: YearMonthRow[] = [...months.entries()].sort((a, b) => a[0] - b[0]).map(([month, mm]) => {
      let value = 0;
      for (const [isin, sh] of mm.shares) value += sh * (px[isin] ?? 0);
      const cost = mm.buys + mm.saveback;
      return { month, buys: mm.buys, saveback: mm.saveback, cost, value, gain: value - cost };
    });
    byYear[y] = { etfs: yEtfs, monthly };
  }

  return {
    kpis: { contributions, savebackReceived, totalCost, fees, currentValue,
            gain, gainPct, savebackContribution },
    etfs, allocation, series, stocks, realisedTotal,
    tax: model.tax, prices: px, pricesAreFallback, years, byYear,
  };
}
