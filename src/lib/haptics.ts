/**
 * Simulated haptic feedback for mobile devices
 * Uses the Vibration API when available
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const durations: Record<string, number> = {
      light: 10,
      medium: 25,
      heavy: 50,
    };
    navigator.vibrate(durations[type]);
  }
}

/**
 * Haptic feedback for button clicks
 */
export function hapticClick() {
  triggerHaptic('light');
}

/**
 * Haptic feedback for successful actions
 */
export function hapticSuccess() {
  triggerHaptic('medium');
}

/**
 * Haptic feedback for errors
 */
export function hapticError() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([50, 50, 50]);
  }
}
