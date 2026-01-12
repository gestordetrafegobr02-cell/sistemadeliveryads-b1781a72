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

/**
 * Check if the store is currently open based on hours and manual toggle
 */
export function isStoreOpen(openingHours: OpeningHours | null, isOpenManual: boolean): boolean {
  // If manually closed, return false
  if (!isOpenManual) {
    return false;
  }

  // If no opening hours defined, assume open
  if (!openingHours) {
    return true;
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const dayKey = dayMap[dayOfWeek];
  const todayHours = openingHours[dayKey];

  // If no hours for today, assume closed
  if (!todayHours || !todayHours.open || !todayHours.close) {
    return false;
  }

  // Parse time strings
  const [openHour, openMin] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  // Handle overnight hours (e.g., 22:00 - 02:00)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Get current day's hours as formatted string
 */
export function getTodayHours(openingHours: OpeningHours | null): string | null {
  if (!openingHours) return null;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const dayKey = dayMap[dayOfWeek];
  const todayHours = openingHours[dayKey];

  if (!todayHours || !todayHours.open || !todayHours.close) {
    return 'Fechado';
  }

  return `${todayHours.open} - ${todayHours.close}`;
}
