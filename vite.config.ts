import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import compression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react({
      useAtYourOwnRisk_mutateSwcOptions: () => {},
    }),
    mode === "development" && componentTagger(),
    // Optimización: Generar reporte visual del bundle (solo producción o con ANALYZE=true)
    (mode === "production" || process.env.ANALYZE === "true") &&
      visualizer({
        open: false,
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
      }),
    // Optimización: Compresión de assets en producción
    mode === "production" &&
      compression({
        algorithm: "brotliCompress",
        ext: ".br",
      }),
    mode === "production" &&
      compression({
        algorithm: "gzip",
        ext: ".gz",
      }),
  ].filter(Boolean),
  build: {
    chunkSizeWarningLimit: 1000,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    reportCompressedSize: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
              return "vendor-react";
            }
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            // Further split large vendor chunk into smaller logical groups
            if (id.includes("@tanstack") || id.includes("@tanstack/react-query")) {
              return "vendor-query";
            }
            if (id.includes("cmdk")) {
              return "vendor-cmdk";
            }
            if (id.includes("class-variance-authority") || id.includes("tailwind-merge") || id.includes("tailwindcss-animate")) {
              return "vendor-ui-utils";
            }
            if (id.includes("sonner")) {
              return "vendor-notify";
            }
            if (id.includes("framer-motion")) {
              return "vendor-framer";
            }
            if (id.includes("@radix-ui")) {
              return "vendor-radix";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (id.includes("date-fns") || id.includes("zod") || id.includes("clsx")) {
              return "vendor-utils";
            }
            if (id.includes("cmdk") || id.includes("embla-carousel") || id.includes("react-day-picker") || id.includes("react-window")) {
              return "vendor-widgets";
            }
            return "vendor";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core", "react-router", "react-router-dom"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "framer-motion",
      "lucide-react",
      "recharts",
      "react-window",
      "@tanstack/react-query",
      "cmdk",
      "class-variance-authority",
      "tailwind-merge",
      "sonner",
    ],
  },
}));
