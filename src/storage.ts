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

export const saveDayJsonl = async (opts: {
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
  const jsonl = opts.rows.length
    ? opts.rows.map((r) => JSON.stringify(r)).join("\n") + "\n"
    : "";
  await writeFile(path.join(dir, `${opts.instrument}.jsonl`), jsonl);
};
