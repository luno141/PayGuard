import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/analyst/",
  root: path.resolve(__dirname, "analyst"),
  publicDir: path.resolve(__dirname, "public"),
  plugins: [react()],
  server: {
    port: 5174,
    host: "0.0.0.0",
    open: false,
    fs: {
      allow: [__dirname],
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/analyst"),
    emptyOutDir: true,
  },
});
