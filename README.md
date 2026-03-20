# Tick data fetch

Wrapper for [dukascopy-node](https://www.npmjs.com/package/dukascopy-node) to fetch tick data for financial instruments. Work is parallelised with a worker pool so large date ranges finish sooner.

## Dependencies

```bash
npm i
```

## Usage

Flags:

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--i` | **yes** | — | Comma-separated instruments, e.g. `eurusd,gbpusd` (no spaces inside the list) |
| `--w` | no | `1` | Max concurrent workers |
| `--from` | no | `01/01/2000` | Start date `dd/mm/yyyy` |
| `--to` | no | today | End date `dd/mm/yyyy` |

Run with the shell script:

```bash
./run.sh --i eurusd,gbpusd --from 01/01/2000 --to 18/03/2026
```

CLI help:

```bash
npm run help
```

## Persistence

Data is written to `./data/<instrument>/<year>/<month>/<day>.jsonl`.
