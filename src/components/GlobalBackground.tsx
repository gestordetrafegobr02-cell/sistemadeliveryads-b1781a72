import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import bgImage from '@/assets/global-bg-premium.jpg';

/**
 * Global immersive background for all "platform" routes.
 * - Desktop + WiFi (or unknown connection) + a video at /videos/global-bg.mp4 → loop video
 * - Otherwise → static premium image (mobile / cellular / missing asset)
 *
 * Also toggles a `theme-bp` class on <body> for the routes that should use the
 * Black Premium glassmorphism, and renders a soft-glow footer logo.
 *
 * White-label store routes (`/:slug` and `/order-status/...`) are excluded so
 * each merchant keeps their own branding.
 */

const STORE_EXCLUDED = ['/order-status'];

function isStoreRoute(path: string): boolean {
  if (path === '/' || path === '') return false;
  if (
    path.startsWith('/auth') ||
    path.startsWith('/admin') ||
    path.startsWith('/super-admin') ||
    path.startsWith('/onboarding') ||
    path.startsWith('/demo')
  ) {
    return false;
  }
  if (STORE_EXCLUDED.some((p) => path.startsWith(p))) return true;
  // Catch-all `/:slug` → store
  return /^\/[^/]+/.test(path);
}

function shouldUseVideo(): boolean {
  if (typeof window === 'undefined') return false;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (isMobile) return false;

  // Respect data-saver and slow connections
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; type?: string; effectiveType?: string } }).connection;
  if (conn?.saveData) return false;
  if (conn?.type && conn.type !== 'wifi' && conn.type !== 'ethernet' && conn.type !== 'unknown') {
    return false;
  }
  if (conn?.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType)) {
    return false;
  }
  return true;
}

export function GlobalBackground() {
  const location = useLocation();
  const onStore = isStoreRoute(location.pathname);
  const [videoOk, setVideoOk] = useState(false);

  // Toggle Black Premium theme class on body for non-store routes
  useEffect(() => {
    if (onStore) {
      document.body.classList.remove('theme-bp');
    } else {
      document.body.classList.add('theme-bp');
    }
    return () => {
      document.body.classList.remove('theme-bp');
    };
  }, [onStore]);

  // Probe optional video asset (graceful fallback when not present)
  useEffect(() => {
    if (onStore || !shouldUseVideo()) return;
    let cancelled = false;
    fetch('/videos/global-bg.mp4', { method: 'HEAD' })
      .then((r) => {
        if (!cancelled && r.ok) setVideoOk(true);
      })
      .catch(() => {
        /* no-op */
      });
    return () => {
      cancelled = true;
    };
  }, [onStore, location.pathname]);

  if (onStore) return null;

  return (
    <>
      {/* Video / Image layer */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: -2 }}
      >
        {videoOk ? (
          <video
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster={bgImage}
          >
            <source src="/videos/global-bg.mp4" type="video/mp4" />
          </video>
        ) : (
          <img
            src={bgImage}
            alt=""
            width={1920}
            height={1088}
            className="w-full h-full object-cover"
          />
        )}
        {/* Radial vignette overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.7) 60%, #000 100%)',
          }}
        />
      </div>

      {/* Brand footer with glow */}
      <div
        aria-hidden
        className="fixed bottom-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none"
      >
        <span
          className="font-display text-[10px] sm:text-xs tracking-[0.35em] uppercase text-white/70"
          style={{
            textShadow:
              '0 0 12px rgba(30,144,255,0.55), 0 0 24px rgba(30,144,255,0.25)',
          }}
        >
          IGOR MOISÉS ADS
        </span>
      </div>
    </>
  );
}
