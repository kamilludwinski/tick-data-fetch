import { rm } from 'node:fs/promises';
import { dataDir } from './static';

export async function purgeData(): Promise<void> {
	await rm(dataDir, { recursive: true, force: true });
}