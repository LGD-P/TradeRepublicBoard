# Golden fixtures — the parity contract

`cases/*.csv` are **fake** Trade Republic exports (no personal data).
`expected/*.json` are the canonical [data models](../docs/MODEL.md) produced by
`tr_board.py --emit-model`.

Both the Python core (`pytest`) and the future TypeScript core (`vitest`) must
reproduce `expected/*.json` exactly for every case — CI fails otherwise. This is
what keeps the two implementations from drifting.

## Cases
| case | exercises |
|---|---|
| `basic_dca` | monthly DCA on two ETFs + a saveback + interest |
| `roundup` | a saveback **and** a round-up (spare change) in the same month |
| `stock_partial_sell` | single stock, two buys then a partial sell (weighted-average cost) |
| `interest_and_ignored` | cash interest kept, card payments ignored |
| `rounding` | fractional average cost / realised gain (ROUND_HALF_UP boundary) |
| `single_buy` | one transaction |
| `empty` | header only, no rows |

## Regenerating (only when the model schema intentionally changes)
```bash
for c in fixtures/cases/*.csv; do
  n=$(basename "$c" .csv)
  PYTHONUTF8=1 python tr_board.py --emit-model --fi "$c" > "fixtures/expected/$n.json"
done
```
Review the diff carefully — a change here is a change to the cross-language contract.
