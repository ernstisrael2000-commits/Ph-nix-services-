import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, getAdminDb, serializeDoc } from '../../_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = getAdminDb();
    const snap = await db.collection('admin_notifications')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();
    res.json({ notifications: snap.docs.map(serializeDoc) });
  } catch (e: any) {
    console.error('[GET notifications]', e);
    res.status(500).json({ error: e.message });
  }
}
