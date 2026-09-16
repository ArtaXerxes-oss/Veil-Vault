import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [wasm(), react()],
  resolve: {
    dedupe: ["@midnight-ntwrk/compact-runtime"]
  },
  optimizeDeps: {
    include: ["@midnight-ntwrk/compact-runtime"],
    exclude: ["@midnight-ntwrk/onchain-runtime-v3"]
  },
  define: {
    "process.env": {},
    global: "globalThis"
  },
  build: {
    target: "esnext",
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.code === "SOURCEMAP_ERROR") return;
        defaultHandler(warning);
      }
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.mjs", "tests/**/*.test.ts"]
  }
});
