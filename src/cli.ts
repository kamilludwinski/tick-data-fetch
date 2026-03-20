export type ParsedCliFlags = {
  maxWorkers?: number;
  instruments?: string[];
  from?: string;
  to?: string;
};

export const cliUsage = `Usage:
  npx tsx src/main.ts [--w <workers>] --i <instruments> [--from <from>] [--to <to>]

Required: --i <instruments> (comma-separated). Dates are dd/mm/yyyy.
Optional: --w (default 1), --from (default 01/01/2000), --to (default today).

Example:
  npx tsx src/main.ts --w 4 --i eurusd,gbpusd --from 01/01/2000 --to 18/03/2026
`;

function parseNonNegativeInt(flag: string, raw: string | undefined): number {
  if (raw === undefined) throw new Error(`${flag}: missing value`);
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(
      `${flag}: expected a non-negative integer, got ${JSON.stringify(raw)}`,
    );
  }
  return n;
}

function parseInstrumentsValue(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseCliArgv(argv: string[]): ParsedCliFlags {
  let maxWorkers: number | undefined;
  let instruments: string[] | undefined;
  let from: string | undefined;
  let to: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      console.log(cliUsage);
      process.exit(0);
    }

    const takeValue = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) {
        throw new Error(`Missing value after ${a}`);
      }
      return v;
    };

    if (a === "--w") maxWorkers = parseNonNegativeInt("--w", takeValue());
    else if (a === "--i") {
      const raw = takeValue();
      const list = parseInstrumentsValue(raw);
      if (list.length) instruments = list;
    } else if (a === "--from") from = takeValue().trim();
    else if (a === "--to") to = takeValue().trim();
    else throw new Error(`Unknown argument: ${a}`);
  }

  const out: ParsedCliFlags = {};
  if (maxWorkers !== undefined) out.maxWorkers = maxWorkers;
  if (instruments !== undefined) out.instruments = instruments;
  if (from !== undefined) out.from = from;
  if (to !== undefined) out.to = to;
  return out;
}
