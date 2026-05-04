import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, getAdminDb, FieldValue } from '../../_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = getAdminDb();
    const { txId, status, reason } = req.body || {};
    if (!txId || !status) return res.status(400).json({ error: 'Paramètres manquants.' });

    const txRef = db.collection('client_transactions').doc(txId);
    const txSnap = await txRef.get();
    if (!txSnap.exists) return res.status(404).json({ error: 'Transaction introuvable.' });
    const txData = txSnap.data()!;
    if (txData.status !== 'pending') return res.status(400).json({ error: 'Transaction déjà traitée.' });

    const batch = db.batch();
    batch.update(txRef, {
      status,
      ...(reason && { rejectionReason: reason }),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (status === 'approved') {
      const clientRef = db.collection('clients').doc(txData.clientId);
      const clientSnap = await clientRef.get();
      if (clientSnap.exists) {
        const clientData = clientSnap.data()!;
        if (txData.type === 'deposit') {
          batch.update(clientRef, {
            balance: (clientData.balance || 0) + txData.amount,
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else if (txData.type === 'withdrawal') {
          batch.update(clientRef, {
            balance: Math.max(0, (clientData.balance || 0) - txData.amount),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
    }

    await batch.commit();
    res.json({ success: true });
  } catch (e: any) {
    console.error('[transaction/status]', e);
    res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
}
