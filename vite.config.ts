import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
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
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["logo.png", "robots.txt"],
        manifest: false, // Using our own manifest.json
        workbox: {
          // Keep installation lightweight: do not precache every lazy-loaded JS chunk.
          // Route chunks are cached on demand after the visitor actually opens them.
          globPatterns: ["**/*.css", "**/*.html", "**/*.svg"],
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
               ...[truncated]