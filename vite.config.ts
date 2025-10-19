import { defineConfig } from "vite";

import react from "@vitejs/plugin-react-swc";

import { VitePWA } from "vite-plugin-pwa";

import path from "path";

export default defineConfig({

  server: { host: "::", port: 8000 },

  plugins: [

    react(),

    VitePWA({

      registerType: "autoUpdate",

      injectRegister: "auto",

      manifest: {

        name: "Tone2Vibe",

        short_name: "Tone2Vibe",

        start_url: "/",

        display: "standalone",

        background_color: "#f5f5f5",

        theme_color: "#f5f5f5",

        icons: [

          {

            src: "/favicon.png",

            sizes: "192x192",

            type: "image/png"

          }

        ]

      },

      workbox: {

        navigateFallback: "/index.html",

        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],

        runtimeCaching: [

          {

            urlPattern: ({ request }) => request.destination === "document",

            handler: "NetworkFirst",

            options: {

              cacheName: "html-cache"

            }

          },

          {

            urlPattern: ({ request }) =>

              ["style", "script", "worker"].includes(request.destination),

            handler: "StaleWhileRevalidate",

            options: {

              cacheName: "asset-cache"

            }

          },

          {

            urlPattern: ({ request }) =>

              ["image", "font"].includes(request.destination),

            handler: "CacheFirst",

            options: {

              cacheName: "static-cache",

              expiration: {

                maxEntries: 100,

                maxAgeSeconds: 60 * 60 * 24 * 30

              }

            }

          }

        ]

      }

    })

  ],

  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },

  build: { chunkSizeWarningLimit: 2000, sourcemap: false }

});