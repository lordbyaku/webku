import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: "../cms-worker/public",
    emptyOutDir: true,
    target: "es2020",
    assetsInlineLimit: 0,
  },
  server: {
    proxy: {
      "/api": { target: "http://localhost:8787", headers: { origin: "http://localhost:8787" } },
    },
  },
});
