import path from "node:path";
import type { AppConfig } from "./config";
import { Logger } from "./logger";
import { WorkerGroup } from "./workerGroup";
import { downloadInstrumentData } from "./dukascopy";
import { withRetry, normalizeError } from "./retry";
import {
  addUtcDays,
  parseDdMmYyyyUtc,
  startOfUtcDay,
  toUtcDayKey,
} from "./dates";
import { rowsFromApiData, saveDayCsv } from "./storage";
import { logsDir } from "./static";

const runConfigMessage = (
  cfg: AppConfig,
  instrument: string,
  from: Date,
  to: Date,
) =>
  [
    "Run configuration",
    `  instruments (all):  ${cfg.instruments.join(", ")}`,
    `  instrument (file):  ${instrument}`,
    `  date from:           ${cfg.from}  →  ${from.toISOString()}`,
    `  date to:             ${cfg.to}  →  ${to.toISOString()}`,
    `  max workers:         ${cfg.maxWorkers}`,
    `  max attempts:        ${cfg.maxAttempts}`,
    `  base delay (ms):     ${cfg.baseDelayMs}`,
    `${"-".repeat(44)}`,
  ].join("\n");

export async function run(cfg: AppConfig) {
  const from = parseDdMmYyyyUtc(cfg.from);
  const to = parseDdMmYyyyUtc(cfg.to);

  const runId = Date.now();
  const loggers = new Map<string, Logger>();
  for (const instrument of cfg.instruments) {
    const file = path.join(logsDir, `run-${instrument}-${runId}.log`);
    loggers.set(instrument, new Logger(file, instrument));
  }

  await Promise.all(
    cfg.instruments.map((inst) =>
      loggers.get(inst)!.info(runConfigMessage(cfg, inst, from, to)),
    ),
  );

  const wg = new WorkerGroup(cfg.maxWorkers);

  for (
    let dayStart = startOfUtcDay(from), end = startOfUtcDay(to);
    dayStart < end;
    dayStart = addUtcDays(dayStart, 1)
  ) {
    const dayStartCopy = new Date(dayStart.getTime());
    const nextDay = addUtcDays(dayStartCopy, 1);
    const day = toUtcDayKey(dayStartCopy.getTime());
    const dayLabel = `${day.yyyy}-${day.mm}-${day.dd}`;

    for (const instrument of cfg.instruments) {
      const logger = loggers.get(instrument)!;
      wg.run(async () => {
        await logger.info(`${dayLabel}  start`);
        const res = await withRetry({
          maxAttempts: cfg.maxAttempts,
          baseDelayMs: cfg.baseDelayMs,
          dayLabel,
          logger,
          fn: () =>
            downloadInstrumentData(instrument, {
              from: dayStartCopy,
              to: nextDay,
            }),
        });
        if (res.err) {
          await logger.error(`${dayLabel}  failed`, normalizeError(res.err));
          return;
        }

        const rows = rowsFromApiData(res.data);
        await saveDayCsv({ instrument, day, rows });
        await logger.info(`${dayLabel}  saved  ${rows.length} rows`);
      });
    }
  }

  await wg.Done();
  await Promise.all(
    cfg.instruments.map((inst) => loggers.get(inst)!.info("Run finished")),
  );
}
