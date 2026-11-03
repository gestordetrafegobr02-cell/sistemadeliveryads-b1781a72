// Build trigger: 2026-06-16T12:30Z - v1.1.2-clean (force fresh Vercel build, vercel.json rewrites active)
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { ThemeProvider } from "./hooks/useTheme";
import "./index.css";

export const APP_VERSION = "v1.1.1-clean";

// One-time legacy service worker + cache purge.
// Removes any stale app-shell SW from previous deploys so the new bundle is served.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      regs.forEach((reg) => {
        // Preserve Firebase Messaging and the app's own Web Push worker.
        const scriptURL = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
        if (scriptURL.includes("firebase-messaging-sw") || scriptURL.includes("/push-sw.js")) return;
        reg.unregister().catch(() => {});
      });
    })
    .catch(() => {});

  if ("caches" in window) {
    caches
      .keys()
      .then((names) => {
        names.forEach((name) => {
          // Preserve push messaging caches
          if (name.includes("firebase") || name.includes("fcm")) return;
          caches.delete(name).catch(() => {});
        });
      })
      .catch(() => {});
  }
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </HelmetProvider>
);
