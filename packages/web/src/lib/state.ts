import { writable } from "svelte/store";

import { computeModel, computeView, parseCsv, type View } from "@tr/core";

import sampleCsv from "./sample_transactions.csv?raw";

export const view = writable<View | null>(null);
export const usingSample = writable(false);
export const errorMsg = writable<string | null>(null);

// Imported data is kept in sessionStorage: it survives a page refresh but is
// cleared when the tab closes — no long-term retention of personal data.
const KEY = "trb.csv";

export function loadCsvText(text: string, sample = false): void {
  try {
    const model = computeModel(parseCsv(text));
    view.set(computeView(model));
    usingSample.set(sample);
    errorMsg.set(null);
    if (typeof sessionStorage !== "undefined") {
      if (sample) sessionStorage.removeItem(KEY);
      else sessionStorage.setItem(KEY, text);
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
    const saved = sessionStorage.getItem(KEY);
    if (saved) {
      loadCsvText(saved, false);
      return true;
    }
  }
  return false;
}
