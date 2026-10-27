import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("./src/", import.meta.url));
const spaRoot = fileURLToPath(new URL("./spa/", import.meta.url));
const staticOutput = fileURLToPath(new URL("../ServerMock/wwwroot/", import.meta.url));

export default defineConfig({
  root: spaRoot,
  base: "/",
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "../src/routes",
      generatedRouteTree: "../src/routeTree.central.gen.ts",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": sourceRoot },
  },
  build: {
    outDir: staticOutput,
    emptyOutDir: true,
    sourcemap: false,
  },
});