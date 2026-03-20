import { getHistoricalRates } from "dukascopy-node";
import type { DownloadRes, HistoricalRatesOptions } from "./types";

export const downloadInstrumentData = async (
  instrument: string,
  dates: { from: Date; to: Date },
): Promise<DownloadRes> => {
  const _instrument =
    instrument.toLowerCase() as HistoricalRatesOptions["instrument"];

  try {
    const data = await getHistoricalRates({
      instrument: _instrument,
      dates,
      timeframe: "tick",
      format: "array",
      // Fewer parallel URLs per day + longer pauses → less rate limiting (429).
      batchSize: 4,
      pauseBetweenBatchesMs: 4000,
      // Per-request HTTP retries (status / thrown fetch errors only).
      // Do NOT set retryOnEmpty: true — dukascopy-node uses Content-Length for
      // “empty”; chunked responses often omit it (see dukascopy patch + README).
      retryCount: 8,
      retryOnEmpty: false,
      pauseBetweenRetriesMs: 2000,
    });

    return { data };
  } catch (error) {
    return { err: error as Error };
  }
};

export const isRetryableNetworkError = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as {
    code?: unknown;
    cause?: unknown;
    message?: unknown;
  };
  if (anyErr.code === "UND_ERR_SOCKET") return true;
    if (typeof anyErr.message === "string") {
      const m = anyErr.message;
      if (m === "Unknown error") return true;
      if (/^HTTP (429|5\d\d)\b/.test(m)) return true;
      if (/socket|network|fetch|timeout|ECONNRESET|ECONNREFUSED|ETIMEDOUT/i.test(m))
        return true;
    }
  if (!anyErr.cause || typeof anyErr.cause !== "object") return false;
  const anyCause = anyErr.cause as { code?: unknown };
  return anyCause.code === "UND_ERR_SOCKET";
};
