import { config } from "./config";
import { parseCliArgv, cliUsage } from "./cli";
import { run } from "./run";

const pad2 = (n: number) => String(n).padStart(2, "0");
const todayDdMmYyyy = () => {
  const d = new Date();
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const args = process.argv.slice(2);

try {
  const parsed = parseCliArgv(args);
  if (!parsed.instruments?.length) {
    throw new Error(
      "Missing or empty --i <instruments> (comma-separated, required)",
    );
  }
  const maxWorkers = parsed.maxWorkers ?? 1;
  const instruments = parsed.instruments;
  const from = (parsed.from ?? "01/01/2000").trim();
  const to = (parsed.to ?? todayDdMmYyyy()).trim();

  await run({ ...config, maxWorkers, instruments, from, to });
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  console.error(cliUsage.trimEnd());
  process.exit(1);
}
