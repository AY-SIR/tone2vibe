import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: { host: "::", port: 8080 },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Tone2vibe",
        short_name: "Tone2vibe",
        start_url: "/",
        display: "standalone",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          {
            src: "/favicon.png",
            sizes: "192x192",
          },
          {
            src: "/favicon.png",
            sizes: "512x512",
          }
        ]
      }
    })
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: { chunkSizeWarningLimit: 2000, sourcemap: false }
});
