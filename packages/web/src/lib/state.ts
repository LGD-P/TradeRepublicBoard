import { get, writable } from "svelte/store";

import { computeModel, computeView, lastTransactionPrices, parseCsv, type Model, type View } from "@tr/core";

import sampleCsv from "./sample_transactions.csv?raw";

export const view = writable<View | null>(null);
export const usingSample = writable(false);
export const errorMsg = writable<string | null>(null);

// Imported data + prices live in sessionStorage: they survive a page refresh
// but are cleared when the tab closes — no long-term retention.
const CSV_KEY = "trb.csv";
const PX_KEY = "trb.px";
const LIVE_KEY = "trb.live";
const AT_KEY = "trb.at";
const PROXY_KEY = "trb.proxy"; // config (localStorage), default off-network target
const AUTO_KEY = "trb.auto"; // auto-refresh toggle (localStorage)

let model: Model | null = null;
let manualPrices: Record<string, number> = loadManualPrices();
let livePrices: Record<string, number> = loadLivePrices();

/** Manual current-price overrides (ISIN -> price), for the Settings UI. */
export const manualPriceMap = writable<Record<string, number>>(manualPrices);
/** URL of the price proxy (empty = online refresh disabled). */
export const proxyUrl = writable<string>(loadProxyUrl());
/** When prices were last refreshed online (display string), null if never. */
export const refreshedAt = writable<string | null>(loadRefreshedAt());
/** True while an online refresh is in flight. */
export const refreshing = writable(false);

function loadLivePrices(): Record<string, number> {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const raw = JSON.parse(sessionStorage.getItem(LIVE_KEY) ?? "{}");
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) if (typeof v === "number" && v > 0) out[k] = v;
    return out;
  } catch {
    return {};
  }
}
function loadRefreshedAt(): string | null {
  return typeof sessionStorage !== "undefined" ? sessionStorage.getItem(AT_KEY) : null;
}
function loadProxyUrl(): string {
  if (typeof localStorage !== "undefined") return localStorage.getItem(PROXY_KEY) ?? "http://localhost:8787";
  return "http://localhost:8787";
}
export function setProxyUrl(u: string): void {
  proxyUrl.set(u);
  if (typeof localStorage !== "undefined") localStorage.setItem(PROXY_KEY, u);
}

/** Opt-in: refresh prices every minute while the tab is visible. Off by default. */
export const autoRefresh = writable<boolean>(
  typeof localStorage !== "undefined" && localStorage.getItem(AUTO_KEY) === "1",
);
export function setAutoRefresh(on: boolean): void {
  autoRefresh.set(on);
  if (typeof localStorage !== "undefined") localStorage.setItem(AUTO_KEY, on ? "1" : "");
}

function loadManualPrices(): Record<string, number> {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const raw = JSON.parse(sessionStorage.getItem(PX_KEY) ?? "{}");
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) if (typeof v === "number" && v > 0) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

function persistManualPrices(): void {
  if (typeof sessionStorage === "undefined") return;
  if (Object.keys(manualPrices).length) sessionStorage.setItem(PX_KEY, JSON.stringify(manualPrices));
  else sessionStorage.removeItem(PX_KEY);
}

/** Recompute the view, applying online (fresh) then manual price overrides on
 *  top of the last-transaction fallback. */
function recompute(): void {
  if (!model) return;
  const hasOverride = Object.keys(livePrices).length || Object.keys(manualPrices).length;
  const prices = hasOverride
    ? { ...lastTransactionPrices(model), ...livePrices, ...manualPrices }
    : undefined; // undefined => the view falls back to last-transaction prices
  view.set(computeView(model, prices));
}

export function loadCsvText(text: string, sample = false): void {
  try {
    model = computeModel(parseCsv(text));
    usingSample.set(sample);
    errorMsg.set(null);
    recompute();
    if (typeof sessionStorage !== "undefined") {
      if (sample) sessionStorage.removeItem(CSV_KEY);
      else sessionStorage.setItem(CSV_KEY, text);
    }
  } catch (e) {
    errorMsg.set(e instanceof Error ? e.message : "Could not read this file.");
  }
}

export function loadSample(): void {
  loadCsvText(sampleCsv, true);
}

/** Restore imported data after a refresh; returns true if something was restored. */
export function restore(): boolean {
  if (typeof sessionStorage !== "undefined") {
    const saved = sessionStorage.getItem(CSV_KEY);
    if (saved) {
      loadCsvText(saved, false);
      return true;
    }
  }
  return false;
}

/** Set (or clear, with null/invalid) the current price of one holding. */
export function setManualPrice(isin: string, price: number | null): void {
  if (price == null || !Number.isFinite(price) || price <= 0) delete manualPrices[isin];
  else manualPrices[isin] = price;
  manualPrices = { ...manualPrices };
  manualPriceMap.set(manualPrices);
  persistManualPrices();
  recompute();
}

/** Drop all manual overrides — back to last-transaction (or live) prices. */
export function resetManualPrices(): void {
  manualPrices = {};
  manualPriceMap.set(manualPrices);
  persistManualPrices();
  recompute();
}

function persistLivePrices(): void {
  if (typeof sessionStorage === "undefined") return;
  if (Object.keys(livePrices).length) sessionStorage.setItem(LIVE_KEY, JSON.stringify(livePrices));
  else sessionStorage.removeItem(LIVE_KEY);
}

/** Fetch the current price of every holding from the proxy (ISIN only leaves the
 *  browser). Manual overrides still win. Returns how many resolved / failed. */
export async function refreshPrices(): Promise<{ ok: number; fail: number }> {
  const v = get(view);
  const base = get(proxyUrl).trim().replace(/\/+$/, "");
  if (!v || !base) return { ok: 0, fail: 0 };
  const isins = [...new Set([...v.etfs.map((e) => e.isin), ...v.stocks.map((s) => s.isin)])].filter(Boolean);
  if (!isins.length) return { ok: 0, fail: 0 };
  refreshing.set(true);
  errorMsg.set(null);
  try {
    const results = await Promise.allSettled(isins.map(async (isin) => {
      const r = await fetch(`${base}/?isin=${encodeURIComponent(isin)}`, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error("http " + r.status);
      const d = await r.json();
      if (typeof d.price === "number" && d.price > 0) { livePrices[isin] = d.price; return true; }
      return false;
    }));
    let ok = 0, fail = 0;
    for (const x of results) (x.status === "fulfilled" && x.value) ? ok++ : fail++;
    livePrices = { ...livePrices };
    persistLivePrices();
    if (ok) {
      const at = new Date().toISOString().slice(0, 16).replace("T", " ");
      refreshedAt.set(at);
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(AT_KEY, at);
      recompute();
    }
    return { ok, fail };
  } catch {
    return { ok: 0, fail: isins.length };
  } finally {
    refreshing.set(false);
  }
}

/** Wipe everything from this browser session (CSV + prices). Keeps the proxy URL config. */
export function clearData(): void {
  model = null;
  manualPrices = {};
  livePrices = {};
  manualPriceMap.set(manualPrices);
  refreshedAt.set(null);
  view.set(null);
  usingSample.set(false);
  errorMsg.set(null);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(CSV_KEY);
    sessionStorage.removeItem(PX_KEY);
    sessionStorage.removeItem(LIVE_KEY);
    sessionStorage.removeItem(AT_KEY);
  }
}
