import { readFile, readdir, stat } from "node:fs/promises";
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

type CalendarStats = { total: number; workdays: number; weekends: number };

function calendarExpectedStats(
	fromIso: string,
	toIso: string,
): CalendarStats | null {
	const from = new Date(fromIso);
	const to = new Date(toIso);
	if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;

	const start = startOfUtcDay(from);
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

type FileStats = {
	logPath: string;
	inferredInstrument: string | null;
	range: ParsedRange | null;
	calendarStats: CalendarStats | null;
	savedCount: number;
	workdays: number;
	weekends: number;
	totalRows: number;
	emptyWeekday: { date: string; instrument: string; weekday: string }[];
};

async function analyzeLogFile(logPath: string): Promise<FileStats> {
	const text = await readFile(logPath, "utf8");
	const inferredInstrument = instrumentFromLogFilename(logPath);
	const range = extractDateRange(text);
	const calendarStats =
		range != null ? calendarExpectedStats(range.fromIso, range.toIso) : null;

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

	return {
		logPath,
		inferredInstrument,
		range,
		calendarStats,
		savedCount,
		workdays,
		weekends,
		totalRows,
		emptyWeekday,
	};
}

function sumCalendar(files: FileStats[]): CalendarStats | null {
	let n = 0;
	let total = 0;
	let workdays = 0;
	let weekends = 0;
	for (const f of files) {
		if (!f.calendarStats) continue;
		n++;
		total += f.calendarStats.total;
		workdays += f.calendarStats.workdays;
		weekends += f.calendarStats.weekends;
	}
	return n > 0 ? { total, workdays, weekends } : null;
}

async function listLogFiles(logsDir: string): Promise<string[]> {
	const entries = await readdir(logsDir, { withFileTypes: true });
	const files: string[] = [];
	for (const e of entries) {
		if (!e.isFile() || !e.name.endsWith(".log")) continue;
		files.push(path.join(logsDir, e.name));
	}
	files.sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
	return files;
}

function printResults(opts: {
	aggregated: boolean;
	logsDir?: string;
	files: FileStats[];
	calendarStats: CalendarStats | null;
	savedCount: number;
	workdays: number;
	weekends: number;
	totalRows: number;
	emptyWeekday: { date: string; instrument: string; weekday: string }[];
	verbose: boolean;
}) {
	const {
		aggregated,
		logsDir,
		files,
		calendarStats,
		savedCount,
		workdays,
		weekends,
		totalRows,
		emptyWeekday,
		verbose,
	} = opts;

	if (aggregated) {
		console.log(`Aggregated ${files.length} log files in ${logsDir}`);
		for (const f of files) {
			console.log(`  ${f.logPath}`);
		}
		console.log(
			"Calendar “actual” totals are summed per file (each run’s configured range).",
		);
		console.log("");
	} else {
		const one = files[0];
		console.log(`Using log file: ${one.logPath}`);
		if (one.inferredInstrument)
			console.log(`Instrument (from filename): ${one.inferredInstrument}`);

		const range = one.range;
		if (range?.kind === "config") {
			console.log(`From: ${range.fromDd}  (${range.fromIso})`);
			console.log(`To:   ${range.toDd}  (${range.toIso})`);
		} else if (range?.kind === "legacy") {
			console.log(`From: ${range.fromIso}`);
			console.log(`To:   ${range.toIso}`);
		} else {
			console.log("From / to: (not found in log)");
		}
	}

	const cal = (n: number | null | undefined) =>
		calendarStats != null && n != null ? String(n) : "n/a";

	const avgRows =
		savedCount > 0 ? (totalRows / savedCount).toFixed(2) : "n/a";

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
		emptyWeekday.sort((a, b) => {
			const c = a.date.localeCompare(b.date);
			return c !== 0 ? c : a.instrument.localeCompare(b.instrument);
		});
		if (verbose) {
			console.log("");
			for (const e of emptyWeekday) {
				console.log(`  ${e.date} (${e.weekday} UTC)  ${e.instrument}`);
			}
		}
	}
}

async function main() {
	const argv = process.argv.slice(2);
	const verbose = argv.includes("--v");
	const posArgs = argv.filter((a) => a !== "--v");
	const logPathArg = posArgs[0];

	let files: FileStats[];
	let aggregated = false;
	const logsDir = path.resolve(process.cwd(), "logs");

	if (logPathArg) {
		const logPath = path.resolve(logPathArg);
		try {
			files = [await analyzeLogFile(logPath)];
		} catch (e) {
			console.error(e instanceof Error ? e.message : e);
			process.exit(2);
		}
	} else {
		let dirStat;
		try {
			dirStat = await stat(logsDir);
		} catch {
			console.error(
				`Cannot aggregate: logs directory does not exist (${logsDir}).`,
			);
			process.exit(2);
		}
		if (!dirStat.isDirectory()) {
			console.error(`Cannot aggregate: not a directory (${logsDir}).`);
			process.exit(2);
		}

		const paths = await listLogFiles(logsDir);
		if (paths.length === 0) {
			console.error(`Cannot aggregate: no .log files in ${logsDir}.`);
			process.exit(2);
		}

		aggregated = true;
		files = [];
		for (const p of paths) {
			try {
				files.push(await analyzeLogFile(p));
			} catch (e) {
				console.error(`${p}: ${e instanceof Error ? e.message : e}`);
				process.exit(2);
			}
		}
	}

	let savedCount = 0;
	let workdays = 0;
	let weekends = 0;
	let totalRows = 0;
	const allEmpty: FileStats["emptyWeekday"] = [];
	for (const f of files) {
		savedCount += f.savedCount;
		workdays += f.workdays;
		weekends += f.weekends;
		totalRows += f.totalRows;
		allEmpty.push(...f.emptyWeekday);
	}

	const calendarStats = aggregated ? sumCalendar(files) : files[0]?.calendarStats ?? null;

	printResults({
		aggregated,
		logsDir: aggregated ? logsDir : undefined,
		files,
		calendarStats,
		savedCount,
		workdays,
		weekends,
		totalRows,
		emptyWeekday: allEmpty,
		verbose,
	});

	process.exit(allEmpty.length > 0 ? 1 : 0);
}

await main();
