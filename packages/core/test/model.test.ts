import { basename, dirname, join } from "node:path";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseCsv } from "../src/csv.js";
import { computeModel } from "../src/model.js";

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, "..", "..", "..", "fixtures");
const cases = readdirSync(join(FIX, "cases"))
  .filter((f) => f.endsWith(".csv"))
  .sort();

describe("TS core matches the golden fixtures (Python <-> TS contract)", () => {
  it("has fixtures", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const c of cases) {
    it(c, () => {
      const csv = readFileSync(join(FIX, "cases", c), "utf-8");
      const expected = JSON.parse(
        readFileSync(join(FIX, "expected", basename(c, ".csv") + ".json"), "utf-8"),
      );
      expect(computeModel(parseCsv(csv))).toEqual(expected);
    });
  }
});
