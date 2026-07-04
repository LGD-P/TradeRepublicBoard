import { writable } from "svelte/store";

import { computeModel, computeView, parseCsv, type View } from "@tr/core";

import sampleCsv from "./sample_transactions.csv?raw";

export const view = writable<View | null>(null);
export const usingSample = writable(false);
export const errorMsg = writable<string | null>(null);

export function loadCsvText(text: string, sample = false): void {
  try {
    const model = computeModel(parseCsv(text));
    view.set(computeView(model));
    usingSample.set(sample);
    errorMsg.set(null);
  } catch (e) {
    errorMsg.set(e instanceof Error ? e.message : "Could not read this file.");
  }
}

export function loadSample(): void {
  loadCsvText(sampleCsv, true);
}
