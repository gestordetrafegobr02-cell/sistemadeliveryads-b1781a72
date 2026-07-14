/**
 * Meta (Facebook) Pixel helper for the LANDING PAGE (sales funnel).
 * Separate from the per-store pixel used inside customer shops.
 *
 * Events fired:
 *  - PageView    → automatic on landing mount
 *  - Lead        → when the signup form is submitted (before store creation)
 *  - CompleteRegistration → after the store is successfully created
 */

declare global {
  interface Window {
    __landingPixelLoaded?: string;
  }
}

function isValidPixelId(pixelId: string): boolean {
  return /^[0-9]{15,20}$/.test(pixelId);
}

export function loadLandingPixel(pixelId: string) {
  if (typeof window === 'undefined') return;
  const id = (pixelId || '').trim();
  if (!id || !isValidPixelId(id)) return;
  if (window.__landingPixelLoaded === id) return;

  // Standard Meta Pixel base code
  /* eslint-disable */
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq?.('init', id);
  window.fbq?.('track', 'PageView');
  window.__landingPixelLoaded = id;
}

export function trackLandingEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.fbq) return;
  try {
    window.fbq('track', event, params || {});
  } catch (err) {
    console.warn('[LandingPixel] track failed', err);
  }
}
