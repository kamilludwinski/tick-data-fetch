export type AppConfig = {
  instruments: string[];
  from: string; // dd/mm/yyyy
  to: string; // dd/mm/yyyy
  maxWorkers: number;
  maxAttempts: number;
  baseDelayMs: number;
};

export const config: Omit<AppConfig, "instruments"> = {
  from: "01/01/2004",
  to: "18/03/2026",
  maxWorkers: 8,
  maxAttempts: 5,
  baseDelayMs: 750,
};
