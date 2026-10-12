import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [
    preact(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["icon.svg", "icon-180.png", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "X Marks",
        short_name: "X Marks",
        description: "X Marks the Spot – zapisz ciekawe miejsce jednym stuknięciem.",
        lang: "pl",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#11161a",
        theme_color: "#11161a",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "icon.svg", sizes: "any", type: "image/svg+xml" },
        ],
        shortcuts: [
          { name: "Dron tutaj", url: "./#dron" },
          { name: "Chill tutaj", url: "./#chill" },
          { name: "Cozy tutaj", url: "./#cozy" },
        ],
        share_target: {
          action: "./",
          method: "GET",
          params: { title: "title", text: "text", url: "url" },
        },
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,ico}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  worker: { format: "es" },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
