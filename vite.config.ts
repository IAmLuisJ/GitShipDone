/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/vitest.setup.ts"],
    // Unit tests cover all surfaces, including post-MVP ones that are
    // feature-flagged off by default (see src/lib/features.ts).
    env: {
      VITE_FEATURE_AI: "true",
      VITE_FEATURE_GITHUB: "true",
      VITE_FEATURE_OAUTH: "true",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
