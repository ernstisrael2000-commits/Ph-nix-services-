import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, getAdminDb, FieldValue } from '../../_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = getAdminDb();
    const { notifId, transactionId } = req.body || {};
    if (!notifId || !transactionId)
      return res.status(400).json({ error: 'Paramètres manquants.' });

    const batch = db.batch();
    batch.update(db.collection('client_transactions').doc(transactionId), {
      status: 'rejected',
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(db.collection('admin_notifications').doc(notifId), {
      status: 'declined', read: true,
      resolvedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    res.json({ success: true });
  } catch (e: any) {
    console.error('[purchase/decline]', e);
    res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
}
