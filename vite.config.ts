import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: { host: "::", port: 8000 },

  plugins: [
    react(),
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
