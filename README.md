# Tick data fetch

Wrapper for [dukascopy-node](https://www.npmjs.com/package/dukascopy-node) to fetch tick data for financial instruments. Work is parallelised with a worker pool so large date ranges finish sooner.

## Dependencies

```bash
npm i
```

`postinstall` runs [**patch-package**](https://github.com/ds300/patch-package) to apply `patches/dukascopy-node+1.46.4.patch`: when a Dukascopy HTTP response is not 200, **dukascopy-node** used to throw `Error("Unknown error")` because it never set a message. The patch sets `errorMsg` to `HTTP <status>` so logs and retries can treat **429 / 5xx** correctly.

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


## Log stats

With **no path**, all **`*.log`** files under **`./logs`** are read (sorted by filename) and **metrics are summed** (downloaded days, rows, empty workdays). Calendar **actual** values are the **sum** of each file’s configured range (one row per run). A short note is printed so that’s explicit.

With a **path**, only that log is analyzed (same as before).

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
npm run stats
npm run stats -- --v
npm run stats -- logs/run-eurusd-1774011778078.log
npm run stats -- logs/run-eurusd-1774011778078.log --v
```

## Persistence

Data is written to `./data/<instrument>/<year>/<month>/<day>/<instrument>.csv`.

The client enables **retries on empty batches** (`retryOnEmpty` in dukascopy-node); very high `--w` can still increase empty days—retry a narrower range or fewer workers if needed.
