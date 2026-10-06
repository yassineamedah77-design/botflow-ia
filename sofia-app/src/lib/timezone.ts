/**
 * Calendar arithmetic in an establishment's time zone. Dates are stored as
 * UTC instants; days, weeks and months are always those of the establishment
 * (Europe/Paris, Europe/Lisbon…), daylight saving time included.
 */

/** Wall-clock time of `date` in `timeZone`, read back as if it were UTC (epoch ms). */
export function zonedWallClock(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
}

export interface ZonedParts {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  /** ISO weekday: 1 = Monday … 7 = Sunday. */
  weekday: number;
  hour: number;
  minute: number;
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const wallClock = new Date(zonedWallClock(date, timeZone));
  const weekday = wallClock.getUTCDay();
  return {
    year: wallClock.getUTCFullYear(),
    month: wallClock.getUTCMonth() + 1,
    day: wallClock.getUTCDate(),
    weekday: weekday === 0 ? 7 : weekday,
    hour: wallClock.getUTCHours(),
    minute: wallClock.getUTCMinutes(),
  };
}

/**
 * UTC instant of a wall-clock time in `timeZone`. Out-of-range values roll
 * over (day 32 → next month), which makes day arithmetic simple.
 */
export function zonedTimeToUtc(
  { year, month, day, hour = 0, minute = 0 }: { year: number; month: number; day: number; hour?: number; minute?: number },
  timeZone: string,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes: the offset can differ on either side of a DST change.
  const firstGuess = naive - (zonedWallClock(new Date(naive), timeZone) - naive);
  return new Date(naive - (zonedWallClock(new Date(firstGuess), timeZone) - firstGuess));
}

/** Local midnight of the day containing `date`, moved by `addDays` days. */
export function startOfZonedDay(date: Date, timeZone: string, addDays = 0): Date {
  const { year, month, day } = zonedParts(date, timeZone);
  return zonedTimeToUtc({ year, month, day: day + addDays }, timeZone);
}

/** Local midnight of the Monday of the week containing `date`, moved by `addWeeks` weeks. */
export function startOfZonedWeek(date: Date, timeZone: string, addWeeks = 0): Date {
  const { year, month, day, weekday } = zonedParts(date, timeZone);
  return zonedTimeToUtc({ year, month, day: day - (weekday - 1) + addWeeks * 7 }, timeZone);
}

/** Calendar month containing `date`, moved by `addMonths` months, as UTC instants [from, to). */
export function zonedMonthRange(date: Date, timeZone: string, addMonths = 0) {
  const { year, month } = zonedParts(date, timeZone);
  return {
    from: zonedTimeToUtc({ year, month: month + addMonths, day: 1 }, timeZone),
    to: zonedTimeToUtc({ year, month: month + addMonths + 1, day: 1 }, timeZone),
  };
}
