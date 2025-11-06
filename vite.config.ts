import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },

  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    {
      name: "health-check",
      configureServer(server: any) {
        server.middlewares.use((req: any, res: any, next: any) => {
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
  ].filter(Boolean),

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
    copyPublicDir: true,
  },
}));