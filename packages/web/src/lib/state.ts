import { writable } from "svelte/store";

import { computeModel, computeView, lastTransactionPrices, parseCsv, type Model, type View } from "@tr/core";

import sampleCsv from "./sample_transactions.csv?raw";

export const view = writable<View | null>(null);
export const usingSample = writable(false);
export const errorMsg = writable<string | null>(null);

// Imported data + manual prices live in sessionStorage: they survive a page
// refresh but are cleared when the tab closes — no long-term retention.
const CSV_KEY = "trb.csv";
const PX_KEY = "trb.px";

let model: Model | null = null;
let manualPrices: Record<string, number> = loadManualPrices();

/** Manual current-price overrides (ISIN -> price), for the Settings UI. */
export const manualPriceMap = writable<Record<string, number>>(manualPrices);

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

/** Recompute the view from the current model, applying any manual price overrides. */
function recompute(): void {
  if (!model) return;
  const prices = Object.keys(manualPrices).length
    ? { ...lastTransactionPrices(model), ...manualPrices }
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

/** Drop all manual overrides — back to last-transaction prices. */
export function resetManualPrices(): void {
  manualPrices = {};
  manualPriceMap.set(manualPrices);
  persistManualPrices();
  recompute();
}

/** Wipe everything from this browser session (CSV + prices). */
export function clearData(): void {
  model = null;
  manualPrices = {};
  manualPriceMap.set(manualPrices);
  view.set(null);
  usingSample.set(false);
  errorMsg.set(null);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(CSV_KEY);
    sessionStorage.removeItem(PX_KEY);
  }
}
