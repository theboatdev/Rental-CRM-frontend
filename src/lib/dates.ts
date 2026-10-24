/** Calendar dates are YYYY-MM-DD strings, as the API sends them. "Today" is the tenant's today, in its timezone. */

const DAY_MS = 86_400_000;

export const todayIn = (timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const toUtc = (date: string) => new Date(`${date}T00:00:00Z`);

export const addDays = (date: string, days: number) => new Date(toUtc(date).getTime() + days * DAY_MS).toISOString().slice(0, 10);

export const daysBetween = (start: string, end: string) => Math.round((toUtc(end).getTime() - toUtc(start).getTime()) / DAY_MS);

/** The YYYY-MM month `offset` months from `month`. */
export function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
