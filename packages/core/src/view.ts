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

  return {
    kpis: { contributions, savebackReceived, totalCost, fees, currentValue,
            gain, gainPct, savebackContribution },
    etfs, allocation, series, stocks, realisedTotal,
    tax: model.tax, prices: px, pricesAreFallback,
  };
}
