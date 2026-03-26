import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js",
      "lucide-react",
      "sonner",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
      "canvas-confetti",
      "recharts",
      "date-fns",
      "next-themes",
      "react-hook-form",
      "@hookform/resolvers/zod",
      "zod",
      "react-markdown",
      "jspdf",
      "jspdf-autotable",
    ],
    force: true,
  },
}));
