import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,

    // 👇 Custom health check endpoint (keep this)
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
    react(), // ✅ Only React plugin — PWA removed
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
