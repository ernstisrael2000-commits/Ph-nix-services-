import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, getAdminDb, serializeDoc } from '../_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = getAdminDb();
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'Email et mot de passe requis.' });

    const snap = await db.collection('clients')
      .where('email', '==', email)
      .where('password', '==', password)
      .limit(1)
      .get();

    if (snap.empty)
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

    res.json({ success: true, client: serializeDoc(snap.docs[0]) });
  } catch (e: any) {
    console.error('[login]', e);
    res.status(500).json({ error: e.message || 'Erreur de connexion.' });
  }
}
