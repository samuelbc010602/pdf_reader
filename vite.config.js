
import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  define: {
    __DEV_MODE__: JSON.stringify(true),
    __DEV_SCENARIO__: JSON.stringify("signing"),
  },

  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },

  optimizeDeps: {
    include: [
      "use-sync-external-store",
      "use-sync-external-store/shim"
    ],
  },
})
