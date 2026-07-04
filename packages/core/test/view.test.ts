import { basename, dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseCsv } from "../src/csv.js";
import { computeModel } from "../src/model.js";
import { computeView } from "../src/view.js";

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, "..", "..", "..", "fixtures");

function view(name: string) {
  const csv = readFileSync(join(FIX, "cases", basename(name) + ".csv"), "utf-8");
  return computeView(computeModel(parseCsv(csv)));
}

describe("computeView (fallback = last transaction prices)", () => {
  it("aggregates KPIs and allocation for a DCA portfolio", () => {
    const v = view("basic_dca");
    // two ETFs, contributions + saveback add up to total cost
    expect(v.etfs.length).toBe(2);
    expect(v.kpis.totalCost).toBeCloseTo(v.kpis.contributions + v.kpis.savebackReceived, 6);
    // current value = sum of holdings valued at last price
    const sum = v.etfs.reduce((s, e) => s + e.value, 0);
    expect(v.kpis.currentValue).toBeCloseTo(sum, 6);
    // allocation shares sum to ~100%
    const pct = v.allocation.reduce((s, a) => s + a.pct, 0);
    expect(pct).toBeCloseTo(1, 6);
    // value-over-time series has one point per covered month, last = current value
    expect(v.series.length).toBeGreaterThan(0);
    expect(v.series[v.series.length - 1].value).toBeCloseTo(v.kpis.currentValue, 6);
    expect(v.pricesAreFallback).toBe(true);
  });

  it("computes weighted-average-cost stock P/L", () => {
    const v = view("stock_partial_sell");
    expect(v.stocks.length).toBe(1);
    const apple = v.stocks[0];
    expect(apple.realised).toBeCloseTo(103.0, 2); // 5 @225 vs WAC 204.20, -1 fee
    expect(apple.shares).toBeCloseTo(5, 6);
    expect(v.realisedTotal).toBeCloseTo(103.0, 2);
  });

  it("honours an explicit prices map", () => {
    const csv = readFileSync(join(FIX, "cases", "single_buy.csv"), "utf-8");
    const model = computeModel(parseCsv(csv));
    const isin = model.instruments[0].isin;
    const v = computeView(model, { [isin]: 200 });
    expect(v.pricesAreFallback).toBe(false);
    expect(v.etfs[0].price).toBe(200);
    expect(v.etfs[0].value).toBeCloseTo(v.etfs[0].shares * 200, 6);
  });
});
