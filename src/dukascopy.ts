import { getHistoricalRates } from 'dukascopy-node';
import type { DownloadRes, HistoricalRatesOptions } from './types';

export const downloadInstrumentData = async (
	instrument: string,
	dates: { from: Date; to: Date }
): Promise<DownloadRes> => {
	const _instrument = instrument.toLowerCase() as HistoricalRatesOptions['instrument'];

	try {
		const data = await getHistoricalRates({
			instrument: _instrument,
			dates,
			timeframe: 'tick',
			batchSize: 15,
			pauseBetweenBatchesMs: 2000
		});

		return { data };
	} catch (error) {
		return { err: error as Error };
	}
};

export const isRetryableNetworkError = (err: unknown): boolean => {
	if (!err || typeof err !== 'object') return false;
	const anyErr = err as { code?: unknown; cause?: unknown };
	if (anyErr.code === 'UND_ERR_SOCKET') return true;
	if (!anyErr.cause || typeof anyErr.cause !== 'object') return false;
	const anyCause = anyErr.cause as { code?: unknown };
	return anyCause.code === 'UND_ERR_SOCKET';
};

