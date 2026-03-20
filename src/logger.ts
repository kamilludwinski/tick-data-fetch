import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

type LogLevel = 'info' | 'warn' | 'error';

const pad2 = (n: number) => String(n).padStart(2, '0');

const timestamp = () => {
	const d = new Date();
	return (
		`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
		` ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
	);
};

export class Logger {
	readonly filePath: string;

	constructor(filePath: string) {
		this.filePath = filePath;
	}

	private async write(level: LogLevel, message: string, extra?: unknown) {
		const line =
			`[${timestamp()}] [${level.toUpperCase()}] ${message}` +
			(extra === undefined ? '' : ` ${safeJson(extra)}`) +
			'\n';

		if (level === 'error') console.error(line.trimEnd());
		else if (level === 'warn') console.warn(line.trimEnd());
		else console.log(line.trimEnd());

		await mkdir(path.dirname(this.filePath), { recursive: true });
		await appendFile(this.filePath, line, 'utf8');
	}

	info(message: string, extra?: unknown) {
		return this.write('info', message, extra);
	}
	warn(message: string, extra?: unknown) {
		return this.write('warn', message, extra);
	}
	error(message: string, extra?: unknown) {
		return this.write('error', message, extra);
	}
}

const safeJson = (v: unknown) => {
	try {
		return JSON.stringify(v);
	} catch {
		return JSON.stringify(String(v));
	}
};

