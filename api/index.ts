import express from 'express';
import nodemailer from 'nodemailer';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ─── Firebase Admin ───────────────────────────────────────────────────────────

let adminApp: App;
let adminDb: ReturnType<typeof getFirestore>;

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
  } else {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountEnv) {
      console.error('[Admin] FIREBASE_SERVICE_ACCOUNT not set');
      return;
    }
    try {
      let raw = serviceAccountEnv.trim();
      if (!raw.startsWith('{')) raw = '{' + raw;
      const serviceAccount = JSON.parse(raw);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      });
    } catch (e) {
      console.error('[Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT:', e);
      return;
    }
  }
  adminDb = getFirestore(getApps()[0], 'ai-studio-283d6370-7e1a-484a-aed2-4d5b3071d1e2');
}

initFirebaseAdmin();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeDoc(snap: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot): any {
  const data = snap.data() || {};
  const result: any = { id: snap.id };
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
      result[key] = { _seconds: (value as any).seconds, _nanoseconds: (value as any).nanoseconds };
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── App ──────────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Guard
const requireDb = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!adminDb) return res.status(503).json({ error: 'Firebase Admin non initialisé. Contactez le support.' });
  next();
};

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/notify-registration', async (req, res) => {
  const { name, email, phone, message, date } = req.body;
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(200).json({ success: true, warning: 'SMTP credentials missing' });
    }
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"Neopay System" <${process.env.SMTP_USER}>`,
      to: 'neopayservices509@gmail.com',
      subject: `Nouvelle demande d'inscription affilié : ${name}`,
      text: `Nouvelle demande d'inscription reçue !\n\nNom: ${name}\nEmail: ${email}\nTéléphone: ${phone || 'Non fourni'}\nMessage: ${message || 'Aucun message'}\nDate: ${date}\n\nVeuillez vous connecter au tableau de bord administrateur pour approuver ou rejeter cette demande.`,
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

