export interface DayHours {
  open: string;
  close: string;
}

export interface OpeningHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

const dayMap: Record<number, keyof OpeningHours> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

const weekdayShortMap: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/**
 * Get current hour/minute/day in São Paulo timezone using Intl.DateTimeFormat
 * (avoids the toLocaleString/new Date double-shift bug).
 */
function getNowInSaoPaulo(): { hour: number; minute: number; day: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
    return {
      hour: hour === 24 ? 0 : hour,
      minute,
      day: weekdayShortMap[weekday] ?? 0,
    };
  } catch {
    const d = new Date();
    return { hour: d.getHours(), minute: d.getMinutes(), day: d.getDay() };
  }
}

/**
 * Strict boundary check: store is open ONLY when current time is within
 * the configured open/close window for today. Also honors the manual toggle:
 * - is_open_manual = false → ALWAYS closed (hard override)
 * - is_open_manual = true  → must also satisfy the schedule
 */
export function isStoreOpen(openingHours: OpeningHours | null, isOpenManual: boolean): boolean {
  if (!isOpenManual) return false;
  if (!openingHours) return true;
  return isWithinScheduledHours(openingHours);
}

function parseHoursToMinutes(value: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

/**
 * Pure schedule evaluator, exported so overnight boundaries can be tested
 * independently of the machine clock.
 */
export function isWithinScheduledHoursAt(
  openingHours: OpeningHours | null,
  day: number,
  hour: number,
  minute: number,
): boolean {
  if (!openingHours) return true;
  if (!Number.isInteger(day) || day < 0 || day > 6 ||
      !Number.isInteger(hour) || hour < 0 || hour > 23 ||
      !Number.isInteger(minute) || minute < 0 || minute > 59) return false;

  const current = hour * 60 + minute;
  const todayHours = openingHours[dayMap[day]];
  if (todayHours?.open && todayHours?.close) {
    const openAt = parseHoursToMinutes(todayHours.open);
    const closeAt = parseHoursToMinutes(todayHours.close);
    if (openAt !== null && closeAt !== null) {
      // Overnight interval on the current weekday (e.g. 22:00–02:00).
      if (closeAt <= openAt) {
        if (current >= openAt || current <= closeAt) return true;
      } else if (current >= openAt && current <= closeAt) {
        return true;
      }
    }
  }

  // An overnight interval belongs to the weekday on which it started.
  // Check yesterday as well so a Monday 22:00–02:00 schedule remains open
  // on Tuesday at 01:00, even if Tuesday has no opening-hours entry.
  const previousDay = (day + 6) % 7;
  const previousHours = openingHours[dayMap[previousDay]];
  if (previousHours?.open && previousHours?.close) {
    const previousOpen = parseHoursToMinutes(previousHours.open);
    const previousClose = parseHoursToMinutes(previousHours.close);
    if (previousOpen !== null && previousClose !== null &&
        previousClose <= previousOpen && current < previousClose) {
      return true;
    }
  }

  return false;
}

export function isWithinScheduledHours(openingHours: OpeningHours | null): boolean {
  if (!openingHours) return true;
  const now = getNowInSaoPaulo();
  return isWithinScheduledHoursAt(openingHours, now.day, now.hour, now.minute);
}

export function getTodayHours(openingHours: OpeningHours | null): string | null {
  if (!openingHours) return null;
  const now = getNowInSaoPaulo();
  const dayKey = dayMap[now.day];
  const todayHours = openingHours[dayKey];
  if (!todayHours || !todayHours.open || !todayHours.close) return 'Fechado';
  return `${todayHours.open} - ${todayHours.close}`;
}
