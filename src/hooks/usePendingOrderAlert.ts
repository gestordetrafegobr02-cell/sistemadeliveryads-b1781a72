import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Persistent "new order" buzzer:
 * - Generates a looping buzzer tone via Web Audio API (no asset file required).
 * - Must be "unlocked" via a user gesture once per session to bypass browser
 *   autoplay policies. After unlock, alerts will autoplay forever.
 * - `pendingCount > 0` => buzzer plays in a loop. Drop to 0 => stops.
 */
export function usePendingOrderAlert(pendingCount: number) {
  const [unlocked, setUnlocked] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);

  const ensureCtx = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    return ctxRef.current;
  }, []);

  const playBeep = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    // Two-tone buzzer: 880Hz -> 660Hz, 600ms total.
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(660, now + 0.3);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  }, []);

  const stopLoop = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startLoop = useCallback(() => {
    if (intervalRef.current !== null) return;
    playBeep();
    intervalRef.current = window.setInterval(() => playBeep(), 1500);
  }, [playBeep]);

  const unlock = useCallback(async () => {
    const ctx = ensureCtx();
    if (!ctx) return false;
    try {
      if (ctx.state === 'suspended') await ctx.resume();
      // Tiny silent beep to confirm user gesture.
      playBeep();
      setUnlocked(true);
      return true;
    } catch (err) {
      console.warn('[order-alert] unlock failed:', err);
      return false;
    }
  }, [ensureCtx, playBeep]);

  // React to pending count changes
  useEffect(() => {
    if (!unlocked) return;
    if (pendingCount > 0) startLoop();
    else stopLoop();
  }, [pendingCount, unlocked, startLoop, stopLoop]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopLoop();
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [stopLoop]);

  return { unlocked, unlock };
}
