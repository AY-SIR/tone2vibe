import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,

    // 👇 Add this custom health check endpoint for your hook
    setupMiddlewares(middlewares) {
      middlewares.use("/api/health", (req, res) => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain");
        res.end("ok");
      });
      return middlewares;
    },
  },

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",

      devOptions: {
        enabled: true, // Enable PWA during dev
      },

      manifest: {
        name: "Tone2vibe",
        short_name: "Tone2vibe",
        start_url: "/",
        display: "standalone",
        background_color: "#f9fafb",
        theme_color: "#0ea5e9",
  "description": "Tone2vibe lets you create and experience AI-powered audio with natural voices.",

        icons: [
          {
            src: "/favicon.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },

      workbox: {
        globDirectory: "dist", // use dist instead of dev-dist
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        navigateFallback: "/index.html",

        runtimeCaching: [
          {
            // Handle navigation requests
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              networkTimeoutSeconds: 3,
            },
          },
          {
            // Cache JS, CSS, images
            urlPattern: ({ request }) =>
              ["style", "script", "image"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "assets-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
