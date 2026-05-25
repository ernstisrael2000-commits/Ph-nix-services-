import express from "express";
import { createServer as createHttpServer } from "http";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Shared API router (all routes, Firebase Admin, helpers) ──────────────────
import apiRouter from './src/api/router.ts';

// ─── Server ───────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = 5000;

  app.use(express.json());

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // ── Request logger (API only) ─────────────────────────────────────────────
  app.use('/api', (req, _res, next) => {
    console.log(`[API] ${req.method} ${req.path}`);
    next();
  });

  // ── Mount shared API router ────────────────────────────────────────────────
  app.use(apiRouter);

  const httpServer = createHttpServer(app);

  // ── Vite / Static ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const hmrConfig = process.env.REPLIT_DEV_DOMAIN
      ? {
          clientPort: 443,
          protocol: "wss" as const,
          host: process.env.REPLIT_DEV_DOMAIN,
          server: httpServer,
        }
      : { server: httpServer };

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrConfig,
        allowedHosts: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    // Cache immutable hashed assets for 1 year
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
    }));

    // Cache PWA/static files for 1 day; no-cache for HTML
    app.use(express.static(distPath, {
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (
          filePath.endsWith('.webmanifest') ||
          filePath.endsWith('robots.txt') ||
          filePath.endsWith('sitemap.xml')
        ) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      },
    }));

    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
