import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_lib/firebase-admin';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  res.json({ ok: true });
}
