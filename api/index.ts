import express from 'express';
import apiRouter from '../src/api/router.ts';

// ─── Vercel Serverless Adapter ────────────────────────────────────────────────
// This file is the single entry point for Vercel deployments.
// All API routes are defined in src/api/router.ts and shared with server.ts.

const app = express();

app.use(express.json());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Mount shared API router (identical to Replit/server.ts) ───────────────────
app.use(apiRouter);

export default app;
