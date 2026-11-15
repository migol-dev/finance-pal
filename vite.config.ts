import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import fs from "fs";

const OAUTH_API_PATHS = new Set([
  "/oauth/register",
  "/oauth/authorize",
  "/oauth/consent-decision",
  "/oauth/token",
  "/oauth/revoke",
]);

function createMcpDevPlugin(devEnv: Record<string, string>): Plugin {
  return {
    name: "finance-pal-mcp-dev-bridge",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      const envKeys = [
        "SUPABASE_URL",
        "VITE_SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_ANON_KEY",
        "VITE_SUPABASE_ANON_KEY",
        "MCP_JWT_SIGNING_KEY",
        "MCP_ISSUER",
        "MCP_RESOURCE_URL",
        "MCP_ALLOW_LOCALHOST",
      ];
      for (const key of envKeys) {
        if (!process.env[key] && devEnv[key]) {
          process.env[key] = devEnv[key];
        }
      }
      if (!process.env.MCP_ALLOW_LOCALHOST) {
        process.env.MCP_ALLOW_LOCALHOST = "1";
      }

      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const rawUrl = req.url ?? "/";
        const reqUrl = new URL(rawUrl, `http://${req.headers.host ?? "localhost:8080"}`);
        const { pathname } = reqUrl;

        const isWellKnown =
          pathname === "/.well-known/oauth-protected-resource" ||
          pathname === "/.well-known/oauth-authorization-server";
        const isOAuthApi = OAUTH_API_PATHS.has(pathname);
        const isMcpApi = pathname === "/mcp";

        if (!isWellKnown && !isOAuthApi && !isMcpApi) {
          next();
          return;
        }

        void (async () => {
          try {
            const chunks: Buffer[] = [];
            const method = (req.method ?? "GET").toUpperCase();
            if (method !== "GET" && method !== "HEAD") {
              await new Promise<void>((resolve, reject) => {
                req.on("data", (chunk: Buffer) => chunks.push(chunk));
                req.on("end", () => resolve());
                req.on("error", reject);
              });
            }

            const headers = new Headers();
            for (const [k, v] of Object.entries(req.headers)) {
              if (Array.isArray(v)) {
                headers.set(k, v.join(", "));
              } else if (typeof v === "string") {
                headers.set(k, v);
              }
            }

            const webReq = new Request(reqUrl.toString(), {
              method,
              headers,
              body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
            });

            let webRes: Response;
            if (isWellKnown) {
              const mod = (await server.ssrLoadModule("/api/well-known.ts")) as {
                handleWellKnownRequest: (request: Request) => Promise<Response>;
              };
              webRes = await mod.handleWellKnownRequest(webReq);
            } else if (isOAuthApi) {
              const mod = (await server.ssrLoadModule("/api/oauth.ts")) as {
                handleOAuthRequest: (request: Request) => Promise<Response>;
              };
              webRes = await mod.handleOAuthRequest(webReq);
            } else {
              const mod = (await server.ssrLoadModule("/api/mcp.ts")) as {
                handleMcpRequest: (request: Request) => Promise<Response>;
              };
              webRes = await mod.handleMcpRequest(webReq);
            }

            res.statusCode = webRes.status;
            webRes.headers.forEach((value, key) => {
              res.setHeader(key, value);
            });
            const body = Buffer.from(await webRes.arrayBuffer());
            res.end(body);
          } catch (error) {
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(
                JSON.stringify({
                  error: "dev_bridge_error",
                  message: error instanceof Error ? error.message : "Unknown dev bridge error",
                }),
              );
            }
          }
        })();
      });
    },
  };
}

// Read package.json version
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
const appVersion = packageJson.version;

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const _env = loadEnv(mode, process.cwd(), '');
  return {
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
      command === "serve" && createMcpDevPlugin(_env),
      mode === "development" && componentTagger(),
      // Optimización: Generar reporte visual del bundle (solo producción o con ANALYZE=true)
      (mode === "production" || process.env.ANALYZE === "true") &&
        visualizer({
          open: false,
          filename: "dist/stats.html",
          gzipSize: true,
          brotliSize: true,
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
              if (id.includes("embla-carousel") || id.includes("react-day-picker") || id.includes("react-window")) {
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
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
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
  };
});