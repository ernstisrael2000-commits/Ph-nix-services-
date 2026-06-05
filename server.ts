import express from "express";
import { createServer as createHttpServer } from "http";
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
  const PORT = parseInt(process.env.PORT || '5000', 10);

  // Raw body capture for MonCash webhook HMAC verification (must be before express.json())
  app.use('/api/webhooks/moncash', (req: any, _res: any, next: any) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => { raw += chunk; });
    req.on('end', () => {
      req.rawBody = raw;
      try { req.body = JSON.parse(raw); } catch { req.body = {}; }
      next();
    });
  });

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
    // In dev mode, proxy frontend requests to the Vite dev server
    const VITE_PORT = parseInt(process.env.VITE_PORT || '5173', 10);

    // Start Vite as a child process
    const { spawn } = await import('child_process');
    const viteProcess = spawn('npx', ['vite', '--port', String(VITE_PORT), '--host', '0.0.0.0'], {
      stdio: 'inherit',
      env: { ...process.env },
      shell: true,
    });

    viteProcess.on('error', (err) => {
      console.error('[Vite] Failed to start:', err);
    });

    process.on('exit', () => viteProcess.kill());
    process.on('SIGTERM', () => { viteProcess.kill(); process.exit(0); });
    process.on('SIGINT', () => { viteProcess.kill(); process.exit(0); });

    // Wait a moment for Vite to start, then proxy non-API requests
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { createProxyMiddleware } = await import('http-proxy-middleware') as any;
    app.use('/', createProxyMiddleware({
      target: `http://localhost:${VITE_PORT}`,
      changeOrigin: true,
      ws: true,
      on: {
        error: (_err: any, _req: any, res: any) => {
          if (res && typeof res.status === 'function') {
            res.status(502).send('Vite dev server not ready yet');
          }
        },
      },
    }));

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Vite dev server on http://localhost:${VITE_PORT}`);
    });
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

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
