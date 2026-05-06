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
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
