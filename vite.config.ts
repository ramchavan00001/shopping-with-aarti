import path from "node:path";
import { defineConfig, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { getRequestListener } from "@hono/node-server";

// In dev, the Hono API (/api, /go, /sitemap.xml) runs inside the Vite server so `npm run dev`
// is a single process. server/app.ts is loaded through Vite, so edits hot-reload.
function honoDevServer() {
  return {
    name: "hono-dev-server",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/") && !url.startsWith("/go/") && url !== "/sitemap.xml") return next();
        try {
          const { default: app } = await server.ssrLoadModule("/server/app.ts");
          await getRequestListener((request) => app.fetch(request, process.env))(req, res);
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), honoDevServer()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
