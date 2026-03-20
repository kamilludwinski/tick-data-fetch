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

Pass the path to **one** log file (typically `logs/run-eurusd-….log`). The instrument is inferred from the filename when using the new format; legacy logs still parse the instrument from each line. **From / to** are read from the run configuration block (or legacy `run started` JSON).

Prints **Total Days / Weekdays / Weekends** with **actual (from calendar)** vs **downloaded** (from log `saved` lines). Calendar counts use the same UTC half-open range as the fetcher (`[from, to)`). Also prints **total rows**, **average rows per day**, and **empty workdays**. Exits with code `1` if any workday has zero rows.

Pass **`--v`** to list each empty workday; without it you only see the count.

```bash
npm run stats -- logs/run-eurusd-1774011778078.log
npm run stats -- logs/run-eurusd-1774011778078.log --v
```

## Persistence

Data is written to `./data/<instrument>/<year>/<month>/<day>.jsonl`.
