import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    _fbq?: unknown;
    __metaPixelLoaded?: string;
  }
}

/**
 * Injects the global Meta Pixel script dynamically based on the
 * `meta_pixel_id` value stored in global_settings. Loads once per session.
 */
export function MetaPixelInjector() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('global_settings')
          .select('value')
          .eq('key', 'meta_pixel_id')
          .maybeSingle();

        if (cancelled || error) return;
        const pixelId = (data?.value || '').trim();
        if (!pixelId || !/^\d{6,20}$/.test(pixelId)) return;
        if (window.__metaPixelLoaded === pixelId) return;
        if ((window as any).fbq) {
          (window as any).fbq('init', pixelId);
          (window as any).fbq('track', 'PageView');
          window.__metaPixelLoaded = pixelId;
          return;
        }

        const script = document.createElement('script');
        script.async = true;
        script.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `;
        document.head.appendChild(script);
        window.__metaPixelLoaded = pixelId;
      } catch {
        // fail silently
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
