import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, getAdminDb, serializeDoc } from '../_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = getAdminDb();
    const snap = await db.collection('client_transactions')
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();
    res.json({ transactions: snap.docs.map(serializeDoc) });
  } catch (e: any) {
    console.error('[GET transactions]', e);
    res.status(500).json({ error: e.message });
  }
}
