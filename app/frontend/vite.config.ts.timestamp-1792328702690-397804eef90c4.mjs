// vite.config.ts
import { defineConfig } from "file:///workspace/app/frontend/node_modules/.pnpm/vite@5.4.21_@types+node@22.20.0_terser@5.48.0/node_modules/vite/dist/node/index.js";
import react from "file:///workspace/app/frontend/node_modules/.pnpm/@vitejs+plugin-react-swc@3.11.0_vite@5.4.21_@types+node@22.20.0_terser@5.48.0_/node_modules/@vitejs/plugin-react-swc/index.js";
import fs3 from "node:fs";
import path4 from "path";
import { viteSourceLocator } from "file:///workspace/app/frontend/node_modules/.pnpm/@metagptx+vite-plugin-source-locator@0.0.19_rollup@4.62.2_vite@5.4.21_@types+node@22.20.0_terser@5.48.0_/node_modules/@metagptx/vite-plugin-source-locator/dist/index.mjs";
import { atoms } from "file:///workspace/app/frontend/node_modules/.pnpm/@metagptx+web-sdk@0.0.77_@babel+parser@7.29.7_@babel+traverse@7.29.7_@babel+types@7.29._89b1389acdea2b227dc53dec2d6e8374/node_modules/@metagptx/web-sdk/dist/plugins.js";
import { vitePrerenderPlugin } from "file:///workspace/app/frontend/node_modules/.pnpm/vite-prerender-plugin@0.5.13_vite@5.4.21_@types+node@22.20.0_terser@5.48.0_/node_modules/vite-prerender-plugin/src/index.js";
import Sitemap from "file:///workspace/app/frontend/node_modules/.pnpm/vite-plugin-sitemap@0.8.2/node_modules/vite-plugin-sitemap/dist/index.js";

// prerender/blog-routes.js
import path2 from "node:path";

// prerender/utils.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __vite_injected_original_import_meta_url = "file:///workspace/app/frontend/prerender/utils.js";
var currentFile = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname2 = path.dirname(currentFile);
var projectRoot = path.resolve(__dirname2, "..");
var seoContentDir = path.resolve(projectRoot, "seo", "content");
function normalizeRouteFromMarkdown(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/\/index\.md$/, "").replace(/\.md$/, "");
  return normalized ? `/blog/${normalized}/` : "/blog/";
}
function collectMarkdownFiles(dir, bucket = []) {
  if (!fs.existsSync(dir)) {
    return bucket;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(fullPath, bucket);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      bucket.push(fullPath);
    }
  }
  return bucket;
}

// prerender/blog-routes.js
function getBlogRoutes() {
  const routes = /* @__PURE__ */ new Set(["/blog/"]);
  for (const filePath of collectMarkdownFiles(seoContentDir)) {
    const relativePath = path2.relative(seoContentDir, filePath);
    routes.add(normalizeRouteFromMarkdown(relativePath));
  }
  return Array.from(routes).sort();
}

// prerender/blog-sitemap.js
import fs2 from "node:fs";
import path3 from "node:path";
function collectMarkdownLastmod(dir) {
  const bucket = {};
  for (const fullPath of collectMarkdownFiles(dir)) {
    const relativePath = path3.relative(seoContentDir, fullPath);
    const route = normalizeRouteFromMarkdown(relativePath);
    bucket[route] = fs2.statSync(fullPath).mtime;
  }
  return bucket;
}
function getLatestContentMtime(lastmodMap) {
  const dates = Object.values(lastmodMap).filter((value) => value instanceof Date);
  if (dates.length === 0) {
    return void 0;
  }
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}
function getSitemapLastmod() {
  const contentLastmod = collectMarkdownLastmod(seoContentDir);
  const latestContentMtime = getLatestContentMtime(contentLastmod);
  return {
    ...latestContentMtime ? { "/blog/": latestContentMtime } : {},
    ...contentLastmod
  };
}

// plugins/react-hmr-guard.ts
import ts from "file:///workspace/app/frontend/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/typescript.js";
import { normalizePath } from "file:///workspace/app/frontend/node_modules/.pnpm/vite@5.4.21_@types+node@22.20.0_terser@5.48.0/node_modules/vite/dist/node/index.js";
function identity(node) {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node)) {
    return identity(node.expression);
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) {
    return `function:${node.name?.text ?? ""}`;
  }
  if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
    const bases = node.heritageClauses?.flatMap(
      (clause) => clause.types.map((type) => identity(type.expression))
    );
    return `class:${node.name?.text ?? ""}:${bases?.join(",") ?? ""}`;
  }
  if (ts.isPropertyAccessExpression(node))
    return `${identity(node.expression)}.${node.name.text}`;
  if (ts.isCallExpression(node)) {
    return `${identity(node.expression)}(${node.arguments.map(identity).join(",")})`;
  }
  if (ts.isObjectLiteralExpression(node)) {
    return `{${node.properties.map((property) => {
      if (ts.isPropertyAssignment(property))
        return `${property.name.getText()}:${identity(property.initializer)}`;
      if (ts.isShorthandPropertyAssignment(property))
        return property.name.text;
      if (ts.isSpreadAssignment(property))
        return `...${identity(property.expression)}`;
      return property.name?.getText() ?? "";
    }).sort().join(",")}}`;
  }
  return ts.SyntaxKind[node.kind];
}
function componentSignature(code, file) {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  const entries = [];
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
      const exported = statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      );
      const defaultExport = statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword
      );
      if (defaultExport || /^[A-Z]/.test(statement.name?.text ?? "")) {
        entries.push(
          `${defaultExport ? "default" : exported ? "export" : "local"}:${identity(statement)}`
        );
      }
    } else if (ts.isVariableStatement(statement)) {
      const exported = statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      );
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && /^[A-Z]/.test(declaration.name.text) && declaration.initializer) {
          entries.push(
            `${exported ? "export" : "local"}:${declaration.name.text}:${identity(declaration.initializer)}`
          );
        }
      }
    } else if (ts.isExportAssignment(statement)) {
      entries.push(`default:${identity(statement.expression)}`);
    } else if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      const clause = statement.exportClause;
      const names = clause && ts.isNamedExports(clause) ? clause.elements.filter((element) => !element.isTypeOnly).map(
        (element) => `${element.propertyName?.text ?? element.name.text}:${element.name.text}`
      ).sort().join(",") : clause?.getText() ?? "*";
      if (names)
        entries.push(
          `exports:${statement.moduleSpecifier?.getText() ?? ""}:${names}`
        );
    }
  }
  return JSON.stringify(entries.sort());
}
function reactHmrGuard() {
  const signatures = /* @__PURE__ */ new Map();
  const isSource = (id) => /\.[cm]?[jt]sx?$/.test(id) && !id.includes("/node_modules/") && !id.includes("\0");
  return {
    name: "react-hmr-guard",
    apply: "serve",
    enforce: "pre",
    transform(code, id, options) {
      const file = normalizePath(id);
      if (!options?.ssr && isSource(file) && !signatures.has(file)) {
        signatures.set(file, componentSignature(code, file));
      }
    },
    async handleHotUpdate({ file, read, modules, server, timestamp }) {
      const key = normalizePath(file);
      const previous = signatures.get(key);
      if (previous === void 0 || modules.length === 0) return;
      const next = componentSignature(await read(), key);
      signatures.set(key, next);
      if (previous === next) return;
      const invalidated = /* @__PURE__ */ new Set();
      for (const module of modules) {
        server.moduleGraph.invalidateModule(
          module,
          invalidated,
          timestamp,
          true
        );
      }
      server.ws.send({ type: "full-reload", path: "*" });
      return [];
    },
    watchChange(id, { event }) {
      if (event === "delete") signatures.delete(normalizePath(id));
    }
  };
}

