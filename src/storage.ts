import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "./static";
import type { DayKey } from "./dates";

export type TickRow = [
  timestampMs: number,
  ask: number,
  bid: number,
  askVolume: number,
  bidVolume: number,
];

export const isTickRow = (v: unknown): v is TickRow =>
  Array.isArray(v) &&
  v.length >= 1 &&
  typeof v[0] === "number" &&
  Number.isFinite(v[0]);

/** Turns `getHistoricalRates` output into rows: array ticks and `{ timestamp, askPrice, … }` objects. */
export const rowsFromApiData = (data: unknown): TickRow[] => {
  if (!Array.isArray(data)) return [];
  const out: TickRow[] = [];
  for (const v of data) {
    if (isTickRow(v)) {
      out.push(v as TickRow);
      continue;
    }
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const o = v as Record<string, unknown>;
    const ts = o.timestamp;
    const ask = o.askPrice;
    const bid = o.bidPrice;
    if (
      typeof ts !== "number" ||
      !Number.isFinite(ts) ||
      typeof ask !== "number" ||
      !Number.isFinite(ask) ||
      typeof bid !== "number" ||
      !Number.isFinite(bid)
    ) {
      continue;
    }
    const av = o.askVolume;
    const bv = o.bidVolume;
    out.push([
      ts,
      ask,
      bid,
      typeof av === "number" && Number.isFinite(av) ? av : 0,
      typeof bv === "number" && Number.isFinite(bv) ? bv : 0,
    ]);
  }
  return out;
};

const CSV_HEADER = "timestamp_ms,ask,bid,ask_volume,bid_volume";

const tickRowToCsvLine = (r: TickRow): string => {
  const ask = r[1];
  const bid = r[2];
  const av = r[3];
  const bv = r[4];
  return [
    r[0],
    ask !== undefined && Number.isFinite(ask) ? ask : "",
    bid !== undefined && Number.isFinite(bid) ? bid : "",
    av !== undefined && Number.isFinite(av) ? av : "",
    bv !== undefined && Number.isFinite(bv) ? bv : "",
  ].join(",");
};

export const saveDayCsv = async (opts: {
  instrument: string;
  day: DayKey;
  rows: TickRow[];
}) => {
  const dir = path.join(
    dataDir,
    opts.instrument,
    opts.day.yyyy,
    opts.day.mm,
    opts.day.dd,
  );
  await mkdir(dir, { recursive: true });
  const body = opts.rows.map((r) => tickRowToCsvLine(r)).join("\n");
  const content =
    body.length > 0 ? `${CSV_HEADER}\n${body}\n` : `${CSV_HEADER}\n`;
  await writeFile(path.join(dir, `${opts.instrument}.csv`), content, "utf8");
};
