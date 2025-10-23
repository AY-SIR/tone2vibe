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
            type: "image/png",
          },
        ],
      },
      workbox: false, // Disable workbox completely
      devOptions: {
        enabled: true,
      },
    }),
  ],

  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },

  build: { 
    chunkSizeWarningLimit: 1000, 
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          charts: ['recharts'],
          audio: ['@ffmpeg/ffmpeg', '@ffmpeg/core'],
        }
      }
    }
  },
});
