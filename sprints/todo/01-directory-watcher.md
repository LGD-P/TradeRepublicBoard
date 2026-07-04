# Sprint 01 — Directory watcher (auto-ingest new exports)

## Goal
Drop a fresh Trade Republic export into a watched folder and have the board
rebuilt automatically, then delete the export once processed. No manual command.

## Scope
- A watched folder, e.g. `./inbox/`, and a stable expected filename in English:
  **`trade-republic-export.csv`** (configurable).
- A run entry point `tr_board.py --watch <dir>` OR a thin wrapper script that:
  1. looks for the expected file,
  2. validates it (see Sprint 02 — reuse that validation),
  3. runs the generator to the configured `--fo`,
  4. **deletes the export** on success (never keep useless data),
  5. logs one line (timestamp, rows processed) and exits.
- Scheduling is left to the OS (hourly), with ready-made recipes below.

## Acceptance criteria
- Placing a valid export triggers a rebuild within the schedule interval.
- The export is removed after a successful run; a failed run leaves it in place
  and logs the reason.
- Idempotent: no file, no action, exit 0.

## Security / privacy
- Only process the exact expected filename; ignore everything else.
- Enforce the validations from Sprint 02 before doing anything with the file.
- No copy of the export is kept anywhere after processing.

---

## Ready-to-use scheduling recipes

### Linux — cron (hourly)
```cron
# crontab -e
0 * * * * cd /path/to/TradeRepublicBoard && /usr/bin/python3 tr_board.py \
  --fi inbox/trade-republic-export.csv --fo out/board.xlsx --auto-prices \
  && rm -f inbox/trade-republic-export.csv >> logs/watcher.log 2>&1
```

### Linux — systemd timer (alternative)
`/etc/systemd/system/trboard.service`
```ini
[Unit]
Description=TradeRepublicBoard ingest
[Service]
Type=oneshot
WorkingDirectory=/path/to/TradeRepublicBoard
ExecStart=/usr/bin/python3 tr_board.py --fi inbox/trade-republic-export.csv --fo out/board.xlsx --auto-prices
```
`/etc/systemd/system/trboard.timer`
```ini
[Unit]
Description=Run TradeRepublicBoard hourly
[Timer]
OnCalendar=hourly
Persistent=true
[Install]
WantedBy=timers.target
```
```bash
systemctl enable --now trboard.timer
```

### Windows — Task Scheduler (hourly)
Save as `scripts/watch.ps1`:
```powershell
$root = "C:\path\to\TradeRepublicBoard"
$csv  = Join-Path $root "inbox\trade-republic-export.csv"
if (Test-Path $csv) {
    & python (Join-Path $root "tr_board.py") --fi $csv --fo (Join-Path $root "out\board.xlsx") --auto-prices
    if ($LASTEXITCODE -eq 0) { Remove-Item $csv -Force }
}
```
Register it to run every hour:
```powershell
$act = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File C:\path\to\TradeRepublicBoard\scripts\watch.ps1"
$trg = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "TradeRepublicBoard" -Action $act -Trigger $trg
```
