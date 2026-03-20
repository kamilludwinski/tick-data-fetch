# Tick data fetch

Wrapper for [dukascopy-node](https://www.npmjs.com/package/dukascopy-node) to fetch tick data for financial instruments. Work is parallelised with a worker pool so large date ranges finish sooner.

## Dependencies

```bash
npm i
```

## Usage

Flags:

| Flag     | Required | Default      | Description                                                                   |
| -------- | -------- | ------------ | ----------------------------------------------------------------------------- |
| `--i`    | **yes**  | —            | Comma-separated instruments, e.g. `eurusd,gbpusd` (no spaces inside the list) |
| `--w`    | no       | `1`          | Max concurrent workers                                                        |
| `--from` | no       | `01/01/2000` | Start date `dd/mm/yyyy`                                                       |
| `--to`   | no       | today        | End date `dd/mm/yyyy`                                                         |

Run with the shell script:

```bash
./run.sh --i eurusd,gbpusd --from 01/01/2000 --to 18/03/2026
```

CLI help:

```bash
npm run help
```

## Logs

Each instrument gets its own file: `logs/run-<instrument>-<timestamp>.log` (plain, readable lines). The same **run configuration** block is written at the top of every instrument file.

## Log stats

Pass the path to **one** log file (typically `logs/run-eurusd-….log`).

Example output:

```bash
Using log file: c:\Users\kamil\Documents\GitHub\tick-data-fetch\logs\run-eurusd-1774012870969.log
Instrument (from filename): eurusd
From: 01/01/2000  (2000-01-01T00:00:00.000Z)
To:   20/03/2026  (2026-03-20T00:00:00.000Z)
Total Days:
  actual: 9575 | downloaded: 1465
Weekdays:
  actual: 6839 | downloaded: 1047
Weekends:
  actual: 2736 | downloaded: 418
Total rows downloaded: 778265
Average rows per day: 531.24
Empty workdays (0 rows): 930
```

Pass **`--v`** to list each empty workday; without it you only see the count.

```bash
npm run stats -- logs/run-eurusd-1774011778078.log
npm run stats -- logs/run-eurusd-1774011778078.log --v
```

## Persistence

Data is written to `./data/<instrument>/<year>/<month>/<day>.jsonl`.
