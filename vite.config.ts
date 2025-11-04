import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },

  plugins: [
    react(),
    {
      name: "health-check",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/api/health") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/plain");
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.end("ok");
            return;
          }
          next();
        });
      },
    },
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});