import { config } from './config';
import { run } from './run';

const pad2 = (n: number) => String(n).padStart(2, '0');
const todayDdMmYyyy = () => {
	const d = new Date();
	return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const parseInstrumentsArg = (arg: string | undefined): string[] => {
	if (!arg) return config.instruments;
	const instruments = arg
		.split(',')
		.map(s => s.trim())
		.filter(Boolean);
	return instruments.length ? instruments : config.instruments;
};

// Usage:
// npm run start -- "eurusd,gbpusd" "01/01/2000" "18/03/2026"
const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;

const instruments = parseInstrumentsArg(args[0]);
const from = (args[1] ?? '01/01/2000').trim();
const to = (args[2] ?? todayDdMmYyyy()).trim();

await run({ ...config, instruments, from, to });

