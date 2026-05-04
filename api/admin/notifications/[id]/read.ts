import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, getAdminDb } from '../../../_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = getAdminDb();
    const { id } = req.query as { id: string };
    await db.collection('admin_notifications').doc(id).update({ read: true });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
