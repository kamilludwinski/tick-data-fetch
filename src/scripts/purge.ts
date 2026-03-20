import { rm } from "node:fs/promises";
import { dataDir, logsDir } from "../static";

await rm(dataDir, { recursive: true, force: true });
await rm(logsDir, { recursive: true, force: true });
