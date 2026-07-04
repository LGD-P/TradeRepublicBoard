# Data model — the Python ↔ TypeScript contract

`tr_board.py --emit-model --fi <csv>` prints a **language-neutral, deterministic**
JSON model computed from the CSV alone (no live prices, no localisation). This is
the single contract both the Python core and the future TypeScript core must
produce **identically** — enforced by the golden fixtures in `fixtures/`.

## Number semantics (pinned)
All monetary and quantity values are emitted as **decimal strings**, rounded with
**ROUND_HALF_UP**:

| kind | decimals | example |
|---|---|---|
| money (totals, costs, gains, interest) | 2 | `"105.73"` |
| price / average cost | 4 | `"204.2000"` |
| shares / quantity | 10 | `"0.0826910000"` |

Strings (not floats) avoid cross-language float drift. In TypeScript use
`decimal.js` (or integer minor units) with the same rounding.

## Shape
```jsonc
{
  "schema": 1,
  "instruments":  [ { "isin", "name" } ],                 // sorted by isin
  "etf_journal":  [ {
      "date": "YYYY-MM-DD",
      "kind": "buy" | "saveback" | "sell",
      "isin", "name",
      "price", "shares", "total", "fee",                  // decimal strings
      "comment": "card_saveback" | "card_roundup" | "sell" | null
  } ],
  "stock_trades": [ { "date","dir":"BUY|SELL","isin","name","qty","price","amount","fee" } ],
  "stock_positions": [ {
      "isin","name","shares_held","avg_cost","remaining_cost","realised_gain"
  } ],                                                    // weighted-average cost
  "monthly_value": [ {
      "year","month",                                     // ints
      "buys","saveback","cost_of_month","cumulative_cost",
      "portfolio_value"                                   // mark-to-market at transaction prices
  } ],
  "tax": [ { "year", "interest","realised_gain","contributions" } ]
}
```

## Notes
- **Round-up** (spare change) is captured as `kind: "saveback"` with
  `comment: "card_roundup"`. Promoting it to its own category is a separate sprint
  (needs a real export sample to confirm the CSV `type`).
- `monthly_value.portfolio_value` uses **transaction-date prices** (deterministic
  from the CSV). The workbook/UI may override the *last* point with a live price;
  that's a renderer concern, not part of this contract.
- Aggregations currently done by Excel formulas (per-ETF, per-year tables) will be
  added to the model when the TS core needs them, and covered by the same fixtures.
