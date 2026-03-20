import path from 'node:path';
import type { AppConfig } from './config';
import { Logger } from './logger';
import { WorkerGroup } from './workerGroup';
import { downloadInstrumentData } from './dukascopy';
import { withRetry, normalizeError } from './retry';
import { addUtcDays, parseDdMmYyyyUtc, startOfUtcDay, toUtcDayKey } from './dates';
import { isTickRow, saveDayJsonl } from './storage';

export async function run(cfg: AppConfig) {
	const from = parseDdMmYyyyUtc(cfg.from);
	const to = parseDdMmYyyyUtc(cfg.to);

	const logger = new Logger(path.join('logs', `run-${Date.now()}.log`));
	await logger.info('run started', {
		instruments: cfg.instruments,
		from: from.toISOString(),
		to: to.toISOString(),
		maxWorkers: cfg.maxWorkers,
		maxAttempts: cfg.maxAttempts,
		baseDelayMs: cfg.baseDelayMs
	});

	const wg = new WorkerGroup(cfg.maxWorkers);

	for (
		let dayStart = startOfUtcDay(from), end = startOfUtcDay(to);
		dayStart < end;
		dayStart = addUtcDays(dayStart, 1)
	) {
		const dayStartCopy = new Date(dayStart.getTime());
		const nextDay = addUtcDays(dayStartCopy, 1);
		const day = toUtcDayKey(dayStartCopy.getTime());

		for (const instrument of cfg.instruments) {
			const logPrefix = `[${day.yyyy}-${day.mm}-${day.dd}] [${instrument}]`;
			wg.run(async () => {
				await logger.info(`${logPrefix} start`);
				const res = await withRetry({
					maxAttempts: cfg.maxAttempts,
					baseDelayMs: cfg.baseDelayMs,
					logPrefix,
					logger,
					fn: () => downloadInstrumentData(instrument, { from: dayStartCopy, to: nextDay })
				});
				if (res.err) {
					await logger.error(`${logPrefix} failed`, normalizeError(res.err));
					return;
				}

				const rows = Array.isArray(res.data) ? res.data.filter(isTickRow) : [];
				await saveDayJsonl({ instrument, day, rows });
				await logger.info(`${logPrefix} saved`, { rows: rows.length });
			});
		}
	}

	await wg.Done();
	await logger.info('run finished');
}

