import type { TenantConfig } from "./contract";

export interface Formatters {
  money: (amount: number) => string;
  /** In `locale.secondaryCurrency`, or null when the tenant has none. */
  secondaryMoney: (amount: number) => string | null;
  /** A YYYY-MM-DD calendar date. */
  day: (date: string) => string;
  /** A timestamp, in the tenant's timezone. */
  dateTime: (iso: string) => string;
  number: (value: number) => string;
  distance: (value: number) => string;
  percent: (ratio: number) => string;
}

/** Formatters from the tenant's locale: currency, date locale, timezone, distance unit. */
export function createFormatters(config: TenantConfig): Formatters {
  const { dateLocale, currency, secondaryCurrency, timezone, distanceUnit } = config.locale;
  const money = new Intl.NumberFormat(dateLocale, { style: "currency", currency, maximumFractionDigits: 0 });
  const secondary = secondaryCurrency
    ? new Intl.NumberFormat(dateLocale, { style: "currency", currency: secondaryCurrency, maximumFractionDigits: 0 })
    : null;
  // Calendar dates are UTC midnight, so they're formatted in UTC to keep the day.
  const day = new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const dateTime = new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone });
  const number = new Intl.NumberFormat(dateLocale);
  return {
    money: (amount) => money.format(amount),
    secondaryMoney: (amount) => secondary?.format(amount) ?? null,
    day: (date) => day.format(new Date(`${date}T00:00:00Z`)),
    dateTime: (iso) => dateTime.format(new Date(iso)),
    number: (value) => number.format(value),
    distance: (value) => `${number.format(value)} ${distanceUnit}`,
    percent: (ratio) => `${Math.round(ratio * 100)}%`,
  };
}