app.get('/api/admin/transactions', requireDb, async (_req, res) => {
  try {
    const snap = await adminDb.collection('client_transactions').orderBy('createdAt', 'desc').limit(500).get();
    res.json({ transactions: snap.docs.map(serializeDoc) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/notifications', requireDb, async (_req, res) => {
  try {
    const snap = await adminDb.collection('admin_notifications').orderBy('createdAt', 'desc').limit(200).get();
    res.json({ notifications: snap.docs.map(serializeDoc) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/client/transactions/:clientId', requireDb, async (req, res) => {
  try {
    const snap = await adminDb.collection('client_transactions')
      .where('clientId', '==', req.params.clientId)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();
    res.json({ transactions: snap.docs.map(serializeDoc) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/admin/notifications/read-all', requireDb, async (_req, res) => {
  try {
    const snap = await adminDb.collection('admin_notifications').where('read', '==', false).get();
    const batch = adminDb.batch();
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/admin/notifications/:id/read', requireDb, async (req, res) => {
  try {
    await adminDb.collection('admin_notifications').doc(req.params.id).update({ read: true });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/client/deposit', requireDb, async (req, res) => {
  try {
    const { clientId, clientName, clientWalletId, amount, method, txId, captchaToken } = req.body;
    if (!clientId || !clientName || !amount || !method)
      return res.status(400).json({ error: 'Paramètres manquants.' });
    if (amount <= 0) return res.status(400).json({ error: 'Montant invalide.' });
    if (captchaToken) {
      const secret = process.env.RECAPTCHA_SECRET_KEY;
      if (secret) {
        const gr = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(captchaToken)}`
        });
        const gd: any = await gr.json();
        if (!gd.success) return res.status(400).json({ error: 'Vérification reCAPTCHA échouée. Veuillez réessayer.' });
      }
    }

    const txRef = await adminDb.collection('client_transactions').add({
      clientId, clientName, type: 'deposit', amount, status: 'pending', method,
      ...(txId && { txId }),
      description: `Demande de dépôt via ${method}`,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await adminDb.collection('admin_notifications').add({
      type: 'client_deposit', clientId, clientName,
      clientWalletId: clientWalletId || '', transactionId: txRef.id,
      amount, method, ...(txId && { txId }), read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    res.json({ success: true, transactionId: txRef.id });
  } catch (e: any) {
    console.error('[deposit]', e);
    res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
});

app.post('/api/client/withdrawal', requireDb, async (req, res) => {
  try {
    const { clientId, clientName, clientPhone, clientWalletId, amount, method, accountNumber, captchaToken } = req.body;
    if (!clientId || !clientName || !amount || !method || !accountNumber)
      return res.status(400).json({ error: 'Paramètres manquants.' });
    if (amount <= 0) return res.status(400).json({ error: 'Montant invalide.' });
    if (captchaToken) {
      const secret = process.env.RECAPTCHA_SECRET_KEY;
      if (secret) {
        const gr = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(captchaToken)}`
        });
        const gd: any = await gr.json();
        if (!gd.success) return res.status(400).json({ error: 'Vérification reCAPTCHA échouée. Veuillez réessayer.' });
      }
    }

    const clientSnap = await adminDb.collection('clients').doc(clientId).get();
    if (!clientSnap.exists) return res.status(404).json({ error: 'Client introuvable.' });
    const clientRef = adminDb.collection('clients').doc(clientId);
    const clientData = clientSnap.data()!;
    if ((clientData.balance || 0) < amount)
      return res.status(400).json({ error: 'Solde insuffisant.' });

    const batch = adminDb.batch();
    batch.update(clientRef, {
      balance: Math.max(0, (clientData.balance || 0) - amount),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const txRef = adminDb.collection('client_transactions').doc();
    batch.set(txRef, {
      clientId, clientName, type: 'withdrawal', amount, status: 'pending',
      method, accountNumber,
      description: `Demande de retrait via ${method}`,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const notifRef = adminDb.collection('admin_notifications').doc();
    batch.set(notifRef, {
      type: 'client_withdrawal', clientId, clientName,
      clientPhone: clientPhone || '', clientWalletId: clientWalletId || '',
      transactionId: txRef.id, amount, method, accountNumber,
      read: false, createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    res.json({ success: true, transactionId: txRef.id });
  } catch (e: any) {
    console.error('[withdrawal]', e);
    res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
});

app.post('/api/client/purchase', requireDb, async (req, res) => {
  try {
    const { clientId, clientName, clientPhone, clientWalletId, amount, productName, productPrice, directSponsorId } = req.body;
    if (!clientId || !clientName || !amount || !productName)
      return res.status(400).json({ error: 'Paramètres manquants.' });
    if (amount <= 0) return res.status(400).json({ error: 'Montant invalide.' });

    const clientRef = adminDb.collection('clients').doc(clientId);
    const clientSnap = await clientRef.get();
    if (!clientSnap.exists) return res.status(404).json({ error: 'Client introuvable.' });
    const clientData = clientSnap.data()!;
    if ((clientData.balance || 0) < amount)
      return res.status(400).json({ error: 'Solde insuffisant pour cet achat.' });

    const batch = adminDb.batch();
    batch.update(clientRef, {
      balance: Math.max(0, (clientData.balance || 0) - amount),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (directSponsorId) {
      const affiliateRef = adminDb.collection('affiliates').doc(directSponsorId);
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
    const txRef = adminDb.collection('client_transactions').doc();
    batch.set(txRef, {
      clientId, clientName, type: 'purchase', amount, status: 'completed',
      productName, productPrice, directSponsorId: directSponsorId || null,
      affiliateCredited: !!directSponsorId,
      description: `Achat: ${productName} - ${productPrice}`,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const notifRef = adminDb.collection('admin_notifications').doc();
    batch.set(notifRef, {
      type: 'client_purchase', clientId, clientName,
      clientPhone: clientPhone || '', clientWalletId: clientWalletId || '',
      transactionId: txRef.id, amount, productName, productPrice,
      directSponsorId: directSponsorId || null, status: 'completed',
      read: false, createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    res.json({ success: true, transactionId: txRef.id });
  } catch (e: any) {
    console.error('[purchase]', e);
    res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
});

app.post('/api/admin/purchase/approve', requireDb, async (req, res) => {
  try {
    const { notifId, transactionId, clientId, amount, directSponsorId } = req.body;
    if (!notifId || !transactionId || !clientId || !amount)
      return res.status(400).json({ error: 'Paramètres manquants.' });

    const clientRef = adminDb.collection('clients').doc(clientId);
    const clientSnap = await clientRef.get();
    if (!clientSnap.exists) return res.status(404).json({ error: 'Client introuvable.' });
    const clientData = clientSnap.data()!;
    if ((clientData.balance || 0) < amount)
      return res.status(400).json({ error: 'Solde client insuffisant.' });

    const batch = adminDb.batch();
    batch.update(clientRef, {
      balance: Math.max(0, (clientData.balance || 0) - amount),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (directSponsorId) {
      const affiliateRef = adminDb.collection('affiliates').doc(directSponsorId);
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
    batch.update(adminDb.collection('client_transactions').doc(transactionId), {
      status: 'completed', affiliateCredited: !!directSponsorId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(adminDb.collection('admin_notifications').doc(notifId), {
      status: 'approved', read: true, resolvedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    res.json({ success: true });
  } catch (e: any) {
    console.error('[purchase/approve]', e);
    res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
});

app.post('/api/admin/purchase/decline', requireDb, async (req, res) => {
  try {
    const { notifId, transactionId } = req.body;
    if (!notifId || !transactionId)
      return res.status(400).json({ error: 'Paramètres manquants.' });

    const batch = adminDb.batch();
    batch.update(adminDb.collection('client_transactions').doc(transactionId), {
      status: 'rejected', updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(adminDb.collection('admin_notifications').doc(notifId), {
      status: 'declined', read: true, resolvedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    res.json({ success: true });
  } catch (e: any) {
    console.error('[purchase/decline]', e);
    res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
});

app.post('/api/admin/transaction/status', requireDb, async (req, res) => {
  try {
    const { txId, status, reason } = req.body;
    if (!txId || !status) return res.status(400).json({ error: 'Paramètres manquants.' });

    const txRef = adminDb.collection('client_transactions').doc(txId);
    const txSnap = await txRef.get();
    if (!txSnap.exists) return res.status(404).json({ error: 'Transaction introuvable.' });
    const txData = txSnap.data()!;
    if (txData.status !== 'pending') return res.status(400).json({ error: 'Transaction déjà traitée.' });

    const batch = adminDb.batch();
    batch.update(txRef, {
      status,
      ...(reason && { rejectionReason: reason }),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const clientRef2 = adminDb.collection('clients').doc(txData.clientId);
    const clientSnap2 = await clientRef2.get();
    if (clientSnap2.exists) {
      const clientData2 = clientSnap2.data()!;
      if (status === 'approved') {
        if (txData.type === 'deposit') {
          batch.update(clientRef2, {
            balance: (clientData2.balance || 0) + txData.amount,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        // Withdrawal approved: balance already deducted on submission, no change needed
      } else if (status === 'rejected') {
        if (txData.type === 'withdrawal') {
          // Withdrawal rejected: refund the amount deducted on submission
          batch.update(clientRef2, {
            balance: (clientData2.balance || 0) + txData.amount,
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
});

app.post('/api/client/register', requireDb, async (req, res) => {
  try {
    const { name, phone, email, password, sponsorCode } = req.body;
    if (!name || !phone || !email || !password)
      return res.status(400).json({ error: 'Paramètres manquants.' });

    const existing = await adminDb.collection('clients').where('email', '==', email).get();
    if (!existing.empty)
      return res.status(409).json({ error: 'Un compte avec cet email existe déjà.' });

    let walletId = '', unique = false;
    while (!unique) {
      walletId = Math.floor(10000000 + Math.random() * 90000000).toString();
      const wSnap = await adminDb.collection('clients').where('walletId', '==', walletId).get();
      if (wSnap.empty) unique = true;
    }

    let directSponsorId: string | undefined, indirectSponsorId: string | undefined;
    if (sponsorCode) {
      const affSnap = await adminDb.collection('affiliates').where('code', '==', sponsorCode).get();
      if (!affSnap.empty) {
        directSponsorId = affSnap.docs[0].id;
        const affData = affSnap.docs[0].data();
        if (affData.parentAffiliateId) indirectSponsorId = affData.parentAffiliateId;
      }
    }

    const clientData: any = {
      name, phone, email, password, balance: 0, walletId, status: 'active',
      ...(directSponsorId && { directSponsorId }),
      ...(indirectSponsorId && { indirectSponsorId }),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    const ref = await adminDb.collection('clients').add(clientData);
    res.json({ success: true, client: { id: ref.id, ...clientData, createdAt: null, updatedAt: null } });
  } catch (e: any) {
    console.error('[register]', e);
    res.status(500).json({ error: e.message || "Erreur lors de l'inscription." });
  }
});

app.post('/api/client/login', requireDb, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email et mot de passe requis.' });

    const snap = await adminDb.collection('clients')
      .where('email', '==', email)
      .where('password', '==', password)
      .limit(1).get();

    if (snap.empty)
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

    res.json({ success: true, client: serializeDoc(snap.docs[0]) });
  } catch (e: any) {
    console.error('[login]', e);
    res.status(500).json({ error: e.message || 'Erreur de connexion.' });
  }
});

app.post('/api/client/register-google', requireDb, async (req, res) => {
  try {
    const { phone, sponsorCode, googleUser } = req.body;
    if (!googleUser?.email || !googleUser?.uid)
      return res.status(400).json({ error: 'Données Google manquantes.' });

    const existing = await adminDb.collection('clients').where('email', '==', googleUser.email).get();
    if (!existing.empty)
      return res.status(409).json({ error: 'Un compte avec cet email existe déjà.' });

    let walletId = '', unique = false;
    while (!unique) {
      walletId = Math.floor(10000000 + Math.random() * 90000000).toString();
      const wSnap = await adminDb.collection('clients').where('walletId', '==', walletId).get();
      if (wSnap.empty) unique = true;
    }

    let directSponsorId: string | undefined, indirectSponsorId: string | undefined;
    if (sponsorCode) {
      const affSnap = await adminDb.collection('affiliates').where('code', '==', sponsorCode).get();
      if (!affSnap.empty) {
        directSponsorId = affSnap.docs[0].id;
        const affData = affSnap.docs[0].data();
        if (affData.parentAffiliateId) indirectSponsorId = affData.parentAffiliateId;
      }
    }

    const clientData: any = {
      name: googleUser.name, phone: phone || '',
      email: googleUser.email, uid: googleUser.uid,
      photoUrl: googleUser.photoUrl || '',
      balance: 0, walletId, status: 'active',
      ...(directSponsorId && { directSponsorId }),
      ...(indirectSponsorId && { indirectSponsorId }),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    const ref = await adminDb.collection('clients').add(clientData);
    res.json({ success: true, client: { id: ref.id, ...clientData, createdAt: null, updatedAt: null } });
  } catch (e: any) {
    console.error('[register-google]', e);
    res.status(500).json({ error: e.message || "Erreur lors de l'inscription Google." });
  }
});

app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Route API introuvable.' });
});

export default app;
