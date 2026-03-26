import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Disable dep optimization entirely to bypass 504 cache corruption
export default defineConfig(({ mode }) => ({
  cacheDir: "node_modules/.vite_v4",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tanstack/react-query": path.resolve(__dirname, "./src/lib/react-query-shim.tsx"),
    },
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
}));
