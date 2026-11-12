import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const cleanEnvValue = (value?: string) => {
  if (!value) return value;

  return value
    .replace(/^\s*(?:VITE_SUPABASE_URL|VITE_SUPABASE_PUBLISHABLE_KEY|VITE_SUPABASE_PROJECT_ID)\s*=\s*/i, "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(cleanEnvValue(env.VITE_SUPABASE_URL)),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(cleanEnvValue(env.VITE_SUPABASE_PUBLISHABLE_KEY)),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(cleanEnvValue(env.VITE_SUPABASE_PROJECT_ID)),
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["logo.png", "robots.txt"],
        manifest: false, // Using our own manifest.json
        workbox: {
          // Keep installation lightweight: do not precache every lazy-loaded JS chunk.
          // Route chunks are cached on demand after the visitor actually opens them.
          globPatterns: ["**/*.{css,html,ico,svg,woff,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /\/assets\/.*\.(?:js|css)$/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "deliverypro-app-assets",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 14,
                },
              },
            },
            {
              urlPattern: /\/assets\/.*\.(?:png|jpe?g|webp|svg)$/i,
              handler: "CacheFirst",
              options: {
                cacheName: "deliverypro-static-images",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/(?:object|render)\/public\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "supabase-images",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-stylesheets",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-webfonts",
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ].filter(Boolean),
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const modulePath = id;
            if (!modulePath.includes("/node_modules/")) return;
            if (
              modulePath.includes("/node_modules/react/") ||
              modulePath.includes("/node_modules/react-dom/") ||
              modulePath.includes("/node_modules/scheduler/") ||
              modulePath.includes("/node_modules/react-router/") ||
              modulePath.includes("/node_modules/@remix-run/")
            ) return "vendor-react";
            if (
              modulePath.includes("/node_modules/@supabase/") ||
              modulePath.includes("/node_modules/@tanstack/react-query/")
            ) return "vendor-data";
            if (
              modulePath.includes("/node_modules/recharts/") ||
              modulePath.includes("/node_modules/d3-")
            ) return "vendor-charts";
            if (modulePath.includes("/node_modules/framer-motion/")) return "vendor-motion";
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
