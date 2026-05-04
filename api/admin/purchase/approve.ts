import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, getAdminDb, FieldValue } from '../../_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = getAdminDb();
    const { notifId, transactionId, clientId, amount, directSponsorId } = req.body || {};
    if (!notifId || !transactionId || !clientId || !amount)
      return res.status(400).json({ error: 'Paramètres manquants.' });

    const clientRef = db.collection('clients').doc(clientId);
    const clientSnap = await clientRef.get();
    if (!clientSnap.exists) return res.status(404).json({ error: 'Client introuvable.' });
    const clientData = clientSnap.data()!;
    if ((clientData.balance || 0) < amount)
      return res.status(400).json({ error: 'Solde client insuffisant.' });

    const batch = db.batch();
    batch.update(clientRef, {
      balance: Math.max(0, (clientData.balance || 0) - amount),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (directSponsorId) {
      const affiliateRef = db.collection('affiliates').doc(directSponsorId);
      const affiliateSnap = await affiliateRef.get();
      if (affiliateSnap.exists) {
        const aff = affiliateSnap.data()!;
        batch.update(affiliateRef, {
          balance: (aff.balance || 0) + amount,
          totalEarnings: (aff.totalEarnings || 0) + amount,
          monthlySales: (aff.monthlySales || 0) + amount,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    batch.update(db.collection('client_transactions').doc(transactionId), {
      status: 'completed',
      affiliateCredited: !!directSponsorId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    batch.update(db.collection('admin_notifications').doc(notifId), {
      status: 'approved', read: true,
      resolvedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    res.json({ success: true });
  } catch (e: any) {
    console.error('[purchase/approve]', e);
    res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
}
