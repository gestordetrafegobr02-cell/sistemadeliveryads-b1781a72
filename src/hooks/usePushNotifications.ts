import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Public VAPID key (safe to embed).
const VAPID_PUBLIC_KEY =
  'BFfT-zUSAVGoqXtxlR_6amDm5ReGhYQaZTZQDRizuRndaED7OetisXnoU3vIeKlC2SOXZxYUEUnbibyT8JU1DHE';

const SW_URL = '/push-sw.js';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export type PushStatus = 'unsupported' | 'denied' | 'granted' | 'default' | 'loading';

export function usePushNotifications(storeId: string | null) {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [subscribed, setSubscribed] = useState(false);

  const supported =
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  const refresh = useCallback(async () => {
    if (!supported) { setStatus('unsupported'); return; }
    setStatus(Notification.permission as PushStatus);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL);
      const sub = await reg?.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch { setSubscribed(false); }
  }, [supported]);

  useEffect(() => { refresh(); }, [refresh]);

  const enable = useCallback(async () => {
    if (!supported || !storeId) return false;
    const perm = await Notification.requestPermission();
    setStatus(perm as PushStatus);
    if (perm !== 'granted') return false;

    const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const { error } = await supabase.functions.invoke('push-subscribe', {
      body: {
        action: 'subscribe',
        store_id: storeId,
        subscription: sub.toJSON(),
        user_agent: navigator.userAgent,
      },
    });
    if (error) { console.error('subscribe failed', error); return false; }
    setSubscribed(true);
    return true;
  }, [supported, storeId]);

  const disable = useCallback(async () => {
    if (!supported) return;
    const reg = await navigator.serviceWorker.getRegistration(SW_URL);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.functions.invoke('push-subscribe', {
        body: { action: 'unsubscribe', endpoint: sub.endpoint },
      });
      await sub.unsubscribe();
    }
    setSubscribed(false);
  }, [supported]);

  return { supported, status, subscribed, enable, disable, refresh };
}
