import express from 'express';
import nodemailer from 'nodemailer';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ─── Firebase Admin ────────────────────────────────────────────────────────────
const FIRESTORE_DB_ID = 'ai-studio-283d6370-7e1a-484a-aed2-4d5b3071d1e2';

let adminApp: App;
let adminDb: ReturnType<typeof getFirestore>;

function initFirebaseAdmin() {
  try {
    if (getApps().length > 0) {
      adminApp = getApps()[0];
    } else {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) {
        console.error('[Admin] FIREBASE_SERVICE_ACCOUNT not set — admin routes disabled');
        return;
      }
      let json = raw.trim();
      if (!json.startsWith('{')) json = '{' + json;
      const serviceAccount = JSON.parse(json);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      });
    }
    adminDb = getFirestore(adminApp, FIRESTORE_DB_ID);
    console.log('[Admin] Firebase Admin SDK initialized');
  } catch (e) {
    console.error('[Admin] Initialization failed:', e);
  }
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

function sanitizeFormation(data: any): any {
  const out: any = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      out[k] = v.map((item: any) =>
        item && typeof item === 'object' ? sanitizeFormation(item) : (item ?? null)
      );
    } else {
      out[k] = v ?? null;
    }
  }
  return out;
}

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) { console.warn('[reCAPTCHA] RECAPTCHA_SECRET_KEY not set — skipping'); return true; }
  try {
    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
    });
    const data: any = await resp.json();
    return data.success === true;
  } catch (e) {
    console.error('[reCAPTCHA] verification error:', e);
    return false;
  }
}

