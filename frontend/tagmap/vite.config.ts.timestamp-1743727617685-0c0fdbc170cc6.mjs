// vite.config.ts
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "file:///Users/andrelauret/Documents/Workspace/tagmap/frontend/tagmap/node_modules/vite/dist/node/index.js";
import vue from "file:///Users/andrelauret/Documents/Workspace/tagmap/frontend/tagmap/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueDevTools from "file:///Users/andrelauret/Documents/Workspace/tagmap/frontend/tagmap/node_modules/vite-plugin-vue-devtools/dist/vite.mjs";
var __vite_injected_original_import_meta_url = "file:///Users/andrelauret/Documents/Workspace/tagmap/frontend/tagmap/vite.config.ts";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    vueDevTools()
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    }
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true
      },
      "/media": {
        target: "http://localhost:8000",
        changeOrigin: true
      }
    },
    origin: "http://localhost:5173",
    host: "localhost",
    port: 5173,
    strictPort: true,
    cors: true
  },
  build: {
    outDir: "../../static/frontend",
    assetsDir: "assets",
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: void 0,
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "index.css") {
            return "assets/[name].css";
          }
          return "assets/[name].[ext]";
        }
      }
    }
  },
  base: process.env.NODE_ENV === "production" ? "/static/frontend/" : "/"
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYW5kcmVsYXVyZXQvRG9jdW1lbnRzL1dvcmtzcGFjZS90YWdtYXAvZnJvbnRlbmQvdGFnbWFwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvYW5kcmVsYXVyZXQvRG9jdW1lbnRzL1dvcmtzcGFjZS90YWdtYXAvZnJvbnRlbmQvdGFnbWFwL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9hbmRyZWxhdXJldC9Eb2N1bWVudHMvV29ya3NwYWNlL3RhZ21hcC9mcm9udGVuZC90YWdtYXAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tICdub2RlOnVybCdcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSdcbmltcG9ydCB2dWVEZXZUb29scyBmcm9tICd2aXRlLXBsdWdpbi12dWUtZGV2dG9vbHMnXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHZ1ZSgpLFxuICAgIHZ1ZURldlRvb2xzKCksXG4gIF0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjJywgaW1wb3J0Lm1ldGEudXJsKSlcbiAgICB9XG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlXG4gICAgICB9LFxuICAgICAgJy9tZWRpYSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlXG4gICAgICB9XG4gICAgfSxcbiAgICBvcmlnaW46ICdodHRwOi8vbG9jYWxob3N0OjUxNzMnLFxuICAgIGhvc3Q6ICdsb2NhbGhvc3QnLFxuICAgIHBvcnQ6IDUxNzMsXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICBjb3JzOiB0cnVlXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnLi4vLi4vc3RhdGljL2Zyb250ZW5kJyxcbiAgICBhc3NldHNEaXI6ICdhc3NldHMnLFxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxuICAgIG1hbmlmZXN0OiB0cnVlLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHVuZGVmaW5lZCxcbiAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLmpzJyxcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLmpzJyxcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcbiAgICAgICAgICBpZiAoYXNzZXRJbmZvLm5hbWUgPT09ICdpbmRleC5jc3MnKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2Fzc2V0cy9bbmFtZV0uY3NzJ1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gJ2Fzc2V0cy9bbmFtZV0uW2V4dF0nXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGJhc2U6IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAncHJvZHVjdGlvbicgPyAnL3N0YXRpYy9mcm9udGVuZC8nIDogJy8nXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5VyxTQUFTLGVBQWUsV0FBVztBQUM1WSxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFNBQVM7QUFDaEIsT0FBTyxpQkFBaUI7QUFIME0sSUFBTSwyQ0FBMkM7QUFLblIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssY0FBYyxJQUFJLElBQUksU0FBUyx3Q0FBZSxDQUFDO0FBQUEsSUFDdEQ7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxNQUNBLFVBQVU7QUFBQSxRQUNSLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxhQUFhO0FBQUEsSUFDYixVQUFVO0FBQUEsSUFDVixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsUUFDZCxnQkFBZ0I7QUFBQSxRQUNoQixnQkFBZ0I7QUFBQSxRQUNoQixnQkFBZ0IsQ0FBQyxjQUFjO0FBQzdCLGNBQUksVUFBVSxTQUFTLGFBQWE7QUFDbEMsbUJBQU87QUFBQSxVQUNUO0FBQ0EsaUJBQU87QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxNQUFNLFFBQVEsSUFBSSxhQUFhLGVBQWUsc0JBQXNCO0FBQ3RFLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
