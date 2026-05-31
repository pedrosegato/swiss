import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [
    TanStackRouterVite(),
    react(),
    tailwindcss(),
    !process.env.TAURI_ENV_PLATFORM &&
      electron({
        main: { entry: "electron/main.ts" },
        preload: { input: path.join(__dirname, "electron/preload.ts") },
        renderer: process.env.NODE_ENV === "test" ? undefined : {},
      }),
  ].filter(Boolean),
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));
