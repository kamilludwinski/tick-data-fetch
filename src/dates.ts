export type DayKey = { yyyy: string; mm: string; dd: string };

export const toUtcDayKey = (timestampMs: number): DayKey => {
  const d = new Date(timestampMs);
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return { yyyy, mm, dd };
};

export const parseDdMmYyyyUtc = (s: string): Date => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) throw new Error(`Invalid date "${s}". Expected dd/mm/yyyy.`);
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  return new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0, 0));
};

export const startOfUtcDay = (d: Date) =>
  new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );

export const addUtcDays = (d: Date, days: number) =>
  new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() + days,
      0,
      0,
      0,
      0,
    ),
  );