function sendAdminEmail(subject: string, text: string): void {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  transporter.sendMail({
    from: `"Rena System" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,
    subject,
    text,
  }).catch((err: any) => console.error('[Email] Erreur envoi:', err.message));
}

// ─── Guards ───────────────────────────────────────────────────────────────────

const requireDb = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!adminDb) return res.status(503).json({ error: 'Firebase Admin non initialisé. Contactez le support.' });
  next();
};

// ─── Router ───────────────────────────────────────────────────────────────────

const router = express.Router();

// ── Health ───────────────────────────────────────────────────────────────────
router.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── Affiliate registration email notification ─────────────────────────────────
router.post('/api/notify-registration', async (req, res) => {
  const { name, email, phone, message, date } = req.body;
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP credentials missing. Skipping email notification.');
      return res.status(200).json({ success: true, warning: 'SMTP credentials missing' });
    }
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"Rena System" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: `Nouvelle demande d'inscription affilié : ${name}`,
      text: `Nouvelle demande d'inscription reçue !\n\nNom: ${name}\nEmail: ${email}\nTéléphone: ${phone || 'Non fourni'}\nMessage: ${message || 'Aucun message'}\nDate: ${date}\n\nConnectez-vous au tableau de bord administrateur pour approuver ou rejeter cette demande.`,
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// ── Transactions ─────────────────────────────────────────────────────────────
router.get('/api/admin/transactions', requireDb, async (_req, res) => {
  try {
    const snap = await adminDb.collection('client_transactions').orderBy('createdAt', 'desc').limit(500).get();
    res.json({ transactions: snap.docs.map(serializeDoc) });
  } catch (e: any) {
    console.error('[GET transactions]', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/api/client/transactions/:clientId', requireDb, async (req, res) => {
  try {
    const snap = await adminDb.collection('client_transactions')
      .where('clientId', '==', req.params.clientId)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();
    res.json({ transactions: snap.docs.map(serializeDoc) });
  } catch (e: any) {
    console.error('[GET client transactions]', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/api/client/transactions/:clientId', requireDb, async (req, res) => {
  try {
    const snap = await adminDb.collection('client_transactions')
      .where('clientId', '==', req.params.clientId).get();
    const batch = adminDb.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    res.json({ success: true, deleted: snap.size });
  } catch (e: any) {
    console.error('[delete transactions]', e);
    res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
});

// ── Notifications ────────────────────────────────────────────────────────────
router.get('/api/admin/notifications', requireDb, async (_req, res) => {
  try {
    const snap = await adminDb.collection('admin_notifications').orderBy('createdAt', 'desc').limit(200).get();
    res.json({ notifications: snap.docs.map(serializeDoc) });
  } catch (e: any) {
    console.error('[GET notifications]', e);
    res.status(500).json({ error: e.message });
  }
});

router.patch('/api/admin/notifications/read-all', requireDb, async (_req, res) => {
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

router.patch('/api/admin/notifications/:id/read', requireDb, async (req, res) => {
  try {
    await adminDb.collection('admin_notifications').doc(req.params.id).update({ read: true });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Deposit ───────────────────────────────────────────────────────────────────
router.post('/api/client/deposit', requireDb, async (req, res) => {
  try {
    const { clientId, clientName, clientWalletId, amount, usdAmount, htgAmount, exchangeRate, method, txId, message, captchaToken } = req.body;
    if (!clientId || !clientName || !amount || !method)
      return res.status(400).json({ error: 'Paramètres manquants.' });
    if (amount <= 0) return res.status(400).json({ error: 'Montant invalide.' });
    if (captchaToken && !(await verifyRecaptcha(captchaToken)))
      return res.status(400).json({ error: 'Vérification reCAPTCHA échouée. Veuillez réessayer.' });

    // Validate min/max from settings
    try {
      const settingsSnap = await adminDb.collection('settings').doc('global').get();
      if (settingsSnap.exists) {
        const s = settingsSnap.data()!;
        const usd = usdAmount || amount;
        if (s.minDepositUSD && usd < s.minDepositUSD)
          return res.status(400).json({ error: `Montant minimum: $${s.minDepositUSD.toFixed(2)} USD` });
        if (s.maxDepositUSD && usd > s.maxDepositUSD)
          return res.status(400).json({ error: `Montant maximum: $${s.maxDepositUSD.toFixed(2)} USD` });
      }
    } catch {}

    const txRef = await adminDb.collection('client_transactions').add({
      clientId, clientName, type: 'deposit', amount, status: 'pending', method,
      ...(usdAmount !== undefined && { usdAmount }),
      ...(htgAmount !== undefined && { htgAmount }),
      ...(exchangeRate !== undefined && { exchangeRate }),
      ...(txId && { txId }),
      ...(message && { message }),
      description: `Dépôt via ${method}${htgAmount ? ` — ${htgAmount.toLocaleString()} HTG` : ''}${message ? ` — ${message}` : ''}`,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await adminDb.collection('admin_notifications').add({
      type: 'client_deposit', clientId, clientName,
      clientWalletId: clientWalletId || '', transactionId: txRef.id,
      amount, method,
      ...(usdAmount !== undefined && { usdAmount }),
      ...(htgAmount !== undefined && { htgAmount }),
      ...(exchangeRate !== undefined && { exchangeRate }),
      ...(txId && { txId }),
      ...(message && { message }),
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    sendAdminEmail(
      `💰 Dépôt — ${clientName}`,
      `Nouvelle demande de dépôt.\n\n` +
      `Client : ${clientName}\nWallet ID : ${clientWalletId || 'N/A'}\n` +
      `Montant USD : $${(usdAmount || amount).toFixed(2)}\n` +
      (htgAmount ? `Montant HTG : ${htgAmount.toLocaleString()} HTG\n` : '') +
      (exchangeRate ? `Taux : ${exchangeRate} HTG/USD\n` : '') +
      `Méthode : ${method}\n` +
      (txId ? `Référence : ${txId}\n` : '') +
      (message ? `Message : ${message}\n` : '')
    );

    res.json({ success: true, transactionId: txRef.id });
  } catch (e: any) {
    console.error('[deposit]', e);
    res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
});

// ── Withdrawal ────────────────────────────────────────────────────────────────
router.post('/api/client/withdrawal', requireDb, async (req, res) => {
  try {
    const { clientId, clientName, clientPhone, clientWalletId, amount, usdAmount, htgEquivalent, exchangeRate, method, accountNumber, accountName, message, captchaToken } = req.body;
    if (!clientId || !clientName || !amount || !method || !accountNumber)
      return res.status(400).json({ error: 'Paramètres manquants.' });
    if (amount <= 0) return res.status(400).json({ error: 'Montant invalide.' });
    if (captchaToken && !(await verifyRecaptcha(captchaToken)))
      return res.status(400).json({ error: 'Vérification reCAPTCHA échouée. Veuillez réessayer.' });

    // Validate min/max from settings
    try {
      const settingsSnap = await adminDb.collection('settings').doc('global').get();
      if (settingsSnap.exists) {
        const s = settingsSnap.data()!;
        const usd = usdAmount || amount;
        if (s.minWithdrawalUSD && usd < s.minWithdrawalUSD)
          return res.status(400).json({ error: `Montant minimum: $${s.minWithdrawalUSD.toFixed(2)} USD` });
        if (s.maxWithdrawalUSD && usd > s.maxWithdrawalUSD)
          return res.status(400).json({ error: `Montant maximum: $${s.maxWithdrawalUSD.toFixed(2)} USD` });
      }
    } catch {}

    // Anti double-withdrawal: block if pending withdrawal exists
    const pendingCheck = await adminDb.collection('client_transactions')
      .where('clientId', '==', clientId)
      .where('type', '==', 'withdrawal')
      .where('status', '==', 'pending')
      .limit(1).get();
    if (!pendingCheck.empty)
      return res.status(400).json({ error: 'Un retrait est déjà en cours de traitement. Veuillez patienter.' });

    const clientRef = adminDb.collection('clients').doc(clientId);
    const clientSnap = await clientRef.get();
    if (!clientSnap.exists) return res.status(404).json({ error: 'Client introuvable.' });
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
      ...(usdAmount !== undefined && { usdAmount }),
      ...(htgEquivalent !== undefined && { htgEquivalent }),
      ...(exchangeRate !== undefined && { exchangeRate }),
      ...(accountName && { accountName }),
      ...(message && { message }),
      description: `Retrait via ${method}${htgEquivalent ? ` — ≈ ${htgEquivalent.toLocaleString()} HTG` : ''}${message ? ` — ${message}` : ''}`,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const notifRef = adminDb.collection('admin_notifications').doc();
    batch.set(notifRef, {
      type: 'client_withdrawal', clientId, clientName,
      clientPhone: clientPhone || '', clientWalletId: clientWalletId || '',
      transactionId: txRef.id, amount, method, accountNumber,
      ...(usdAmount !== undefined && { usdAmount }),
      ...(htgEquivalent !== undefined && { htgEquivalent }),
      ...(exchangeRate !== undefined && { exchangeRate }),
      ...(accountName && { accountName }),
      ...(message && { message }),
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    sendAdminEmail(
      `🏧 Retrait — ${clientName}`,
      `Nouvelle demande de retrait.\n\n` +
      `Client : ${clientName}\nTéléphone : ${clientPhone || 'N/A'}\n` +
      `Wallet ID : ${clientWalletId || 'N/A'}\n` +
      `Montant USD : $${(usdAmount || amount).toFixed ? (usdAmount || amount).toFixed(2) : usdAmount || amount}\n` +
      (htgEquivalent ? `≈ HTG : ${htgEquivalent.toLocaleString()} HTG\n` : '') +
      `Méthode : ${method}\nCompte : ${accountNumber}\n` +
      (accountName ? `Bénéficiaire : ${accountName}\n` : '') +
      (message ? `Message : ${message}\n` : '') +
      `\n⚠️ Solde débité. Traitez ce retrait depuis le tableau de bord.`
    );

    res.json({ success: true, transactionId: txRef.id });
  } catch (e: any) {
    console.error('[withdrawal]', e);
    res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
});

// ── Lookup wallet by walletId (for transfer preview) ─────────────────────────
router.get('/api/client/lookup-wallet', requireDb, async (req, res) => {
  try {
    const walletId = (req.query.walletId as string || '').trim();
    if (!walletId) return res.status(400).json({ error: 'walletId requis.' });
    const snap = await adminDb.collection('clients')
      .where('walletId', '==', walletId).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Introuvable.' });
    const data = snap.docs[0].data();
    res.json({ name: data.name || '', found: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Client-to-client transfer ─────────────────────────────────────────────────
router.post('/api/client/transfer', requireDb, async (req, res) => {
  try {
    const { senderClientId, recipientWalletId, amount, message } = req.body;
    if (!senderClientId || !recipientWalletId || !amount)
      return res.status(400).json({ error: 'Paramètres manquants.' });
    const usd = Number(amount);
    if (isNaN(usd) || usd <= 0)
      return res.status(400).json({ error: 'Montant invalide.' });

    // Load sender
    const senderRef = adminDb.collection('clients').doc(senderClientId);
    const senderSnap = await senderRef.get();
    if (!senderSnap.exists) return res.status(404).json({ error: 'Expéditeur introuvable.' });
    const senderData = senderSnap.data()!;
    if ((senderData.balance || 0) < usd)
      return res.status(400).json({ error: 'Solde insuffisant.' });

    // Find recipient by walletId
    const recipSnap = await adminDb.collection('clients')
      .where('walletId', '==', recipientWalletId.trim()).limit(1).get();
    if (recipSnap.empty)
      return res.status(404).json({ error: 'Aucun wallet trouvé avec cet ID.' });
    const recipDoc = recipSnap.docs[0];
    if (recipDoc.id === senderClientId)
      return res.status(400).json({ error: 'Vous ne pouvez pas vous transférer à vous-même.' });
    const recipData = recipDoc.data()!;

    const batch = adminDb.batch();
    // Debit sender
    batch.update(senderRef, {
      balance: Math.max(0, (senderData.balance || 0) - usd),
      updatedAt: FieldValue.serverTimestamp(),
    });
    // Credit recipient
    batch.update(recipDoc.ref, {
      balance: (recipData.balance || 0) + usd,
      updatedAt: FieldValue.serverTimestamp(),
    });
    // Sender tx
    const senderTxRef = adminDb.collection('client_transactions').doc();
    batch.set(senderTxRef, {
      clientId: senderClientId, clientName: senderData.name || '',
      type: 'withdrawal', amount: usd, usdAmount: usd,
      status: 'completed', method: 'Transfert Wallet',
      description: `Transfert vers ${recipData.name || recipientWalletId}${message ? ` — ${message}` : ''}`,
      recipientWalletId: recipientWalletId.trim(),
      recipientName: recipData.name || '',
      ...(message && { message }),
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    // Recipient tx
    const recipTxRef = adminDb.collection('client_transactions').doc();
    batch.set(recipTxRef, {
      clientId: recipDoc.id, clientName: recipData.name || '',
      type: 'transfer_received', amount: usd, usdAmount: usd,
      status: 'completed', method: 'Transfert Wallet',
      description: `Reçu de ${senderData.name || senderClientId}${message ? ` — ${message}` : ''}`,
      senderWalletId: senderData.walletId || '',
      senderName: senderData.name || '',
      ...(message && { message }),
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    res.json({ success: true, recipientName: recipData.name || '', amount: usd });
  } catch (e: any) {
    console.error('[transfer]', e);
    res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
});

// ── Delete client transaction history ────────────────────────────────────────
router.delete('/api/client/transactions/:clientId', requireDb, async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) return res.status(400).json({ error: 'clientId requis.' });
    const snap = await adminDb.collection('client_transactions')
      .where('clientId', '==', clientId).limit(200).get();
    const batch = adminDb.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    res.json({ success: true, deleted: snap.size });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: Wallet Stats ───────────────────────────────────────────────────────
router.get('/api/admin/wallet/stats', requireDb, async (req, res) => {
  if (req.headers['x-admin-secret'] !== 'rena-admin-2024')
    return res.status(403).json({ error: 'Non autorisé.' });
  try {
    const [txSnap, clientsSnap] = await Promise.all([
      adminDb.collection('client_transactions').orderBy('createdAt', 'desc').limit(500).get(),
      adminDb.collection('clients').get(),
    ]);
    const txs = txSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    const clients = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    const sum = (arr: any[], field: string) => arr.reduce((s, t) => s + (t[field] || t.amount || 0), 0);
    const approved = (type: string) => txs.filter(t => t.type === type && (t.status === 'approved' || t.status === 'completed'));

    res.json({
      totalDeposited: sum(approved('deposit'), 'usdAmount'),
      totalWithdrawn: sum(approved('withdrawal'), 'usdAmount'),
      totalSpent: sum(approved('purchase'), 'usdAmount'),
      totalBalance: clients.reduce((s: number, c: any) => s + (c.balance || 0), 0),
      activeWallets: clients.filter((c: any) => (c.balance || 0) > 0).length,
      totalClients: clients.length,
      pendingDeposits: txs.filter(t => t.type === 'deposit' && t.status === 'pending').length,
      pendingWithdrawals: txs.filter(t => t.type === 'withdrawal' && t.status === 'pending').length,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Purchase ──────────────────────────────────────────────────────────────────
router.post('/api/client/purchase', requireDb, async (req, res) => {
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
      const affRef = adminDb.collection('affiliates').doc(directSponsorId);
      const affSnap = await affRef.get();
      if (affSnap.exists) {
        const aff = affSnap.data()!;
        batch.update(affRef, {
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

router.post('/api/admin/purchase/approve', requireDb, async (req, res) => {
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
      const affRef = adminDb.collection('affiliates').doc(directSponsorId);
      const affSnap = await affRef.get();
      if (affSnap.exists) {
        const aff = affSnap.data()!;
        batch.update(affRef, {
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

router.post('/api/admin/purchase/decline', requireDb, async (req, res) => {
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

// ── Transaction status (deposits & withdrawals) ───────────────────────────────
router.post('/api/admin/transaction/status', requireDb, async (req, res) => {
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

    const clientRef = adminDb.collection('clients').doc(txData.clientId);
    const clientSnap = await clientRef.get();
    if (clientSnap.exists) {
      const cd = clientSnap.data()!;
      if (status === 'approved' && txData.type === 'deposit') {
        batch.update(clientRef, {
          balance: (cd.balance || 0) + txData.amount,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else if (status === 'rejected' && txData.type === 'withdrawal') {
        batch.update(clientRef, {
          balance: (cd.balance || 0) + txData.amount,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
    await batch.commit();
    res.json({ success: true });
  } catch (e: any) {
    console.error('[transaction/status]', e);
    res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
});

// ── Client auth ───────────────────────────────────────────────────────────────
router.post('/api/client/register', requireDb, async (req, res) => {
  try {
    const { name, phone, email, password, sponsorCode } = req.body;
    if (!name || !phone || !email || !password)
      return res.status(400).json({ error: 'Paramètres manquants.' });

    const existing = await adminDb.collection('clients').where('email', '==', email).get();
    if (!existing.empty) return res.status(409).json({ error: 'Un compte avec cet email existe déjà.' });

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

router.post('/api/client/login', requireDb, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });
    const snap = await adminDb.collection('clients')
      .where('email', '==', email).where('password', '==', password).limit(1).get();
    if (snap.empty) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    res.json({ success: true, client: serializeDoc(snap.docs[0]) });
  } catch (e: any) {
    console.error('[login]', e);
    res.status(500).json({ error: e.message || 'Erreur de connexion.' });
  }
});

router.post('/api/client/register-google', requireDb, async (req, res) => {
  try {
    const { phone, sponsorCode, googleUser } = req.body;
    if (!googleUser?.email || !googleUser?.uid)
      return res.status(400).json({ error: 'Données Google manquantes.' });

    const existing = await adminDb.collection('clients').where('email', '==', googleUser.email).get();
    if (!existing.empty) return res.status(409).json({ error: 'Un compte avec cet email existe déjà.' });

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

// ── Formations — Admin CRUD ───────────────────────────────────────────────────
router.use('/api/admin/formations', requireDb);

router.get('/api/admin/formations', async (_req, res) => {
  try {
    const snap = await adminDb.collection('formations').orderBy('createdAt', 'desc').get();
    res.json({ formations: snap.docs.map(serializeDoc) });
  } catch (e: any) {
    console.error('[formations GET]', e);
    res.status(500).json({ error: e.message || 'Erreur.' });
  }
});

router.post('/api/admin/formations', async (req, res) => {
  try {
    const data = sanitizeFormation(req.body);
    if (!data.title) return res.status(400).json({ error: 'Le titre est requis.' });
    const ref = await adminDb.collection('formations').add({
      ...data,
      studentsCount: data.studentsCount ?? 0,
      rating: data.rating ?? 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    res.json({ success: true, id: ref.id });
  } catch (e: any) {
    console.error('[formations POST]', e);
    res.status(500).json({ error: e.message || 'Erreur lors de la création.' });
  }
});

router.put('/api/admin/formations/:id', async (req, res) => {
  try {
    const data = sanitizeFormation(req.body);
    await adminDb.collection('formations').doc(req.params.id).update({
      ...data, updatedAt: FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (e: any) {
    console.error('[formations PUT]', e);
    res.status(500).json({ error: e.message || 'Erreur lors de la mise à jour.' });
  }
});

router.delete('/api/admin/formations/:id', async (req, res) => {
  try {
    await adminDb.collection('formations').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e: any) {
    console.error('[formations DELETE]', e);
    res.status(500).json({ error: e.message || 'Erreur lors de la suppression.' });
  }
});

router.get('/api/admin/formations/purchases', requireDb, async (_req, res) => {
  try {
    const snap = await adminDb.collection('formation_purchases').orderBy('purchasedAt', 'desc').get();
    res.json({ purchases: snap.docs.map(serializeDoc) });
  } catch (e: any) {
    console.error('[formations purchases GET all]', e);
    res.status(500).json({ error: e.message || 'Erreur.' });
  }
});

router.patch('/api/admin/formations/purchases/:id', requireDb, async (req, res) => {
  try {
    const { status, formationId } = req.body;
    if (!status) return res.status(400).json({ error: 'Statut requis.' });
    const batch = adminDb.batch();
    batch.update(adminDb.collection('formation_purchases').doc(req.params.id), {
      status, updatedAt: FieldValue.serverTimestamp(),
    });
    if (status === 'active' && formationId) {
      batch.update(adminDb.collection('formations').doc(formationId), {
        studentsCount: FieldValue.increment(1),
      });
    }
    await batch.commit();
    res.json({ success: true });
  } catch (e: any) {
    console.error('[formations purchases PATCH]', e);
    res.status(500).json({ error: e.message || 'Erreur.' });
  }
});

router.get('/api/admin/formations/payment-requests', requireDb, async (_req, res) => {
  try {
    const snap = await adminDb.collection('formation_payment_requests').orderBy('createdAt', 'desc').get();
    res.json({ requests: snap.docs.map(serializeDoc) });
  } catch (e: any) {
    console.error('[formation payment-requests GET]', e);
    res.status(500).json({ error: e.message || 'Erreur.' });
  }
});

router.patch('/api/admin/formations/payment-requests/:id', requireDb, async (req, res) => {
  try {
    const { action } = req.body;
    const reqSnap = await adminDb.collection('formation_payment_requests').doc(req.params.id).get();
    if (!reqSnap.exists) return res.status(404).json({ error: 'Demande introuvable.' });
    const data = reqSnap.data()!;
    const batch = adminDb.batch();
    if (action === 'approve') {
      batch.update(adminDb.collection('formation_payment_requests').doc(req.params.id), {
        status: 'approved', updatedAt: FieldValue.serverTimestamp(),
      });
      const purchaseRef = adminDb.collection('formation_purchases').doc();
      batch.set(purchaseRef, {
        userId: data.userId, userEmail: data.userEmail || '', userName: data.userName || '',
        formationId: data.formationId, formationTitle: data.formationTitle || '',
        amount: data.amount || 0, method: data.method || '',
        status: 'active',
        purchasedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (data.formationId) {
        batch.update(adminDb.collection('formations').doc(data.formationId), {
          studentsCount: FieldValue.increment(1),
        });
      }
    } else if (action === 'reject') {
      batch.update(adminDb.collection('formation_payment_requests').doc(req.params.id), {
        status: 'rejected', updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    res.json({ success: true });
  } catch (e: any) {
    console.error('[formation payment-requests PATCH]', e);
    res.status(500).json({ error: e.message || 'Erreur.' });
  }
});

// ── Online Sub-Services ───────────────────────────────────────────────────────
router.get('/api/online-sub-services', requireDb, async (_req, res) => {
  try {
    const snap = await adminDb.collection('online_sub_services').orderBy('order', 'asc').get();
    res.json({ services: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/api/admin/online-sub-services', requireDb, async (req, res) => {
  if (req.headers['x-admin-secret'] !== 'rena-admin-2024')
    return res.status(403).json({ error: 'Non autorisé.' });
  try {
    const { id, createdAt: _c, ...data } = req.body;
    if (id) {
      await adminDb.collection('online_sub_services').doc(id).set({ ...data, updatedAt: new Date() }, { merge: true });
      return res.json({ success: true, id });
    } else {
      const ref = await adminDb.collection('online_sub_services').add({ ...data, createdAt: new Date() });
      return res.json({ success: true, id: ref.id });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/api/admin/online-sub-services/:id', requireDb, async (req, res) => {
  if (req.headers['x-admin-secret'] !== 'rena-admin-2024')
    return res.status(403).json({ error: 'Non autorisé.' });
  try {
    await adminDb.collection('online_sub_services').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Formations — Public & User ─────────────────────────────────────────────────
router.use('/api/formations', requireDb);

router.get('/api/formations', async (_req, res) => {
  try {
    const snap = await adminDb.collection('formations')
      .where('published', '==', true).orderBy('createdAt', 'desc').get();
    res.json({ formations: snap.docs.map(serializeDoc) });
  } catch (e: any) {
    console.error('[formations public GET]', e);
    res.status(500).json({ error: e.message || 'Erreur.' });
  }
});

router.get('/api/formations/purchases/user/:userId', async (req, res) => {
  try {
    const snap = await adminDb.collection('formation_purchases')
      .where('userId', '==', req.params.userId).get();
    res.json({ purchases: snap.docs.map(serializeDoc) });
  } catch (e: any) {
    console.error('[formations purchases GET user]', e);
    res.status(500).json({ error: e.message || 'Erreur.' });
  }
});

router.post('/api/formations/purchases', async (req, res) => {
  try {
    const { userId, userEmail, userName, formationId, formationTitle, amount, method } = req.body;
    if (!userId || !formationId) return res.status(400).json({ error: 'Paramètres manquants.' });
    const existing = await adminDb.collection('formation_purchases')
      .where('userId', '==', userId).where('formationId', '==', formationId).where('status', '==', 'pending').get();
    if (!existing.empty) return res.json({ success: true, id: existing.docs[0].id, alreadyExists: true });
    const ref = await adminDb.collection('formation_purchases').add({
      userId, userEmail: userEmail || '', userName: userName || '',
      formationId, formationTitle: formationTitle || '', amount: amount || 0, method: method || '',
      status: 'pending',
      purchasedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    res.json({ success: true, id: ref.id });
  } catch (e: any) {
    console.error('[formations purchases POST]', e);
    res.status(500).json({ error: e.message || 'Erreur.' });
  }
});

router.post('/api/formations/purchases/wallet', async (req, res) => {
  try {
    const { clientId, clientName, formationId, formationTitle, amount } = req.body;
    if (!clientId || !formationId) return res.status(400).json({ error: 'Paramètres manquants.' });

    const existingSnap = await adminDb.collection('formation_purchases')
      .where('userId', '==', clientId).where('formationId', '==', formationId).where('status', '==', 'active').get();
    if (!existingSnap.empty) return res.json({ success: true, alreadyOwned: true });

    const clientRef = adminDb.collection('clients').doc(clientId);
    const clientSnap = await clientRef.get();
    if (!clientSnap.exists) return res.status(404).json({ error: 'Client introuvable.' });
    const clientData = clientSnap.data()!;

    const price = Number(amount) || 0;
    if (price > 0 && (clientData.balance || 0) < price)
      return res.status(400).json({ error: 'Solde insuffisant.' });

    const batch = adminDb.batch();
    if (price > 0) {
      batch.update(clientRef, {
        balance: Math.max(0, (clientData.balance || 0) - price),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    const purchaseRef = adminDb.collection('formation_purchases').doc();
    batch.set(purchaseRef, {
      userId: clientId, userEmail: clientData.email || '',
      userName: clientName || clientData.name || '',
      formationId, formationTitle: formationTitle || '',
      amount: price, method: price === 0 ? 'Gratuit' : 'Wallet',
      status: 'active',
      purchasedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (formationId) {
      batch.update(adminDb.collection('formations').doc(formationId), {
        studentsCount: FieldValue.increment(1),
      });
    }
    if (price > 0) {
      const notifRef = adminDb.collection('admin_notifications').doc();
      batch.set(notifRef, {
        type: 'formation_purchase', clientId,
        clientName: clientName || clientData.name || '',
        formationId, formationTitle: formationTitle || '',
        amount: price, method: 'Wallet',
        read: false, createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    res.json({ success: true });
  } catch (e: any) {
    console.error('[formations/purchases/wallet]', e);
    res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
});

router.post('/api/formations/free-access', async (req, res) => {
  try {
    const { userId, userEmail, userName, formationId, formationTitle } = req.body;
    if (!userId || !formationId) return res.status(400).json({ error: 'Paramètres manquants.' });
    const existing = await adminDb.collection('formation_purchases')
      .where('userId', '==', userId).where('formationId', '==', formationId).get();
    if (!existing.empty) {
      await existing.docs[0].ref.update({ status: 'active', updatedAt: FieldValue.serverTimestamp() });
    } else {
      const batch = adminDb.batch();
      const ref = adminDb.collection('formation_purchases').doc();
      batch.set(ref, {
        userId, userEmail: userEmail || '', userName: userName || '',
        formationId, formationTitle: formationTitle || '', amount: 0, method: 'Gratuit',
        status: 'active',
        purchasedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.update(adminDb.collection('formations').doc(formationId), {
        studentsCount: FieldValue.increment(1),
      });
      await batch.commit();
    }
    res.json({ success: true });
  } catch (e: any) {
    console.error('[formations free-access POST]', e);
    res.status(500).json({ error: e.message || 'Erreur.' });
  }
});

router.post('/api/formations/user', async (req, res) => {
  try {
    const { uid, email, displayName, photoURL } = req.body;
    if (!uid) return res.status(400).json({ error: 'UID requis.' });
    await adminDb.collection('formation_users').doc(uid).set(
      { uid, email: email || '', displayName: displayName || '', photoURL: photoURL || '', updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    res.json({ success: true });
  } catch (e: any) {
    console.error('[formations user POST]', e);
    res.status(500).json({ error: e.message || 'Erreur.' });
  }
});

router.post('/api/formations/payment-request', async (req, res) => {
  try {
    const { userId, userEmail, userName, formationId, formationTitle, amount, method, transactionCode } = req.body;
    if (!userId || !formationId || !method || !transactionCode)
      return res.status(400).json({ error: 'Paramètres manquants.' });
    const existing = await adminDb.collection('formation_purchases')
      .where('userId', '==', userId).where('formationId', '==', formationId).where('status', '==', 'active').get();
    if (!existing.empty) return res.json({ success: true, alreadyOwned: true });
    const batch = adminDb.batch();
    const reqRef = adminDb.collection('formation_payment_requests').doc();
    batch.set(reqRef, {
      userId, userEmail: userEmail || '', userName: userName || '',
      formationId, formationTitle: formationTitle || '',
      amount: amount || 0, method, transactionCode,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const notifRef = adminDb.collection('admin_notifications').doc();
    batch.set(notifRef, {
      type: 'formation_payment_request',
      clientId: userId, clientName: userName || '',
      formationId, formationTitle: formationTitle || '',
      amount: amount || 0, method, transactionCode,
      status: 'pending', read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    res.json({ success: true, id: reqRef.id });
  } catch (e: any) {
    console.error('[formation payment-request POST]', e);
    res.status(500).json({ error: e.message || 'Erreur.' });
  }
});

// ── Formation Progress ─────────────────────────────────────────────────────────
router.get('/api/formations/progress/:userId', async (req, res) => {
  try {
    const snap = await adminDb.collection('formation_progress')
      .where('userId', '==', req.params.userId).get();
    res.json({ progress: snap.docs.map(serializeDoc) });
  } catch (e: any) {
    console.error('[formations progress GET]', e);
    res.status(500).json({ error: e.message || 'Erreur.' });
  }
});

router.get('/api/formations/progress/:userId/:formationId', async (req, res) => {
  try {
    const { userId, formationId } = req.params;
    const snap = await adminDb.collection('formation_progress').doc(`${userId}_${formationId}`).get();
    if (!snap.exists) return res.json({ progress: null });
    res.json({ progress: { id: snap.id, ...snap.data() } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/api/formations/progress', async (req, res) => {
  try {
    const { userId, userEmail, formationId, moduleId, totalModules } = req.body;
    if (!userId || !formationId || !moduleId || !totalModules)
      return res.status(400).json({ error: 'Paramètres manquants.' });
    const snap = await adminDb.collection('formation_progress')
      .where('userId', '==', userId).where('formationId', '==', formationId).get();
    const now = FieldValue.serverTimestamp();
    if (snap.empty) {
      const completedModules = [moduleId];
      const percentage = Math.round((1 / Number(totalModules)) * 100);
      await adminDb.collection('formation_progress').add({
        userId, userEmail: userEmail || '', formationId,
        completedModules, percentage, startedAt: now, lastAccessedAt: now,
        ...(percentage === 100 ? { completedAt: now } : {}),
      });
    } else {
      const docRef = snap.docs[0].ref;
      const data = snap.docs[0].data();
      const completedModules = Array.from(new Set([...(data.completedModules || []), moduleId]));
      const percentage = Math.round((completedModules.length / Number(totalModules)) * 100);
      await docRef.update({
        completedModules, percentage, lastAccessedAt: now,
        ...(percentage === 100 ? { completedAt: now } : {}),
      });
    }
    res.json({ success: true });
  } catch (e: any) {
    console.error('[formations progress POST]', e);
    res.status(500).json({ error: e.message || 'Erreur.' });
  }
});

router.post('/api/formations/progress/complete', async (req, res) => {
  try {
    const { userId, formationId, moduleId } = req.body;
    if (!userId || !formationId || !moduleId)
      return res.status(400).json({ error: 'Paramètres manquants.' });
    const docId = `${userId}_${formationId}`;
    const ref = adminDb.collection('formation_progress').doc(docId);
    const snap = await ref.get();
    if (snap.exists) {
      const existing = snap.data()!.completedModuleIds || [];
      if (!existing.includes(moduleId)) {
        await ref.update({
          completedModuleIds: FieldValue.arrayUnion(moduleId),
          currentModuleId: moduleId,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } else {
      await ref.set({
        userId, formationId,
        completedModuleIds: [moduleId],
        currentModuleId: moduleId,
        lastPositionSeconds: 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/api/formations/progress/position', async (req, res) => {
  try {
    const { userId, formationId, moduleId, positionSeconds } = req.body;
    if (!userId || !formationId) return res.status(400).json({ error: 'Paramètres manquants.' });
    const docId = `${userId}_${formationId}`;
    const ref = adminDb.collection('formation_progress').doc(docId);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.update({
        currentModuleId: moduleId,
        lastPositionSeconds: positionSeconds || 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await ref.set({
        userId, formationId,
        completedModuleIds: [],
        currentModuleId: moduleId,
        lastPositionSeconds: positionSeconds || 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin secret guard ────────────────────────────────────────────────────────
const requireAdminSecret = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.headers['x-admin-secret'] !== 'rena-admin-2024')
    return res.status(403).json({ error: 'Non autorisé.' });
  next();
};

// ── Admin Login (server-side — élimine la dépendance à l'auth anonyme) ───────
router.post('/api/admin/login', requireDb, async (req, res) => {
  try {
    const { fullName, password, loginCode } = req.body;
    if (!fullName || !password)
      return res.status(400).json({ error: 'Identifiants requis.' });

    const snap = await adminDb.collection('admin_accounts').where('fullName', '==', fullName).limit(1).get();
    if (snap.empty) {
      await adminDb.collection('admin_login_logs').add({ adminName: fullName, success: false, timestamp: FieldValue.serverTimestamp() });
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const adminDoc = snap.docs[0];
    const adminData: any = { id: adminDoc.id, ...adminDoc.data() };

    if (adminData.lockUntil) {
      const lockDate = adminData.lockUntil?.toDate ? adminData.lockUntil.toDate() : new Date(adminData.lockUntil);
      if (lockDate > new Date())
        return res.status(403).json({ error: 'Compte bloqué temporairement. Réessayez plus tard.' });
    }

    if (adminData.password !== password) {
      const newAttempts = (adminData.failedAttempts || 0) + 1;
      const upd: any = { failedAttempts: newAttempts };
      if (newAttempts >= 5) upd.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      await adminDoc.ref.update(upd);
      await adminDb.collection('admin_login_logs').add({ adminName: fullName, success: false, timestamp: FieldValue.serverTimestamp() });
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    if (adminData.isSuperAdmin && adminData.loginCode && adminData.loginCode !== loginCode) {
      await adminDb.collection('admin_login_logs').add({ adminName: fullName, success: false, timestamp: FieldValue.serverTimestamp() });
      return res.status(401).json({ error: 'Code de connexion incorrect.' });
    }

    await adminDoc.ref.update({ failedAttempts: 0, lockUntil: null, updatedAt: FieldValue.serverTimestamp() });
    await adminDb.collection('admin_login_logs').add({ adminName: fullName, success: true, timestamp: FieldValue.serverTimestamp() });

    res.json({ success: true, admin: serializeDoc(adminDoc) });
  } catch (e: any) {
    console.error('[admin/login]', e);
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
});

// ── Admin: Verify Google login (server-side writes via Admin SDK) ─────────────
router.post('/api/admin/verify-google', requireDb, async (req, res) => {
  try {
    const { email, uid } = req.body;
    if (!email || !uid) return res.status(400).json({ error: 'Données manquantes.' });

    let adminSnap = await adminDb.collection('admin_accounts').where('email', '==', email.toLowerCase()).limit(1).get();
    if (adminSnap.empty) {
      adminSnap = await adminDb.collection('admin_accounts').where('uid', '==', uid).limit(1).get();
    }
    if (adminSnap.empty) {
      await adminDb.collection('admin_login_logs').add({ adminName: email, success: false, timestamp: FieldValue.serverTimestamp() });
      return res.status(403).json({ error: `Accès refusé. L'adresse "${email}" n'est associée à aucun compte administrateur Rena.` });
    }

    const adminDoc = adminSnap.docs[0];
    const adminData: any = { id: adminDoc.id, ...adminDoc.data() };

    if (adminData.lockUntil) {
      const lockDate = adminData.lockUntil?.toDate ? adminData.lockUntil.toDate() : new Date(adminData.lockUntil);
      if (lockDate > new Date()) {
        return res.status(403).json({ error: 'Compte bloqué temporairement. Réessayez plus tard.' });
      }
    }

    const updates: any = { failedAttempts: 0, updatedAt: FieldValue.serverTimestamp() };
    if (!adminData.uid) updates.uid = uid;
    if (!adminData.email) updates.email = email.toLowerCase();
    await adminDoc.ref.update(updates);

    await adminDb.collection('admin_login_logs').add({ adminName: adminData.fullName, success: true, timestamp: FieldValue.serverTimestamp() });

    res.json({ success: true, admin: serializeDoc(adminDoc) });
  } catch (e: any) {
    console.error('[admin/verify-google]', e);
    res.status(500).json({ error: 'Erreur vérification Google.' });
  }
});

// ── Client: Update Google UID ─────────────────────────────────────────────────
router.post('/api/client/update-google-uid', requireDb, async (req, res) => {
  try {
    const { clientId, uid, photoUrl } = req.body;
    if (!clientId || !uid) return res.status(400).json({ error: 'Paramètres manquants.' });
    const updates: any = { uid, updatedAt: FieldValue.serverTimestamp() };
    if (photoUrl) updates.photoUrl = photoUrl;
    await adminDb.collection('clients').doc(clientId).update(updates);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Admin: Parcels ────────────────────────────────────────────────────────────
router.post('/api/admin/parcel', requireDb, requireAdminSecret, async (req, res) => {
  try {
    const { id, createdAt: _c, updatedAt: _u, ...data } = req.body;
    const ts = FieldValue.serverTimestamp();
    if (id) {
      await adminDb.collection('parcels').doc(id).update({ ...data, updatedAt: ts });
      return res.json({ success: true, id });
    }
    const ref = await adminDb.collection('parcels').add({ ...data, createdAt: ts, updatedAt: ts });
    res.json({ success: true, id: ref.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/admin/parcel/:id', requireDb, requireAdminSecret, async (req, res) => {
  try {
    await adminDb.collection('parcels').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Admin: Products ───────────────────────────────────────────────────────────
router.post('/api/admin/product', requireDb, requireAdminSecret, async (req, res) => {
  try {
    const { id, createdAt: _c, updatedAt: _u, ...data } = req.body;
    const ts = FieldValue.serverTimestamp();
    if (id) {
      await adminDb.collection('products').doc(id).update({ ...data, updatedAt: ts });
      return res.json({ success: true, id });
    }
    const ref = await adminDb.collection('products').add({ ...data, createdAt: ts });
    res.json({ success: true, id: ref.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/admin/product/:id', requireDb, requireAdminSecret, async (req, res) => {
  try {
    await adminDb.collection('products').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Admin: Games ──────────────────────────────────────────────────────────────
router.post('/api/admin/game', requireDb, requireAdminSecret, async (req, res) => {
  try {
    const { id, createdAt: _c, updatedAt: _u, ...data } = req.body;
    const ts = FieldValue.serverTimestamp();
    if (id) {
      await adminDb.collection('games').doc(id).update({ ...data, updatedAt: ts });
      return res.json({ success: true, id });
    }
    const ref = await adminDb.collection('games').add({ ...data, createdAt: ts, updatedAt: ts });
    res.json({ success: true, id: ref.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/admin/game/:id', requireDb, requireAdminSecret, async (req, res) => {
  try {
    await adminDb.collection('games').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Admin: Card Topups ────────────────────────────────────────────────────────
router.post('/api/admin/card-topup', requireDb, requireAdminSecret, async (req, res) => {
  try {
    const { id, createdAt: _c, updatedAt: _u, ...data } = req.body;
    const ts = FieldValue.serverTimestamp();
    if (id) {
      await adminDb.collection('card_topups').doc(id).update({ ...data, updatedAt: ts });
      return res.json({ success: true, id });
    }
    const ref = await adminDb.collection('card_topups').add({ ...data, createdAt: ts, updatedAt: ts });
    res.json({ success: true, id: ref.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/admin/card-topup/:id', requireDb, requireAdminSecret, async (req, res) => {
  try {
    await adminDb.collection('card_topups').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Admin: Nav Buttons ────────────────────────────────────────────────────────
router.post('/api/admin/nav-button', requireDb, requireAdminSecret, async (req, res) => {
  try {
    const { id, createdAt: _c, updatedAt: _u, ...data } = req.body;
    const ts = FieldValue.serverTimestamp();
    if (id) {
      await adminDb.collection('nav_buttons').doc(id).update({ ...data, updatedAt: ts });
      return res.json({ success: true, id });
    }
    const ref = await adminDb.collection('nav_buttons').add({ ...data, createdAt: ts, updatedAt: ts });
    res.json({ success: true, id: ref.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/admin/nav-button/:id', requireDb, requireAdminSecret, async (req, res) => {
  try {
    await adminDb.collection('nav_buttons').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Admin: Slider Images ──────────────────────────────────────────────────────
router.post('/api/admin/slider-image', requireDb, requireAdminSecret, async (req, res) => {
  try {
    const { url, title, description } = req.body;
    const ref = await adminDb.collection('slider_images').add({
      url, title: title || '', description: description || '',
      createdAt: FieldValue.serverTimestamp(),
    });
    res.json({ success: true, id: ref.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/api/admin/slider-image/:id', requireDb, requireAdminSecret, async (req, res) => {
  try {
    const updates: any = { updatedAt: FieldValue.serverTimestamp() };
    const { url, title, description } = req.body;
    if (url !== undefined) updates.url = url;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    await adminDb.collection('slider_images').doc(req.params.id).update(updates);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/admin/slider-image/:id', requireDb, requireAdminSecret, async (req, res) => {
  try {
    await adminDb.collection('slider_images').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Admin: Shipping Configs ───────────────────────────────────────────────────
router.post('/api/admin/shipping-config', requireDb, requireAdminSecret, async (req, res) => {
  try {
    const { id: _id, type, ...data } = req.body;
    if (!type) return res.status(400).json({ error: 'Type requis.' });
    await adminDb.collection('shipping_configs').doc(type).set(
      { ...data, type, updatedAt: FieldValue.serverTimestamp() }, { merge: true }
    );
    res.json({ success: true, id: type });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/admin/shipping-config/:id', requireDb, requireAdminSecret, async (req, res) => {
  try {
    await adminDb.collection('shipping_configs').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Admin: Settings ───────────────────────────────────────────────────────────
router.post('/api/admin/settings', requireDb, requireAdminSecret, async (req, res) => {
  try {
    const cleanData = Object.entries(req.body).reduce((acc: any, [k, v]) => {
      if (v !== undefined) acc[k] = v;
      return acc;
    }, {});
    await adminDb.collection('settings').doc('global').set(cleanData, { merge: true });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Admin: Admin Accounts CRUD ────────────────────────────────────────────────
router.post('/api/admin/account', requireDb, requireAdminSecret, async (req, res) => {
  try {
    const { id, createdAt: _c, updatedAt: _u, ...data } = req.body;
    const ts = FieldValue.serverTimestamp();
    if (id) {
      await adminDb.collection('admin_accounts').doc(id).update({ ...data, updatedAt: ts });
      return res.json({ success: true, id });
    }
    const ref = await adminDb.collection('admin_accounts').add({
      ...data, failedAttempts: 0, createdAt: ts, updatedAt: ts,
    });
    res.json({ success: true, id: ref.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/admin/account/:id', requireDb, requireAdminSecret, async (req, res) => {
  try {
    await adminDb.collection('admin_accounts').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Catch-all: unmatched /api/* → clean JSON 404 ─────────────────────────────
router.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Route API introuvable.' });
});

export { adminDb };
export default router;
