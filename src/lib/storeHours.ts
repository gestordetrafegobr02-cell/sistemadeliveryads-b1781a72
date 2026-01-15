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
 * Get current time in São Paulo timezone
 */
function getNowInSaoPaulo(): Date {
  // Create a date string in São Paulo timezone and parse it
  const saoPauloTime = new Date().toLocaleString('en-US', { 
    timeZone: 'America/Sao_Paulo' 
  });
  return new Date(saoPauloTime);
}

/**
 * Check if the store is currently open based on hours and manual toggle
 * 
 * IMPORTANT: If is_open_manual is TRUE, store is ALWAYS open (overrides schedule)
 * If is_open_manual is FALSE, store is ALWAYS closed (overrides schedule)
 */
export function isStoreOpen(openingHours: OpeningHours | null, isOpenManual: boolean): boolean {
  // Manual toggle takes precedence:
  // - TRUE = store is open regardless of schedule
  // - FALSE = store is closed regardless of schedule
  if (!isOpenManual) {
    return false;
  }

  // If is_open_manual is TRUE, store is open
  // Opening hours are informational only - they don't close the store automatically
  return true;
}

/**
 * Check if store is within scheduled hours (informational only)
 * Used to show "open until X" or "opens at X" messages
 */
export function isWithinScheduledHours(openingHours: OpeningHours | null): boolean {
  if (!openingHours) {
    return true;
  }

  const now = getNowInSaoPaulo();
  const dayOfWeek = now.getDay();
  const dayKey = dayMap[dayOfWeek];
  const todayHours = openingHours[dayKey];

  if (!todayHours || !todayHours.open || !todayHours.close) {
    return false;
  }

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

  const now = getNowInSaoPaulo();
  const dayOfWeek = now.getDay();
  const dayKey = dayMap[dayOfWeek];
  const todayHours = openingHours[dayKey];

  if (!todayHours || !todayHours.open || !todayHours.close) {
    return 'Fechado';
  }

  return `${todayHours.open} - ${todayHours.close}`;
}