// vite.config.ts
var __vite_injected_original_dirname = "/workspace/app/frontend";
function escapeHtmlAttr(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
process.env.VITE_APP_TITLE ??= process.env.OVERVIEW_TITLE ?? "shadcnui";
process.env.VITE_APP_DESCRIPTION ??= process.env.OVERVIEW_DESCRIPTION ?? "Atoms Generated Project";
process.env.VITE_APP_TITLE = escapeHtmlAttr(process.env.VITE_APP_TITLE);
process.env.VITE_APP_DESCRIPTION = escapeHtmlAttr(process.env.VITE_APP_DESCRIPTION);
process.env.VITE_APP_LOGO_URL ??= process.env.OVERVIEW_LOGO_URL ?? "https://public-frontend-cos.metadl.com/mgx/img/favicon_atoms.ico";
function ensureBuildOutDir() {
  let outDir = path4.resolve(__vite_injected_original_dirname, "dist");
  return {
    name: "ensure-build-out-dir",
    configResolved(config) {
      outDir = path4.resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      fs3.mkdirSync(outDir, { recursive: true });
    }
  };
}
var vite_config_default = defineConfig(({ command }) => {
  const blogPrerenderRoutes = command === "build" ? getBlogRoutes() : [];
  return {
    plugins: [
      viteSourceLocator({
        prefix: "mgx"
        // Prefix used to identify source locations; do not change.
      }),
      reactHmrGuard(),
      react(),
      atoms(),
      ensureBuildOutDir(),
      Sitemap({
        hostname: "https://atoms.template.com",
        lastmod: getSitemapLastmod(),
        readable: true,
        generateRobotsTxt: true
      }),
      ...blogPrerenderRoutes.length > 0 ? vitePrerenderPlugin({
        renderTarget: "#root",
        prerenderScript: path4.resolve(__vite_injected_original_dirname, "prerender/blog.js"),
        additionalPrerenderRoutes: blogPrerenderRoutes
      }) : []
    ],
    resolve: {
      alias: {
        "@": path4.resolve(__vite_injected_original_dirname, "./src")
      }
    },
    server: {
      host: "0.0.0.0",
      // Listen on all network interfaces.
      port: parseInt(process.env.VITE_PORT || "3000"),
      proxy: {
        "/api": {
          target: `http://localhost:${process.env.BACKEND_PORT || "8000"}`,
          changeOrigin: true
        }
      },
      watch: { usePolling: true, interval: 600 }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks
            "react-vendor": ["react", "react-dom"],
            "router-vendor": ["react-router-dom"],
            "ui-vendor": [
              "@radix-ui/react-accordion",
              "@radix-ui/react-alert-dialog",
              "@radix-ui/react-aspect-ratio",
              "@radix-ui/react-avatar",
              "@radix-ui/react-checkbox",
              "@radix-ui/react-collapsible",
              "@radix-ui/react-context-menu",
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-hover-card",
              "@radix-ui/react-label",
              "@radix-ui/react-menubar",
              "@radix-ui/react-navigation-menu",
              "@radix-ui/react-popover",
              "@radix-ui/react-progress",
              "@radix-ui/react-radio-group",
              "@radix-ui/react-scroll-area",
              "@radix-ui/react-select",
              "@radix-ui/react-separator",
              "@radix-ui/react-slider",
              "@radix-ui/react-slot",
              "@radix-ui/react-switch",
              "@radix-ui/react-tabs",
              "@radix-ui/react-toast",
              "@radix-ui/react-toggle",
              "@radix-ui/react-toggle-group",
              "@radix-ui/react-tooltip"
            ],
            "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
            "utils-vendor": [
              "axios",
              "clsx",
              "tailwind-merge",
              "class-variance-authority",
              "date-fns",
              "lucide-react"
            ],
            "query-vendor": ["@tanstack/react-query"]
          }
        }
      },
      chunkSizeWarningLimit: 1e3
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicHJlcmVuZGVyL2Jsb2ctcm91dGVzLmpzIiwgInByZXJlbmRlci91dGlscy5qcyIsICJwcmVyZW5kZXIvYmxvZy1zaXRlbWFwLmpzIiwgInBsdWdpbnMvcmVhY3QtaG1yLWd1YXJkLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL3dvcmtzcGFjZS9hcHAvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi93b3Jrc3BhY2UvYXBwL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy93b3Jrc3BhY2UvYXBwL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djJztcbmltcG9ydCBmcyBmcm9tICdub2RlOmZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgdml0ZVNvdXJjZUxvY2F0b3IgfSBmcm9tICdAbWV0YWdwdHgvdml0ZS1wbHVnaW4tc291cmNlLWxvY2F0b3InO1xuaW1wb3J0IHsgYXRvbXMgfSBmcm9tICdAbWV0YWdwdHgvd2ViLXNkay9wbHVnaW5zJztcbmltcG9ydCB7IHZpdGVQcmVyZW5kZXJQbHVnaW4gfSBmcm9tICd2aXRlLXByZXJlbmRlci1wbHVnaW4nO1xuaW1wb3J0IFNpdGVtYXAgZnJvbSAndml0ZS1wbHVnaW4tc2l0ZW1hcCc7XG5pbXBvcnQgeyBnZXRCbG9nUm91dGVzIH0gZnJvbSAnLi9wcmVyZW5kZXIvYmxvZy1yb3V0ZXMuanMnO1xuaW1wb3J0IHsgZ2V0U2l0ZW1hcExhc3Rtb2QgfSBmcm9tICcuL3ByZXJlbmRlci9ibG9nLXNpdGVtYXAuanMnO1xuaW1wb3J0IHsgcmVhY3RIbXJHdWFyZCB9IGZyb20gJy4vcGx1Z2lucy9yZWFjdC1obXItZ3VhcmQnO1xuXG5mdW5jdGlvbiBlc2NhcGVIdG1sQXR0cihzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBzdHJcbiAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpXG4gICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuICAgIC5yZXBsYWNlKC8nL2csICcmIzM5OycpO1xufVxuXG5wcm9jZXNzLmVudi5WSVRFX0FQUF9USVRMRSA/Pz0gcHJvY2Vzcy5lbnYuT1ZFUlZJRVdfVElUTEUgPz8gJ3NoYWRjbnVpJztcbnByb2Nlc3MuZW52LlZJVEVfQVBQX0RFU0NSSVBUSU9OID8/PSBwcm9jZXNzLmVudi5PVkVSVklFV19ERVNDUklQVElPTiA/PyAnQXRvbXMgR2VuZXJhdGVkIFByb2plY3QnO1xucHJvY2Vzcy5lbnYuVklURV9BUFBfVElUTEUgPSBlc2NhcGVIdG1sQXR0cihwcm9jZXNzLmVudi5WSVRFX0FQUF9USVRMRSk7XG5wcm9jZXNzLmVudi5WSVRFX0FQUF9ERVNDUklQVElPTiA9IGVzY2FwZUh0bWxBdHRyKHByb2Nlc3MuZW52LlZJVEVfQVBQX0RFU0NSSVBUSU9OKTtcbnByb2Nlc3MuZW52LlZJVEVfQVBQX0xPR09fVVJMID8/PSBwcm9jZXNzLmVudi5PVkVSVklFV19MT0dPX1VSTCA/PyAnaHR0cHM6Ly9wdWJsaWMtZnJvbnRlbmQtY29zLm1ldGFkbC5jb20vbWd4L2ltZy9mYXZpY29uX2F0b21zLmljbyc7XG5cbmZ1bmN0aW9uIGVuc3VyZUJ1aWxkT3V0RGlyKCkge1xuICBsZXQgb3V0RGlyID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2Rpc3QnKTtcblxuICByZXR1cm4ge1xuICAgIG5hbWU6ICdlbnN1cmUtYnVpbGQtb3V0LWRpcicsXG4gICAgY29uZmlnUmVzb2x2ZWQoY29uZmlnKSB7XG4gICAgICBvdXREaXIgPSBwYXRoLnJlc29sdmUoY29uZmlnLnJvb3QsIGNvbmZpZy5idWlsZC5vdXREaXIpO1xuICAgIH0sXG4gICAgd3JpdGVCdW5kbGUoKSB7XG4gICAgICBmcy5ta2RpclN5bmMob3V0RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICB9LFxuICB9O1xufVxuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IGNvbW1hbmQgfSkgPT4ge1xuICBjb25zdCBibG9nUHJlcmVuZGVyUm91dGVzID0gY29tbWFuZCA9PT0gJ2J1aWxkJyA/IGdldEJsb2dSb3V0ZXMoKSA6IFtdO1xuXG4gIHJldHVybiB7XG4gICAgcGx1Z2luczogW1xuICAgICAgdml0ZVNvdXJjZUxvY2F0b3Ioe1xuICAgICAgICBwcmVmaXg6ICdtZ3gnLCAvLyBQcmVmaXggdXNlZCB0byBpZGVudGlmeSBzb3VyY2UgbG9jYXRpb25zOyBkbyBub3QgY2hhbmdlLlxuICAgICAgfSksXG4gICAgICByZWFjdEhtckd1YXJkKCksXG4gICAgICByZWFjdCgpLFxuICAgICAgYXRvbXMoKSxcbiAgICAgIGVuc3VyZUJ1aWxkT3V0RGlyKCksXG4gICAgICBTaXRlbWFwKHtcbiAgICAgICAgaG9zdG5hbWU6ICdodHRwczovL2F0b21zLnRlbXBsYXRlLmNvbScsXG4gICAgICAgIGxhc3Rtb2Q6IGdldFNpdGVtYXBMYXN0bW9kKCksXG4gICAgICAgIHJlYWRhYmxlOiB0cnVlLFxuICAgICAgICBnZW5lcmF0ZVJvYm90c1R4dDogdHJ1ZSxcbiAgICAgIH0pLFxuICAgICAgLi4uKGJsb2dQcmVyZW5kZXJSb3V0ZXMubGVuZ3RoID4gMFxuICAgICAgICA/IHZpdGVQcmVyZW5kZXJQbHVnaW4oe1xuICAgICAgICAgICAgcmVuZGVyVGFyZ2V0OiAnI3Jvb3QnLFxuICAgICAgICAgICAgcHJlcmVuZGVyU2NyaXB0OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAncHJlcmVuZGVyL2Jsb2cuanMnKSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxQcmVyZW5kZXJSb3V0ZXM6IGJsb2dQcmVyZW5kZXJSb3V0ZXMsXG4gICAgICAgICAgfSlcbiAgICAgICAgOiBbXSksXG4gICAgXSxcbiAgICByZXNvbHZlOiB7XG4gICAgICBhbGlhczoge1xuICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHNlcnZlcjoge1xuICAgICAgaG9zdDogJzAuMC4wLjAnLCAvLyBMaXN0ZW4gb24gYWxsIG5ldHdvcmsgaW50ZXJmYWNlcy5cbiAgICAgIHBvcnQ6IHBhcnNlSW50KHByb2Nlc3MuZW52LlZJVEVfUE9SVCB8fCAnMzAwMCcpLFxuICAgICAgcHJveHk6IHtcbiAgICAgICAgJy9hcGknOiB7XG4gICAgICAgICAgdGFyZ2V0OiBgaHR0cDovL2xvY2FsaG9zdDoke3Byb2Nlc3MuZW52LkJBQ0tFTkRfUE9SVCB8fCAnODAwMCd9YCxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgd2F0Y2g6IHsgdXNlUG9sbGluZzogdHJ1ZSwgaW50ZXJ2YWw6IDYwMCB9LFxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgICAvLyBWZW5kb3IgY2h1bmtzXG4gICAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgICAgICAgICdyb3V0ZXItdmVuZG9yJzogWydyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgICAndWktdmVuZG9yJzogW1xuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWFjY29yZGlvbicsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtYWxlcnQtZGlhbG9nJyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1hc3BlY3QtcmF0aW8nLFxuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWF2YXRhcicsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtY2hlY2tib3gnLFxuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWNvbGxhcHNpYmxlJyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1jb250ZXh0LW1lbnUnLFxuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudScsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtaG92ZXItY2FyZCcsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtbGFiZWwnLFxuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LW1lbnViYXInLFxuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LW5hdmlnYXRpb24tbWVudScsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtcG9wb3ZlcicsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtcHJvZ3Jlc3MnLFxuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXJhZGlvLWdyb3VwJyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zY3JvbGwtYXJlYScsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2VsZWN0JyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zZXBhcmF0b3InLFxuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXNsaWRlcicsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2xvdCcsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc3dpdGNoJyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC10YWJzJyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC10b2FzdCcsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdG9nZ2xlJyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC10b2dnbGUtZ3JvdXAnLFxuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXRvb2x0aXAnLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICdmb3JtLXZlbmRvcic6IFsncmVhY3QtaG9vay1mb3JtJywgJ0Bob29rZm9ybS9yZXNvbHZlcnMnLCAnem9kJ10sXG4gICAgICAgICAgICAndXRpbHMtdmVuZG9yJzogW1xuICAgICAgICAgICAgICAnYXhpb3MnLFxuICAgICAgICAgICAgICAnY2xzeCcsXG4gICAgICAgICAgICAgICd0YWlsd2luZC1tZXJnZScsXG4gICAgICAgICAgICAgICdjbGFzcy12YXJpYW5jZS1hdXRob3JpdHknLFxuICAgICAgICAgICAgICAnZGF0ZS1mbnMnLFxuICAgICAgICAgICAgICAnbHVjaWRlLXJlYWN0JyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAncXVlcnktdmVuZG9yJzogWydAdGFuc3RhY2svcmVhY3QtcXVlcnknXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcbiAgICB9LFxuICB9O1xufSk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi93b3Jrc3BhY2UvYXBwL2Zyb250ZW5kL3ByZXJlbmRlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL3dvcmtzcGFjZS9hcHAvZnJvbnRlbmQvcHJlcmVuZGVyL2Jsb2ctcm91dGVzLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy93b3Jrc3BhY2UvYXBwL2Zyb250ZW5kL3ByZXJlbmRlci9ibG9nLXJvdXRlcy5qc1wiO2ltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBzZW9Db250ZW50RGlyLCBub3JtYWxpemVSb3V0ZUZyb21NYXJrZG93biwgY29sbGVjdE1hcmtkb3duRmlsZXMgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEJsb2dSb3V0ZXMoKSB7XG4gIGNvbnN0IHJvdXRlcyA9IG5ldyBTZXQoWycvYmxvZy8nXSk7XG5cbiAgZm9yIChjb25zdCBmaWxlUGF0aCBvZiBjb2xsZWN0TWFya2Rvd25GaWxlcyhzZW9Db250ZW50RGlyKSkge1xuICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHBhdGgucmVsYXRpdmUoc2VvQ29udGVudERpciwgZmlsZVBhdGgpO1xuICAgIHJvdXRlcy5hZGQobm9ybWFsaXplUm91dGVGcm9tTWFya2Rvd24ocmVsYXRpdmVQYXRoKSk7XG4gIH1cblxuICByZXR1cm4gQXJyYXkuZnJvbShyb3V0ZXMpLnNvcnQoKTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL3dvcmtzcGFjZS9hcHAvZnJvbnRlbmQvcHJlcmVuZGVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvd29ya3NwYWNlL2FwcC9mcm9udGVuZC9wcmVyZW5kZXIvdXRpbHMuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL3dvcmtzcGFjZS9hcHAvZnJvbnRlbmQvcHJlcmVuZGVyL3V0aWxzLmpzXCI7aW1wb3J0IGZzIGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCc7XG5cbmNvbnN0IGN1cnJlbnRGaWxlID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGN1cnJlbnRGaWxlKTtcbmNvbnN0IHByb2plY3RSb290ID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJyk7XG5cbmV4cG9ydCBjb25zdCBzZW9Db250ZW50RGlyID0gcGF0aC5yZXNvbHZlKHByb2plY3RSb290LCAnc2VvJywgJ2NvbnRlbnQnKTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVJvdXRlRnJvbU1hcmtkb3duKHJlbGF0aXZlUGF0aCkge1xuICBjb25zdCBub3JtYWxpemVkID0gcmVsYXRpdmVQYXRoXG4gICAgLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgIC5yZXBsYWNlKC9cXC9pbmRleFxcLm1kJC8sICcnKVxuICAgIC5yZXBsYWNlKC9cXC5tZCQvLCAnJyk7XG5cbiAgcmV0dXJuIG5vcm1hbGl6ZWQgPyBgL2Jsb2cvJHtub3JtYWxpemVkfS9gIDogJy9ibG9nLyc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb2xsZWN0TWFya2Rvd25GaWxlcyhkaXIsIGJ1Y2tldCA9IFtdKSB7XG4gIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgcmV0dXJuIGJ1Y2tldDtcbiAgfVxuXG4gIGZvciAoY29uc3QgZW50cnkgb2YgZnMucmVhZGRpclN5bmMoZGlyLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSkpIHtcbiAgICBpZiAoZW50cnkubmFtZS5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGRpciwgZW50cnkubmFtZSk7XG4gICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIGNvbGxlY3RNYXJrZG93bkZpbGVzKGZ1bGxQYXRoLCBidWNrZXQpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGVudHJ5LmlzRmlsZSgpICYmIGVudHJ5Lm5hbWUuZW5kc1dpdGgoJy5tZCcpKSB7XG4gICAgICBidWNrZXQucHVzaChmdWxsUGF0aCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1Y2tldDtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL3dvcmtzcGFjZS9hcHAvZnJvbnRlbmQvcHJlcmVuZGVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvd29ya3NwYWNlL2FwcC9mcm9udGVuZC9wcmVyZW5kZXIvYmxvZy1zaXRlbWFwLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy93b3Jrc3BhY2UvYXBwL2Zyb250ZW5kL3ByZXJlbmRlci9ibG9nLXNpdGVtYXAuanNcIjtpbXBvcnQgZnMgZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgc2VvQ29udGVudERpciwgbm9ybWFsaXplUm91dGVGcm9tTWFya2Rvd24sIGNvbGxlY3RNYXJrZG93bkZpbGVzIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmZ1bmN0aW9uIGNvbGxlY3RNYXJrZG93bkxhc3Rtb2QoZGlyKSB7XG4gIGNvbnN0IGJ1Y2tldCA9IHt9O1xuXG4gIGZvciAoY29uc3QgZnVsbFBhdGggb2YgY29sbGVjdE1hcmtkb3duRmlsZXMoZGlyKSkge1xuICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHBhdGgucmVsYXRpdmUoc2VvQ29udGVudERpciwgZnVsbFBhdGgpO1xuICAgIGNvbnN0IHJvdXRlID0gbm9ybWFsaXplUm91dGVGcm9tTWFya2Rvd24ocmVsYXRpdmVQYXRoKTtcbiAgICBidWNrZXRbcm91dGVdID0gZnMuc3RhdFN5bmMoZnVsbFBhdGgpLm10aW1lO1xuICB9XG5cbiAgcmV0dXJuIGJ1Y2tldDtcbn1cblxuZnVuY3Rpb24gZ2V0TGF0ZXN0Q29udGVudE10aW1lKGxhc3Rtb2RNYXApIHtcbiAgY29uc3QgZGF0ZXMgPSBPYmplY3QudmFsdWVzKGxhc3Rtb2RNYXApLmZpbHRlcigodmFsdWUpID0+IHZhbHVlIGluc3RhbmNlb2YgRGF0ZSk7XG5cbiAgaWYgKGRhdGVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICByZXR1cm4gbmV3IERhdGUoTWF0aC5tYXgoLi4uZGF0ZXMubWFwKChkYXRlKSA9PiBkYXRlLmdldFRpbWUoKSkpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFNpdGVtYXBMYXN0bW9kKCkge1xuICBjb25zdCBjb250ZW50TGFzdG1vZCA9IGNvbGxlY3RNYXJrZG93bkxhc3Rtb2Qoc2VvQ29udGVudERpcik7XG4gIGNvbnN0IGxhdGVzdENvbnRlbnRNdGltZSA9IGdldExhdGVzdENvbnRlbnRNdGltZShjb250ZW50TGFzdG1vZCk7XG5cbiAgcmV0dXJuIHtcbiAgICAuLi4obGF0ZXN0Q29udGVudE10aW1lID8geyAnL2Jsb2cvJzogbGF0ZXN0Q29udGVudE10aW1lIH0gOiB7fSksXG4gICAgLi4uY29udGVudExhc3Rtb2QsXG4gIH07XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi93b3Jrc3BhY2UvYXBwL2Zyb250ZW5kL3BsdWdpbnNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi93b3Jrc3BhY2UvYXBwL2Zyb250ZW5kL3BsdWdpbnMvcmVhY3QtaG1yLWd1YXJkLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy93b3Jrc3BhY2UvYXBwL2Zyb250ZW5kL3BsdWdpbnMvcmVhY3QtaG1yLWd1YXJkLnRzXCI7aW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgbm9ybWFsaXplUGF0aCwgdHlwZSBNb2R1bGVOb2RlLCB0eXBlIFBsdWdpbiB9IGZyb20gJ3ZpdGUnO1xuXG4vLyBDb21wYXJlIGNvbXBvbmVudCBpZGVudGl0aWVzLCBleGNsdWRpbmcgYm9kaWVzLCBwcm9wcyBhbmQgdHlwZSBhbm5vdGF0aW9ucyBzb1xuLy8gb3JkaW5hcnkgZWRpdHMgc3RpbGwgdXNlIFJlYWN0IEZhc3QgUmVmcmVzaCBhbmQgcHJlc2VydmUgY29tcG9uZW50IHN0YXRlLlxuZnVuY3Rpb24gaWRlbnRpdHkobm9kZTogdHMuTm9kZSk6IHN0cmluZyB7XG4gIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZSkpIHJldHVybiBub2RlLnRleHQ7XG4gIGlmIChcbiAgICB0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpIHx8XG4gICAgdHMuaXNBc0V4cHJlc3Npb24obm9kZSkgfHxcbiAgICB0cy5pc1NhdGlzZmllc0V4cHJlc3Npb24obm9kZSkgfHxcbiAgICB0cy5pc05vbk51bGxFeHByZXNzaW9uKG5vZGUpXG4gICkge1xuICAgIHJldHVybiBpZGVudGl0eShub2RlLmV4cHJlc3Npb24pO1xuICB9XG4gIGlmIChcbiAgICB0cy5pc0Fycm93RnVuY3Rpb24obm9kZSkgfHxcbiAgICB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihub2RlKSB8fFxuICAgIHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKVxuICApIHtcbiAgICByZXR1cm4gYGZ1bmN0aW9uOiR7bm9kZS5uYW1lPy50ZXh0ID8/ICcnfWA7XG4gIH1cbiAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSB8fCB0cy5pc0NsYXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgIGNvbnN0IGJhc2VzID0gbm9kZS5oZXJpdGFnZUNsYXVzZXM/LmZsYXRNYXAoY2xhdXNlID0+XG4gICAgICBjbGF1c2UudHlwZXMubWFwKHR5cGUgPT4gaWRlbnRpdHkodHlwZS5leHByZXNzaW9uKSlcbiAgICApO1xuICAgIHJldHVybiBgY2xhc3M6JHtub2RlLm5hbWU/LnRleHQgPz8gJyd9OiR7YmFzZXM/LmpvaW4oJywnKSA/PyAnJ31gO1xuICB9XG4gIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlKSlcbiAgICByZXR1cm4gYCR7aWRlbnRpdHkobm9kZS5leHByZXNzaW9uKX0uJHtub2RlLm5hbWUudGV4dH1gO1xuICBpZiAodHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSkge1xuICAgIHJldHVybiBgJHtpZGVudGl0eShub2RlLmV4cHJlc3Npb24pfSgke25vZGUuYXJndW1lbnRzLm1hcChpZGVudGl0eSkuam9pbignLCcpfSlgO1xuICB9XG4gIGlmICh0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgcmV0dXJuIGB7JHtub2RlLnByb3BlcnRpZXNcbiAgICAgIC5tYXAocHJvcGVydHkgPT4ge1xuICAgICAgICBpZiAodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcGVydHkpKVxuICAgICAgICAgIHJldHVybiBgJHtwcm9wZXJ0eS5uYW1lLmdldFRleHQoKX06JHtpZGVudGl0eShwcm9wZXJ0eS5pbml0aWFsaXplcil9YDtcbiAgICAgICAgaWYgKHRzLmlzU2hvcnRoYW5kUHJvcGVydHlBc3NpZ25tZW50KHByb3BlcnR5KSlcbiAgICAgICAgICByZXR1cm4gcHJvcGVydHkubmFtZS50ZXh0O1xuICAgICAgICBpZiAodHMuaXNTcHJlYWRBc3NpZ25tZW50KHByb3BlcnR5KSlcbiAgICAgICAgICByZXR1cm4gYC4uLiR7aWRlbnRpdHkocHJvcGVydHkuZXhwcmVzc2lvbil9YDtcbiAgICAgICAgcmV0dXJuIHByb3BlcnR5Lm5hbWU/LmdldFRleHQoKSA/PyAnJztcbiAgICAgIH0pXG4gICAgICAuc29ydCgpXG4gICAgICAuam9pbignLCcpfX1gO1xuICB9XG4gIHJldHVybiB0cy5TeW50YXhLaW5kW25vZGUua2luZF07XG59XG5cbmZ1bmN0aW9uIGNvbXBvbmVudFNpZ25hdHVyZShjb2RlOiBzdHJpbmcsIGZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHNvdXJjZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZSwgY29kZSwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG4gIGNvbnN0IGVudHJpZXM6IHN0cmluZ1tdID0gW107XG5cbiAgZm9yIChjb25zdCBzdGF0ZW1lbnQgb2Ygc291cmNlLnN0YXRlbWVudHMpIHtcbiAgICBpZiAoXG4gICAgICB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oc3RhdGVtZW50KSB8fFxuICAgICAgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN0YXRlbWVudClcbiAgICApIHtcbiAgICAgIGNvbnN0IGV4cG9ydGVkID0gc3RhdGVtZW50Lm1vZGlmaWVycz8uc29tZShcbiAgICAgICAgbW9kaWZpZXIgPT4gbW9kaWZpZXIua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkXG4gICAgICApO1xuICAgICAgY29uc3QgZGVmYXVsdEV4cG9ydCA9IHN0YXRlbWVudC5tb2RpZmllcnM/LnNvbWUoXG4gICAgICAgIG1vZGlmaWVyID0+IG1vZGlmaWVyLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRGVmYXVsdEtleXdvcmRcbiAgICAgICk7XG4gICAgICBpZiAoZGVmYXVsdEV4cG9ydCB8fCAvXltBLVpdLy50ZXN0KHN0YXRlbWVudC5uYW1lPy50ZXh0ID8/ICcnKSkge1xuICAgICAgICBlbnRyaWVzLnB1c2goXG4gICAgICAgICAgYCR7ZGVmYXVsdEV4cG9ydCA/ICdkZWZhdWx0JyA6IGV4cG9ydGVkID8gJ2V4cG9ydCcgOiAnbG9jYWwnfToke2lkZW50aXR5KHN0YXRlbWVudCl9YFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICBjb25zdCBleHBvcnRlZCA9IHN0YXRlbWVudC5tb2RpZmllcnM/LnNvbWUoXG4gICAgICAgIG1vZGlmaWVyID0+IG1vZGlmaWVyLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZFxuICAgICAgKTtcbiAgICAgIGZvciAoY29uc3QgZGVjbGFyYXRpb24gb2Ygc3RhdGVtZW50LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihkZWNsYXJhdGlvbi5uYW1lKSAmJlxuICAgICAgICAgIC9eW0EtWl0vLnRlc3QoZGVjbGFyYXRpb24ubmFtZS50ZXh0KSAmJlxuICAgICAgICAgIGRlY2xhcmF0aW9uLmluaXRpYWxpemVyXG4gICAgICAgICkge1xuICAgICAgICAgIGVudHJpZXMucHVzaChcbiAgICAgICAgICAgIGAke2V4cG9ydGVkID8gJ2V4cG9ydCcgOiAnbG9jYWwnfToke2RlY2xhcmF0aW9uLm5hbWUudGV4dH06JHtpZGVudGl0eShkZWNsYXJhdGlvbi5pbml0aWFsaXplcil9YFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRzLmlzRXhwb3J0QXNzaWdubWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICBlbnRyaWVzLnB1c2goYGRlZmF1bHQ6JHtpZGVudGl0eShzdGF0ZW1lbnQuZXhwcmVzc2lvbil9YCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0V4cG9ydERlY2xhcmF0aW9uKHN0YXRlbWVudCkgJiYgIXN0YXRlbWVudC5pc1R5cGVPbmx5KSB7XG4gICAgICBjb25zdCBjbGF1c2UgPSBzdGF0ZW1lbnQuZXhwb3J0Q2xhdXNlO1xuICAgICAgY29uc3QgbmFtZXMgPVxuICAgICAgICBjbGF1c2UgJiYgdHMuaXNOYW1lZEV4cG9ydHMoY2xhdXNlKVxuICAgICAgICAgID8gY2xhdXNlLmVsZW1lbnRzXG4gICAgICAgICAgICAgIC5maWx0ZXIoZWxlbWVudCA9PiAhZWxlbWVudC5pc1R5cGVPbmx5KVxuICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgIGVsZW1lbnQgPT5cbiAgICAgICAgICAgICAgICAgIGAke2VsZW1lbnQucHJvcGVydHlOYW1lPy50ZXh0ID8/IGVsZW1lbnQubmFtZS50ZXh0fToke2VsZW1lbnQubmFtZS50ZXh0fWBcbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAuc29ydCgpXG4gICAgICAgICAgICAgIC5qb2luKCcsJylcbiAgICAgICAgICA6IChjbGF1c2U/LmdldFRleHQoKSA/PyAnKicpO1xuICAgICAgaWYgKG5hbWVzKVxuICAgICAgICBlbnRyaWVzLnB1c2goXG4gICAgICAgICAgYGV4cG9ydHM6JHtzdGF0ZW1lbnQubW9kdWxlU3BlY2lmaWVyPy5nZXRUZXh0KCkgPz8gJyd9OiR7bmFtZXN9YFxuICAgICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBKU09OLnN0cmluZ2lmeShlbnRyaWVzLnNvcnQoKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFjdEhtckd1YXJkKCk6IFBsdWdpbiB7XG4gIGNvbnN0IHNpZ25hdHVyZXMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCBpc1NvdXJjZSA9IChpZDogc3RyaW5nKSA9PlxuICAgIC9cXC5bY21dP1tqdF1zeD8kLy50ZXN0KGlkKSAmJlxuICAgICFpZC5pbmNsdWRlcygnL25vZGVfbW9kdWxlcy8nKSAmJlxuICAgICFpZC5pbmNsdWRlcygnXFwwJyk7XG5cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAncmVhY3QtaG1yLWd1YXJkJyxcbiAgICBhcHBseTogJ3NlcnZlJyxcbiAgICBlbmZvcmNlOiAncHJlJyxcbiAgICB0cmFuc2Zvcm0oY29kZSwgaWQsIG9wdGlvbnMpIHtcbiAgICAgIGNvbnN0IGZpbGUgPSBub3JtYWxpemVQYXRoKGlkKTtcbiAgICAgIGlmICghb3B0aW9ucz8uc3NyICYmIGlzU291cmNlKGZpbGUpICYmICFzaWduYXR1cmVzLmhhcyhmaWxlKSkge1xuICAgICAgICBzaWduYXR1cmVzLnNldChmaWxlLCBjb21wb25lbnRTaWduYXR1cmUoY29kZSwgZmlsZSkpO1xuICAgICAgfVxuICAgIH0sXG4gICAgYXN5bmMgaGFuZGxlSG90VXBkYXRlKHsgZmlsZSwgcmVhZCwgbW9kdWxlcywgc2VydmVyLCB0aW1lc3RhbXAgfSkge1xuICAgICAgY29uc3Qga2V5ID0gbm9ybWFsaXplUGF0aChmaWxlKTtcbiAgICAgIGNvbnN0IHByZXZpb3VzID0gc2lnbmF0dXJlcy5nZXQoa2V5KTtcbiAgICAgIGlmIChwcmV2aW91cyA9PT0gdW5kZWZpbmVkIHx8IG1vZHVsZXMubGVuZ3RoID09PSAwKSByZXR1cm47XG5cbiAgICAgIGNvbnN0IG5leHQgPSBjb21wb25lbnRTaWduYXR1cmUoYXdhaXQgcmVhZCgpLCBrZXkpO1xuICAgICAgc2lnbmF0dXJlcy5zZXQoa2V5LCBuZXh0KTtcbiAgICAgIGlmIChwcmV2aW91cyA9PT0gbmV4dCkgcmV0dXJuO1xuXG4gICAgICAvLyBBIHJlbmFtZWQvcmVwbGFjZWQgY29tcG9uZW50IGNhbiByZW1haW4gYSBzZWxmLWFjY2VwdGluZyByZWZyZXNoXG4gICAgICAvLyBib3VuZGFyeSBldmVuIHRob3VnaCBSZWFjdCBzdGlsbCByZW5kZXJzIGl0cyBwcmV2aW91cyBmYW1pbHkuXG4gICAgICBjb25zdCBpbnZhbGlkYXRlZCA9IG5ldyBTZXQ8TW9kdWxlTm9kZT4oKTtcbiAgICAgIGZvciAoY29uc3QgbW9kdWxlIG9mIG1vZHVsZXMpIHtcbiAgICAgICAgc2VydmVyLm1vZHVsZUdyYXBoLmludmFsaWRhdGVNb2R1bGUoXG4gICAgICAgICAgbW9kdWxlLFxuICAgICAgICAgIGludmFsaWRhdGVkLFxuICAgICAgICAgIHRpbWVzdGFtcCxcbiAgICAgICAgICB0cnVlXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBzZXJ2ZXIud3Muc2VuZCh7IHR5cGU6ICdmdWxsLXJlbG9hZCcsIHBhdGg6ICcqJyB9KTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9LFxuICAgIHdhdGNoQ2hhbmdlKGlkLCB7IGV2ZW50IH0pIHtcbiAgICAgIGlmIChldmVudCA9PT0gJ2RlbGV0ZScpIHNpZ25hdHVyZXMuZGVsZXRlKG5vcm1hbGl6ZVBhdGgoaWQpKTtcbiAgICB9LFxuICB9O1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1UCxTQUFTLG9CQUFvQjtBQUNwUixPQUFPLFdBQVc7QUFDbEIsT0FBT0EsU0FBUTtBQUNmLE9BQU9DLFdBQVU7QUFDakIsU0FBUyx5QkFBeUI7QUFDbEMsU0FBUyxhQUFhO0FBQ3RCLFNBQVMsMkJBQTJCO0FBQ3BDLE9BQU8sYUFBYTs7O0FDUGlRLE9BQU9DLFdBQVU7OztBQ0E3QixPQUFPLFFBQVE7QUFDeFIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBRnNJLElBQU0sMkNBQTJDO0FBSXJOLElBQU0sY0FBYyxjQUFjLHdDQUFlO0FBQ2pELElBQU1DLGFBQVksS0FBSyxRQUFRLFdBQVc7QUFDMUMsSUFBTSxjQUFjLEtBQUssUUFBUUEsWUFBVyxJQUFJO0FBRXpDLElBQU0sZ0JBQWdCLEtBQUssUUFBUSxhQUFhLE9BQU8sU0FBUztBQUVoRSxTQUFTLDJCQUEyQixjQUFjO0FBQ3ZELFFBQU0sYUFBYSxhQUNoQixRQUFRLE9BQU8sR0FBRyxFQUNsQixRQUFRLGdCQUFnQixFQUFFLEVBQzFCLFFBQVEsU0FBUyxFQUFFO0FBRXRCLFNBQU8sYUFBYSxTQUFTLFVBQVUsTUFBTTtBQUMvQztBQUVPLFNBQVMscUJBQXFCLEtBQUssU0FBUyxDQUFDLEdBQUc7QUFDckQsTUFBSSxDQUFDLEdBQUcsV0FBVyxHQUFHLEdBQUc7QUFDdkIsV0FBTztBQUFBLEVBQ1Q7QUFFQSxhQUFXLFNBQVMsR0FBRyxZQUFZLEtBQUssRUFBRSxlQUFlLEtBQUssQ0FBQyxHQUFHO0FBQ2hFLFFBQUksTUFBTSxLQUFLLFdBQVcsR0FBRyxHQUFHO0FBQzlCO0FBQUEsSUFDRjtBQUVBLFVBQU0sV0FBVyxLQUFLLEtBQUssS0FBSyxNQUFNLElBQUk7QUFDMUMsUUFBSSxNQUFNLFlBQVksR0FBRztBQUN2QiwyQkFBcUIsVUFBVSxNQUFNO0FBQ3JDO0FBQUEsSUFDRjtBQUVBLFFB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QixjQUFjO0FBQUEsUUFDZCxpQkFBaUJELE1BQUssUUFBUSxrQ0FBVyxtQkFBbUI7QUFBQSxRQUM1RCwyQkFBMkI7QUFBQSxNQUM3QixDQUFDLElBQ0QsQ0FBQztBQUFBLElBQ1A7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLEtBQUtBLE1BQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDdEM7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUE7QUFBQSxNQUNOLE1BQU0sU0FBUyxRQUFRLElBQUksYUFBYSxNQUFNO0FBQUEsTUFDOUMsT0FBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFVBQ04sUUFBUSxvQkFBb0IsUUFBUSxJQUFJLGdCQUFnQixNQUFNO0FBQUEsVUFDOUQsY0FBYztBQUFBLFFBQ2hCO0FBQUEsTUFDRjtBQUFBLE1BQ0EsT0FBTyxFQUFFLFlBQVksTUFBTSxVQUFVLElBQUk7QUFBQSxJQUMzQztBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsZUFBZTtBQUFBLFFBQ2IsUUFBUTtBQUFBLFVBQ04sY0FBYztBQUFBO0FBQUEsWUFFWixnQkFBZ0IsQ0FBQyxTQUFTLFdBQVc7QUFBQSxZQUNyQyxpQkFBaUIsQ0FBQyxrQkFBa0I7QUFBQSxZQUNwQyxhQUFhO0FBQUEsY0FDWDtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsWUFDRjtBQUFBLFlBQ0EsZUFBZSxDQUFDLG1CQUFtQix1QkFBdUIsS0FBSztBQUFBLFlBQy9ELGdCQUFnQjtBQUFBLGNBQ2Q7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLFlBQ0Y7QUFBQSxZQUNBLGdCQUFnQixDQUFDLHVCQUF1QjtBQUFBLFVBQzFDO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLHVCQUF1QjtBQUFBLElBQ3pCO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbImZzIiwgInBhdGgiLCAicGF0aCIsICJfX2Rpcm5hbWUiLCAicGF0aCIsICJmcyIsICJwYXRoIiwgInBhdGgiLCAiZnMiLCAicGF0aCIsICJmcyJdCn0K
