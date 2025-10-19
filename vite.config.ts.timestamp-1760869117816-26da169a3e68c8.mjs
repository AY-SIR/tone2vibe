// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react-swc/index.mjs";
import { VitePWA } from "file:///home/project/node_modules/vite-plugin-pwa/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig({
  server: { host: "::", port: 8e3 },
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
            urlPattern: ({ request }) => ["style", "script", "worker"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "asset-cache"
            }
          },
          {
            urlPattern: ({ request }) => ["image", "font"].includes(request.destination),
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
  resolve: { alias: { "@": path.resolve(__vite_injected_original_dirname, "./src") } },
  build: { chunkSizeWarningLimit: 2e3, sourcemap: false }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xuXG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSBcInZpdGUtcGx1Z2luLXB3YVwiO1xuXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuXG4gIHNlcnZlcjogeyBob3N0OiBcIjo6XCIsIHBvcnQ6IDgwMDAgfSxcblxuICBwbHVnaW5zOiBbXG5cbiAgICByZWFjdCgpLFxuXG4gICAgVml0ZVBXQSh7XG5cbiAgICAgIHJlZ2lzdGVyVHlwZTogXCJhdXRvVXBkYXRlXCIsXG5cbiAgICAgIGluamVjdFJlZ2lzdGVyOiBcImF1dG9cIixcblxuICAgICAgbWFuaWZlc3Q6IHtcblxuICAgICAgICBuYW1lOiBcIlRvbmUyVmliZVwiLFxuXG4gICAgICAgIHNob3J0X25hbWU6IFwiVG9uZTJWaWJlXCIsXG5cbiAgICAgICAgc3RhcnRfdXJsOiBcIi9cIixcblxuICAgICAgICBkaXNwbGF5OiBcInN0YW5kYWxvbmVcIixcblxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiBcIiNmNWY1ZjVcIixcblxuICAgICAgICB0aGVtZV9jb2xvcjogXCIjZjVmNWY1XCIsXG5cbiAgICAgICAgaWNvbnM6IFtcblxuICAgICAgICAgIHtcblxuICAgICAgICAgICAgc3JjOiBcIi9mYXZpY29uLnBuZ1wiLFxuXG4gICAgICAgICAgICBzaXplczogXCIxOTJ4MTkyXCIsXG5cbiAgICAgICAgICAgIHR5cGU6IFwiaW1hZ2UvcG5nXCJcblxuICAgICAgICAgIH1cblxuICAgICAgICBdXG5cbiAgICAgIH0sXG5cbiAgICAgIHdvcmtib3g6IHtcblxuICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrOiBcIi9pbmRleC5odG1sXCIsXG5cbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbXCIqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Z31cIl0sXG5cbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcblxuICAgICAgICAgIHtcblxuICAgICAgICAgICAgdXJsUGF0dGVybjogKHsgcmVxdWVzdCB9KSA9PiByZXF1ZXN0LmRlc3RpbmF0aW9uID09PSBcImRvY3VtZW50XCIsXG5cbiAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya0ZpcnN0XCIsXG5cbiAgICAgICAgICAgIG9wdGlvbnM6IHtcblxuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwiaHRtbC1jYWNoZVwiXG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0sXG5cbiAgICAgICAgICB7XG5cbiAgICAgICAgICAgIHVybFBhdHRlcm46ICh7IHJlcXVlc3QgfSkgPT5cblxuICAgICAgICAgICAgICBbXCJzdHlsZVwiLCBcInNjcmlwdFwiLCBcIndvcmtlclwiXS5pbmNsdWRlcyhyZXF1ZXN0LmRlc3RpbmF0aW9uKSxcblxuICAgICAgICAgICAgaGFuZGxlcjogXCJTdGFsZVdoaWxlUmV2YWxpZGF0ZVwiLFxuXG4gICAgICAgICAgICBvcHRpb25zOiB7XG5cbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiBcImFzc2V0LWNhY2hlXCJcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSxcblxuICAgICAgICAgIHtcblxuICAgICAgICAgICAgdXJsUGF0dGVybjogKHsgcmVxdWVzdCB9KSA9PlxuXG4gICAgICAgICAgICAgIFtcImltYWdlXCIsIFwiZm9udFwiXS5pbmNsdWRlcyhyZXF1ZXN0LmRlc3RpbmF0aW9uKSxcblxuICAgICAgICAgICAgaGFuZGxlcjogXCJDYWNoZUZpcnN0XCIsXG5cbiAgICAgICAgICAgIG9wdGlvbnM6IHtcblxuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwic3RhdGljLWNhY2hlXCIsXG5cbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuXG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAwLFxuXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzBcblxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH1cblxuICAgICAgICBdXG5cbiAgICAgIH1cblxuICAgIH0pXG5cbiAgXSxcblxuICByZXNvbHZlOiB7IGFsaWFzOiB7IFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpIH0gfSxcblxuICBidWlsZDogeyBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDIwMDAsIHNvdXJjZW1hcDogZmFsc2UgfVxuXG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBRXRQLE9BQU8sV0FBVztBQUVsQixTQUFTLGVBQWU7QUFFeEIsT0FBTyxVQUFVO0FBTmpCLElBQU0sbUNBQW1DO0FBUXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBRTFCLFFBQVEsRUFBRSxNQUFNLE1BQU0sTUFBTSxJQUFLO0FBQUEsRUFFakMsU0FBUztBQUFBLElBRVAsTUFBTTtBQUFBLElBRU4sUUFBUTtBQUFBLE1BRU4sY0FBYztBQUFBLE1BRWQsZ0JBQWdCO0FBQUEsTUFFaEIsVUFBVTtBQUFBLFFBRVIsTUFBTTtBQUFBLFFBRU4sWUFBWTtBQUFBLFFBRVosV0FBVztBQUFBLFFBRVgsU0FBUztBQUFBLFFBRVQsa0JBQWtCO0FBQUEsUUFFbEIsYUFBYTtBQUFBLFFBRWIsT0FBTztBQUFBLFVBRUw7QUFBQSxZQUVFLEtBQUs7QUFBQSxZQUVMLE9BQU87QUFBQSxZQUVQLE1BQU07QUFBQSxVQUVSO0FBQUEsUUFFRjtBQUFBLE1BRUY7QUFBQSxNQUVBLFNBQVM7QUFBQSxRQUVQLGtCQUFrQjtBQUFBLFFBRWxCLGNBQWMsQ0FBQyxnQ0FBZ0M7QUFBQSxRQUUvQyxnQkFBZ0I7QUFBQSxVQUVkO0FBQUEsWUFFRSxZQUFZLENBQUMsRUFBRSxRQUFRLE1BQU0sUUFBUSxnQkFBZ0I7QUFBQSxZQUVyRCxTQUFTO0FBQUEsWUFFVCxTQUFTO0FBQUEsY0FFUCxXQUFXO0FBQUEsWUFFYjtBQUFBLFVBRUY7QUFBQSxVQUVBO0FBQUEsWUFFRSxZQUFZLENBQUMsRUFBRSxRQUFRLE1BRXJCLENBQUMsU0FBUyxVQUFVLFFBQVEsRUFBRSxTQUFTLFFBQVEsV0FBVztBQUFBLFlBRTVELFNBQVM7QUFBQSxZQUVULFNBQVM7QUFBQSxjQUVQLFdBQVc7QUFBQSxZQUViO0FBQUEsVUFFRjtBQUFBLFVBRUE7QUFBQSxZQUVFLFlBQVksQ0FBQyxFQUFFLFFBQVEsTUFFckIsQ0FBQyxTQUFTLE1BQU0sRUFBRSxTQUFTLFFBQVEsV0FBVztBQUFBLFlBRWhELFNBQVM7QUFBQSxZQUVULFNBQVM7QUFBQSxjQUVQLFdBQVc7QUFBQSxjQUVYLFlBQVk7QUFBQSxnQkFFVixZQUFZO0FBQUEsZ0JBRVosZUFBZSxLQUFLLEtBQUssS0FBSztBQUFBLGNBRWhDO0FBQUEsWUFFRjtBQUFBLFVBRUY7QUFBQSxRQUVGO0FBQUEsTUFFRjtBQUFBLElBRUYsQ0FBQztBQUFBLEVBRUg7QUFBQSxFQUVBLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTyxFQUFFLEVBQUU7QUFBQSxFQUU1RCxPQUFPLEVBQUUsdUJBQXVCLEtBQU0sV0FBVyxNQUFNO0FBRXpELENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
