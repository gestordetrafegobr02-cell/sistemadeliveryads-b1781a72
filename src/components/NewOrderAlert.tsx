import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';

interface NewOrderAlertProps {
  pendingOrderIds: string[];
  onAccept: (orderId: string) => void;
}

// Generate a simple beep using Web Audio API
function createBeep(audioCtx: AudioContext) {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.frequency.value = 880;
  oscillator.type = 'sine';
  gainNode.gain.value = 0.3;
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.15);
}

export function NewOrderAlert({ pendingOrderIds, onAccept }: NewOrderAlertProps) {
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const unacknowledgedIds = pendingOrderIds.filter((id) => !acknowledgedIds.has(id));
  const hasAlert = unacknowledgedIds.length > 0;

  useEffect(() => {
    if (!hasAlert) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start repeating beep
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }

    // Play immediately
    createBeep(audioCtxRef.current);

    intervalRef.current = setInterval(() => {
      if (audioCtxRef.current) {
        createBeep(audioCtxRef.current);
      }
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasAlert, unacknowledgedIds.length]);

  function handleAcceptAll() {
    const newSet = new Set(acknowledgedIds);
    unacknowledgedIds.forEach((id) => {
      newSet.add(id);
      onAccept(id);
    });
    setAcknowledgedIds(newSet);
  }

  if (!hasAlert) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      <Button
        onClick={handleAcceptAll}
        className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-2xl rounded-full px-6 py-3 h-auto text-base"
      >
        <Bell className="w-5 h-5 animate-pulse" />
        🔔 {unacknowledgedIds.length} novo(s) pedido(s) — Aceitar
      </Button>
    </div>
  );
}
