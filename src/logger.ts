import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

type LogLevel = "info" | "warn" | "error";

const pad2 = (n: number) => String(n).padStart(2, "0");

const timestamp = () => {
  const d = new Date();
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    ` ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
};

const formatValueLines = (v: unknown): string[] => {
  if (v === null || v === undefined) return ["(none)"];
  if (typeof v === "string") return v.split("\n");
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint")
    return [String(v)];
  if (Array.isArray(v)) return [JSON.stringify(v)];
  return [JSON.stringify(v)];
};

const formatExtraHuman = (extra: unknown, indent: string): string => {
  if (extra === undefined) return "";
  if (extra === null) return `${indent}(null)\n`;
  if (typeof extra !== "object" || Array.isArray(extra)) {
    return `${indent}${String(extra)}\n`;
  }
  const o = extra as Record<string, unknown>;
  const lines: string[] = [];
  for (const [k, val] of Object.entries(o)) {
    const parts = formatValueLines(val);
    if (parts.length === 1) lines.push(`${indent}${k}: ${parts[0]}`);
    else {
      lines.push(`${indent}${k}:`);
      for (const p of parts) lines.push(`${indent}  ${p}`);
    }
  }
  if (lines.length === 0) return "";
  return lines.join("\n") + "\n";
};

export class Logger {
  readonly filePath: string;

  constructor(
    filePath: string,
    private readonly consoleLabel?: string,
  ) {
    this.filePath = filePath;
  }

  private formatRecord(
    level: LogLevel,
    message: string,
    extra?: unknown,
  ): string {
    const ts = timestamp();
    const levelStr = level.toUpperCase().padEnd(5, " ");
    const head = `[${ts}] ${levelStr} `;
    const msgLines = message.split("\n");
    let out = head + msgLines[0] + "\n";
    const pad = " ".repeat(head.length);
    for (let i = 1; i < msgLines.length; i++) {
      out += pad + msgLines[i] + "\n";
    }
    const ex = formatExtraHuman(extra, pad);
    if (ex) out += ex;
    return out;
  }

  private async write(level: LogLevel, message: string, extra?: unknown) {
    const record = this.formatRecord(level, message, extra);
    const consoleText = this.consoleLabel
      ? record
          .trimEnd()
          .split("\n")
          .map((l) => `[${this.consoleLabel}] ${l}`)
          .join("\n")
      : record.trimEnd();

    if (level === "error") console.error(consoleText);
    else if (level === "warn") console.warn(consoleText);
    else console.log(consoleText);

    await mkdir(path.dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, record, "utf8");
  }

  info(message: string, extra?: unknown) {
    return this.write("info", message, extra);
  }

  warn(message: string, extra?: unknown) {
    return this.write("warn", message, extra);
  }

  error(message: string, extra?: unknown) {
    return this.write("error", message, extra);
  }
}
