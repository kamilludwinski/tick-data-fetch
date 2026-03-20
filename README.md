# Tick data fetch
Wrapper for dukascopy node to fetch tick data for financial instruments.
It uses a workerGroup to speed up the process, as downloading big ranges can take an enormous amount of time.

# Dependencies
Install dependencies with:
```bash
npm i
```

# Usage 

```bash
 ./run.sh -- <instruments> <date_from> <date_to>
```

where:
- **instruments** is a comma separated instrument list, example: **eurusd,gbpusd**
Make sure there is no spaces in the input, example: **01/01/2000**
- **date_from** is DD/MM/YYYY date from, example: **18/03/2026**
- **date_to** is DD/MM/YYYY to date

if **date_from** and **date_to** are not provided, defaults are used:
- **date_from** - 01/01/2000
- **date_to** - current date (script execution)

# Persistence
Data is saved to ./data/**instrument**/**year**/**month**/**day**.jsonl
