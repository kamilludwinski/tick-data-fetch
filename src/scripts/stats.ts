import { readFile } from "node:fs/promises";
import path from "node:path";
import { addUtcDays, startOfUtcDay } from "../dates";

const savedReNew =
	/\] INFO\s+(\d{4}-\d{2}-\d{2})\s+saved\s+(\d+)\s+rows/;
const savedReLegacy =
  /\[INFO\] \[(\d{4}-\d{2}-\d{2})\] \[([^\]]+)\] saved \{"rows":(\d+)\}/;

const isUtcWeekend = (ymd: string): boolean => {
  const [y, m, d] = ymd.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 || wd === 6;
};

const weekdayNameUtc = (ymd: string): string => {
  const [y, m, d] = ymd.split("-").map(Number);
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return names[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? "?";
};

function instrumentFromLogFilename(filePath: string): string | null {
  const base = path.basename(filePath);
  const m = /^run-(.+)-\d+\.log$/i.exec(base);
  return m ? m[1] : null;
}

type ParsedRange =
  | { kind: "config"; fromDd: string; fromIso: string; toDd: string; toIso: string }
  | { kind: "legacy"; fromIso: string; toIso: string };

function extractDateRange(text: string): ParsedRange | null {
  const fromM = /date from:\s+(\d{2}\/\d{2}\/\d{4})\s+→\s+(\S+)/.exec(text);
  const toM = /date to:\s+(\d{2}\/\d{2}\/\d{4})\s+→\s+(\S+)/.exec(text);
  if (fromM && toM) {
    return {
      kind: "config",
      fromDd: fromM[1],
      fromIso: fromM[2],
      toDd: toM[1],
      toIso: toM[2],
    };
  }

  const i = text.indexOf("run started");
  if (i !== -1) {
    const slice = text.slice(i, i + 800);
    const fromIso = /"from"\s*:\s*"([^"]+)"/.exec(slice);
    const toIso = /"to"\s*:\s*"([^"]+)"/.exec(slice);
    if (fromIso && toIso) {
      return { kind: "legacy", fromIso: fromIso[1], toIso: toIso[1] };
    }
  }

  return null;
}

function calendarExpectedStats(
  fromIso: string,
  toIso: string,
):
  | { total: number; workdays: number; weekends: number }
  | null {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;

  let start = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  if (start >= end) return { total: 0, workdays: 0, weekends: 0 };

  let total = 0;
  let workdays = 0;
  let weekends = 0;
  for (let d = start; d < end; d = addUtcDays(d, 1)) {
    total++;
    const wd = d.getUTCDay();
    if (wd === 0 || wd === 6) weekends++;
    else workdays++;
  }
  return { total, workdays, weekends };
}

async function main() {
  const argv = process.argv.slice(2);
  const verbose = argv.includes("--v");
  const posArgs = argv.filter((a) => a !== "--v");
  const logPathArg = posArgs[0];

  if (!logPathArg) {
    console.error("Usage: npx tsx src/scripts/stats.ts <log-file> [--v]");
    process.exit(2);
  }

  const logPath = path.resolve(logPathArg);
  const inferredInstrument = instrumentFromLogFilename(logPath);

  let text: string;
  try {
    text = await readFile(logPath, "utf8");
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(2);
  }

  console.log(`Using log file: ${logPath}`);
  if (inferredInstrument)
    console.log(`Instrument (from filename): ${inferredInstrument}`);

  const range = extractDateRange(text);
  if (range?.kind === "config") {
    console.log(`From: ${range.fromDd}  (${range.fromIso})`);
    console.log(`To:   ${range.toDd}  (${range.toIso})`);
  } else if (range?.kind === "legacy") {
    console.log(`From: ${range.fromIso}`);
    console.log(`To:   ${range.toIso}`);
  } else {
    console.log("From / to: (not found in log)");
  }

  const lines = text.split(/\r?\n/);

  let totalRows = 0;
  let savedCount = 0;
  let workdays = 0;
  let weekends = 0;
  const emptyWeekday: { date: string; instrument: string; weekday: string }[] =
    [];

  for (const line of lines) {
    const newM = savedReNew.exec(line);
    if (newM) {
      const date = newM[1];
      const rows = Number.parseInt(newM[2], 10);
      if (!Number.isFinite(rows)) continue;
      const instrument = inferredInstrument ?? "unknown";
      savedCount++;
      totalRows += rows;
      if (isUtcWeekend(date)) weekends++;
      else workdays++;
      if (rows !== 0) continue;
      if (!isUtcWeekend(date))
        emptyWeekday.push({
          date,
          instrument,
          weekday: weekdayNameUtc(date),
        });
      continue;
    }

    const leg = savedReLegacy.exec(line);
    if (!leg) continue;
    const date = leg[1];
    const instrument = leg[2];
    const rows = Number.parseInt(leg[3], 10);
    if (!Number.isFinite(rows)) continue;
    savedCount++;
    totalRows += rows;
    if (isUtcWeekend(date)) weekends++;
    else workdays++;
    if (rows !== 0) continue;
    if (!isUtcWeekend(date))
      emptyWeekday.push({
        date,
        instrument,
        weekday: weekdayNameUtc(date),
      });
  }

  const avgRows = savedCount > 0 ? (totalRows / savedCount).toFixed(2) : "n/a";

  const calendarStats =
    range != null ? calendarExpectedStats(range.fromIso, range.toIso) : null;

  const cal = (n: number | null | undefined) =>
    calendarStats != null && n != null ? String(n) : "n/a";

  console.log("Total Days:");
  console.log(
    `  actual: ${cal(calendarStats?.total)} | downloaded: ${savedCount}`,
  );
  console.log("Weekdays:");
  console.log(
    `  actual: ${cal(calendarStats?.workdays)} | downloaded: ${workdays}`,
  );
  console.log("Weekends:");
  console.log(
    `  actual: ${cal(calendarStats?.weekends)} | downloaded: ${weekends}`,
  );
  console.log(`Total rows downloaded: ${totalRows}`);
  console.log(`Average rows per day: ${avgRows}`);
  console.log(
    `Empty workdays (0 rows): ${emptyWeekday.length}` +
      (verbose && emptyWeekday.length ? " (listed below)" : ""),
  );

  if (emptyWeekday.length) {
    emptyWeekday.sort((a, b) => a.date.localeCompare(b.date));
    if (verbose) {
      console.log("");
      for (const e of emptyWeekday) {
        console.log(`  ${e.date} (${e.weekday} UTC)  ${e.instrument}`);
      }
    }
    process.exit(1);
  }

  process.exit(0);
}

await main();
