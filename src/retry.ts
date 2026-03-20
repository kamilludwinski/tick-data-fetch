import type { Logger } from "./logger";
import type { DownloadRes } from "./types";
import { isRetryableNetworkError } from "./dukascopy";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const normalizeError = (err: unknown) => {
  if (err instanceof Error)
    return { name: err.name, message: err.message, stack: err.stack };
  return { message: String(err) };
};

export const withRetry = async (opts: {
  maxAttempts: number;
  baseDelayMs: number;
  dayLabel: string;
  logger: Logger;
  fn: () => Promise<DownloadRes>;
}): Promise<DownloadRes> => {
  let attempt = 0;
  while (attempt < opts.maxAttempts) {
    attempt++;
    const res = await opts.fn();
    if (!res.err) return res;
    if (!isRetryableNetworkError(res.err) || attempt >= opts.maxAttempts)
      return res;

    const delay = Math.min(30_000, opts.baseDelayMs * 2 ** (attempt - 1));
    await opts.logger.warn(
      `${opts.dayLabel}  retry ${attempt}/${opts.maxAttempts} after ${delay} ms`,
      normalizeError(res.err),
    );
    await sleep(delay);
  }
  return { err: new Error("unreachable") };
};
