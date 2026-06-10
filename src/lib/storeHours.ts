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

export function isWithinScheduledHours(openingHours: OpeningHours | null): boolean {
  if (!openingHours) return true;

  const now = getNowInSaoPaulo();
  const dayKey = dayMap[now.day];
  const todayHours = openingHours[dayKey];

  if (!todayHours || !todayHours.open || !todayHours.close) {
    return false;
  }

  const [openHour, openMin] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number);

  if (
    Number.isNaN(openHour) || Number.isNaN(openMin) ||
    Number.isNaN(closeHour) || Number.isNaN(closeMin)
  ) {
    return false;
  }

  const current = now.hour * 60 + now.minute;
  const openAt = openHour * 60 + openMin;
  const closeAt = closeHour * 60 + closeMin;

  // Overnight (e.g. 22:00 - 02:00)
  if (closeAt <= openAt) {
    return current >= openAt || current < closeAt;
  }

  // Strict boundary: inclusive open, inclusive close
  return current >= openAt && current <= closeAt;
}

export function getTodayHours(openingHours: OpeningHours | null): string | null {
  if (!openingHours) return null;
  const now = getNowInSaoPaulo();
  const dayKey = dayMap[now.day];
  const todayHours = openingHours[dayKey];
  if (!todayHours || !todayHours.open || !todayHours.close) return 'Fechado';
  return `${todayHours.open} - ${todayHours.close}`;
}
