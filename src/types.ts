import type { getHistoricalRates } from "dukascopy-node";

export type HistoricalRatesOptions = Parameters<typeof getHistoricalRates>[0];

export type DownloadRes = {
  data?: unknown;
  err?: Error;
};
