import express from "express";
import { createServer as createHttpServer } from "http";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Firebase Admin SDK ──────────────────────────────────────────────────────
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let adminApp: App;
let adminDb: ReturnType<typeof getFirestore>;

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
  } else {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountEnv) {
      console.error('[Admin] FIREBASE_SERVICE_ACCOUNT not set — admin routes disabled');
      return;
    }
    try {
      let rawJson = serviceAccountEnv.trim();
      // Handle case where secret was pasted without the leading '{'
      if (!rawJson.startsWith('{')) rawJson = '{' + rawJson;
      const serviceAccount = JSON.parse(rawJson);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      });
    } catch (e) {
      console.error('[Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT:', e);
      return;
    }
  }
  adminDb = getFirestore(adminApp);
  // Point to the custom Firestore database
  adminDb = getFirestore(adminApp, 'ai-studio-283d6370-7e1a-484a-aed2-4d5b3071d1e2');
  console.log('[Admin] Firebase Admin SDK initialized');
}

initFirebaseAdmin();

// ─── Server ──────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = 5000;

  app.use(express.json());

  // ── CORS — allow all origins so the deployed app works from any domain ──────
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // ── Health check ────────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // ── Request logger (API only) ─────────────────────────────────────────────
  app.use('/api', (req, _res, next) => {
    console.log(`[API] ${req.method} ${req.path}`);
    next();
  });

  // ── reCAPTCHA verification helper ───────────────────────────────────────────
  async function verifyRecaptcha(token: string): Promise<boolean> {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) { console.warn('[reCAPTCHA] RECAPTCHA_SECRET_KEY not set — skipping verification'); return true; }
    try {
      const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`
      });
      const data: any = await resp.json();
      return data.success === true;
    } catch (e) {
      console.error('[reCAPTCHA] verification error:', e);
      return false;
    }
  }

  // ── Registration email notification ────────────────────────────────────────
  app.post("/api/notify-registration", async (req, res) => {
    const { name, email, phone, message, date } = req.body;
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials missing. Skipping email notification.");
        return res.status(200).json({ success: true, warning: "SMTP credentials missing" });
      }
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: `"Neopay System" <${process.env.SMTP_USER}>`,
        to: "neopayservices509@gmail.com",
        subject: `Nouvelle demande d'inscription affilié : ${name}`,
        text: `Nouvelle demande d'inscription reçue !\n\nNom: ${name}\nEmail: ${email}\nTéléphone: ${phone || "Non fourni"}\nMessage: ${message || "Aucun message"}\nDate: ${date}\n\nVeuillez vous connecter au tableau de bord administrateur pour approuver ou rejeter cette demande.`,
      });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // ── Guard: all routes below require adminDb ─────────────────────────────────
  app.use('/api/client', (req, res, next) => {
    if (!adminDb) return res.status(503).json({ error: 'Firebase Admin non initialisé. Contactez le support.' });
    next();
  });
  app.use('/api/admin', (req, res, next) => {
    if (!adminDb) return res.status(503).json({ error: 'Firebase Admin non initialisé. Contactez le support.' });
    next();
  });

  // ─── Serialize Firestore Timestamps to plain objects ──────────────────────
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

  // ────────────────────────────────────────────────────────────────────────────
  // GET /api/admin/transactions  — all client_transactions
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/api/admin/transactions', async (_req, res) => {
    try {
      const snap = await adminDb.collection('client_transactions').orderBy('createdAt', 'desc').limit(500).get();
      res.json({ transactions: snap.docs.map(serializeDoc) });
    } catch (e: any) {
      console.error('[GET transactions]', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /api/admin/notifications  — all admin_notifications
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/api/admin/notifications', async (_req, res) => {
    try {
      const snap = await adminDb.collection('admin_notifications').orderBy('createdAt', 'desc').limit(200).get();
      res.json({ notifications: snap.docs.map(serializeDoc) });
    } catch (e: any) {
      console.error('[GET notifications]', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /api/client/transactions/:clientId  — a single client's transactions
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/api/client/transactions/:clientId', async (req, res) => {
    try {
      const { clientId } = req.params;
      const snap = await adminDb.collection('client_transactions')
        .where('clientId', '==', clientId)
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get();
      res.json({ transactions: snap.docs.map(serializeDoc) });
    } catch (e: any) {
      console.error('[GET client transactions]', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // PATCH /api/admin/notifications/:id/read
  // ────────────────────────────────────────────────────────────────────────────
  app.patch('/api/admin/notifications/:id/read', async (req, res) => {
    try {
      await adminDb.collection('admin_notifications').doc(req.params.id).update({ read: true });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // PATCH /api/admin/notifications/read-all
  // ────────────────────────────────────────────────────────────────────────────
  app.patch('/api/admin/notifications/read-all', async (_req, res) => {
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

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/client/deposit
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/api/client/deposit', async (req, res) => {
    try {
      const { clientId, clientName, clientWalletId, amount, method, txId, message, captchaToken } = req.body;
      if (!clientId || !clientName || !amount || !method) {
        return res.status(400).json({ error: 'Paramètres manquants.' });
      }
      if (amount <= 0) return res.status(400).json({ error: 'Montant invalide.' });
      if (captchaToken && !(await verifyRecaptcha(captchaToken))) {
        return res.status(400).json({ error: 'Vérification reCAPTCHA échouée. Veuillez réessayer.' });
      }

      const txRef = await adminDb.collection('client_transactions').add({
        clientId,
        clientName,
        type: 'deposit',
        amount,
        status: 'pending',
        method,
        ...(txId && { txId }),
        ...(message && { message }),
        description: `Demande de dépôt via ${method}${message ? ` — ${message}` : ''}`,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      await adminDb.collection('admin_notifications').add({
        type: 'client_deposit',
        clientId,
        clientName,
        clientWalletId: clientWalletId || '',
        transactionId: txRef.id,
        amount,
        method,
        ...(txId && { txId }),
        ...(message && { message }),
        read: false,
        createdAt: FieldValue.serverTimestamp()
      });

      res.json({ success: true, transactionId: txRef.id });
    } catch (e: any) {
      console.error('[deposit]', e);
      res.status(500).json({ error: e.message || 'Erreur serveur.' });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/client/withdrawal
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/api/client/withdrawal', async (req, res) => {
    try {
      const { clientId, clientName, clientPhone, clientWalletId, amount, method, accountNumber, message, captchaToken } = req.body;
      if (!clientId || !clientName || !amount || !method || !accountNumber) {
        return res.status(400).json({ error: 'Paramètres manquants.' });
      }
      if (amount <= 0) return res.status(400).json({ error: 'Montant invalide.' });
      if (captchaToken && !(await verifyRecaptcha(captchaToken))) {
        return res.status(400).json({ error: 'Vérification reCAPTCHA échouée. Veuillez réessayer.' });
      }

      // Check balance server-side and immediately deduct
      const clientRef = adminDb.collection('clients').doc(clientId);
      const clientSnap = await clientRef.get();
      if (!clientSnap.exists) return res.status(404).json({ error: 'Client introuvable.' });
      const clientData = clientSnap.data()!;
      if ((clientData.balance || 0) < amount) {
        return res.status(400).json({ error: 'Solde insuffisant.' });
      }

      const batch = adminDb.batch();

      // Immediately deduct balance
      batch.update(clientRef, {
        balance: Math.max(0, (clientData.balance || 0) - amount),
        updatedAt: FieldValue.serverTimestamp()
      });

      const txRef = adminDb.collection('client_transactions').doc();
      batch.set(txRef, {
        clientId,
        clientName,
        type: 'withdrawal',
        amount,
        status: 'pending',
        method,
        accountNumber,
        ...(message && { message }),
        description: `Demande de retrait via ${method}${message ? ` — ${message}` : ''}`,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      const notifRef = adminDb.collection('admin_notifications').doc();
      batch.set(notifRef, {
        type: 'client_withdrawal',
        clientId,
        clientName,
        clientPhone: clientPhone || '',
        clientWalletId: clientWalletId || '',
        transactionId: txRef.id,
        amount,
        method,
        accountNumber,
        ...(message && { message }),
        read: false,
        createdAt: FieldValue.serverTimestamp()
      });

      await batch.commit();

      res.json({ success: true, transactionId: txRef.id });
    } catch (e: any) {
      console.error('[withdrawal]', e);
      res.status(500).json({ error: e.message || 'Erreur serveur.' });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/client/purchase  — immediate balance deduction (no admin approval)
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/api/client/purchase', async (req, res) => {
    try {
      const { clientId, clientName, clientPhone, clientWalletId, amount, productName, productPrice, directSponsorId } = req.body;
      if (!clientId || !clientName || !amount || !productName) {
        return res.status(400).json({ error: 'Paramètres manquants.' });
      }
      if (amount <= 0) return res.status(400).json({ error: 'Montant invalide.' });

      // Check balance server-side
      const clientRef = adminDb.collection('clients').doc(clientId);
      const clientSnap = await clientRef.get();
      if (!clientSnap.exists) return res.status(404).json({ error: 'Client introuvable.' });
      const clientData = clientSnap.data()!;
      if ((clientData.balance || 0) < amount) {
        return res.status(400).json({ error: 'Solde insuffisant pour cet achat.' });
      }

      const batch = adminDb.batch();

      // ① Immediately deduct balance
      batch.update(clientRef, {
        balance: Math.max(0, (clientData.balance || 0) - amount),
        updatedAt: FieldValue.serverTimestamp()
      });

      // ② Credit affiliate if applicable
      if (directSponsorId) {
        const affiliateRef = adminDb.collection('affiliates').doc(directSponsorId);
        const affiliateSnap = await affiliateRef.get();
        if (affiliateSnap.exists) {
          const aff = affiliateSnap.data()!;
          batch.update(affiliateRef, {
            balance: (aff.balance || 0) + amount,
            totalEarnings: (aff.totalEarnings || 0) + amount,
            monthlySales: (aff.monthlySales || 0) + amount,
            updatedAt: FieldValue.serverTimestamp()
          });
        }
      }

      // ③ Record as completed immediately
      const txRef = adminDb.collection('client_transactions').doc();
      batch.set(txRef, {
        clientId,
        clientName,
        type: 'purchase',
        amount,
        status: 'completed',
        productName,
        productPrice,
        directSponsorId: directSponsorId || null,
        affiliateCredited: !!directSponsorId,
        description: `Achat: ${productName} - ${productPrice}`,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      // ④ Notify admin (informational — no approval needed)
      const notifRef = adminDb.collection('admin_notifications').doc();
      batch.set(notifRef, {
        type: 'client_purchase',
        clientId,
        clientName,
        clientPhone: clientPhone || '',
        clientWalletId: clientWalletId || '',
        transactionId: txRef.id,
        amount,
        productName,
        productPrice,
        directSponsorId: directSponsorId || null,
        status: 'completed',
        read: false,
        createdAt: FieldValue.serverTimestamp()
      });

      await batch.commit();
      res.json({ success: true, transactionId: txRef.id });
    } catch (e: any) {
      console.error('[purchase]', e);
      res.status(500).json({ error: e.message || 'Erreur serveur.' });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/admin/purchase/approve
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/api/admin/purchase/approve', async (req, res) => {
    try {
      const { notifId, transactionId, clientId, amount, directSponsorId } = req.body;
      if (!notifId || !transactionId || !clientId || !amount) {
        return res.status(400).json({ error: 'Paramètres manquants.' });
      }

      const clientRef = adminDb.collection('clients').doc(clientId);
      const clientSnap = await clientRef.get();
      if (!clientSnap.exists) return res.status(404).json({ error: 'Client introuvable.' });
      const clientData = clientSnap.data()!;
      if ((clientData.balance || 0) < amount) {
        return res.status(400).json({ error: 'Solde client insuffisant.' });
      }

      const batch = adminDb.batch();

      // Deduct client balance
      batch.update(clientRef, {
        balance: Math.max(0, (clientData.balance || 0) - amount),
        updatedAt: FieldValue.serverTimestamp()
      });

      // Credit affiliate sponsor if applicable
      if (directSponsorId) {
        const affiliateRef = adminDb.collection('affiliates').doc(directSponsorId);
        const affiliateSnap = await affiliateRef.get();
        if (affiliateSnap.exists) {
          const aff = affiliateSnap.data()!;
          batch.update(affiliateRef, {
            balance: (aff.balance || 0) + amount,
            totalEarnings: (aff.totalEarnings || 0) + amount,
            monthlySales: (aff.monthlySales || 0) + amount,
            updatedAt: FieldValue.serverTimestamp()
          });
        }
      }

      // Mark transaction completed
      batch.update(adminDb.collection('client_transactions').doc(transactionId), {
        status: 'completed',
        affiliateCredited: !!directSponsorId,
        updatedAt: FieldValue.serverTimestamp()
      });

      // Mark notification approved
      batch.update(adminDb.collection('admin_notifications').doc(notifId), {
        status: 'approved',
        read: true,
        resolvedAt: FieldValue.serverTimestamp()
      });

      await batch.commit();
      res.json({ success: true });
    } catch (e: any) {
      console.error('[purchase/approve]', e);
      res.status(500).json({ error: e.message || 'Erreur serveur.' });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/admin/purchase/decline
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/api/admin/purchase/decline', async (req, res) => {
    try {
      const { notifId, transactionId } = req.body;
      if (!notifId || !transactionId) {
        return res.status(400).json({ error: 'Paramètres manquants.' });
      }

      const batch = adminDb.batch();
      batch.update(adminDb.collection('client_transactions').doc(transactionId), {
        status: 'rejected',
        updatedAt: FieldValue.serverTimestamp()
      });
      batch.update(adminDb.collection('admin_notifications').doc(notifId), {
        status: 'declined',
        read: true,
        resolvedAt: FieldValue.serverTimestamp()
      });

      await batch.commit();
      res.json({ success: true });
    } catch (e: any) {
      console.error('[purchase/decline]', e);
      res.status(500).json({ error: e.message || 'Erreur serveur.' });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/admin/transaction/status  (deposits & withdrawals)
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/api/admin/transaction/status', async (req, res) => {
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
        updatedAt: FieldValue.serverTimestamp()
      });

      const clientRef2 = adminDb.collection('clients').doc(txData.clientId);
      const clientSnap2 = await clientRef2.get();
      if (clientSnap2.exists) {
        const clientData2 = clientSnap2.data()!;
        if (status === 'approved') {
          if (txData.type === 'deposit') {
            // Deposit approved: credit balance
            batch.update(clientRef2, {
              balance: (clientData2.balance || 0) + txData.amount,
              updatedAt: FieldValue.serverTimestamp()
            });
          }
          // Withdrawal approved: balance already deducted on submission, no change needed
        } else if (status === 'rejected') {
          if (txData.type === 'withdrawal') {
            // Withdrawal rejected: refund the amount that was deducted on submission
            batch.update(clientRef2, {
              balance: (clientData2.balance || 0) + txData.amount,
              updatedAt: FieldValue.serverTimestamp()
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

  // ────────────────────────────────────────────────────────────────────────────
  // DELETE /api/client/transactions/:clientId  — clear a client's tx history
  // ────────────────────────────────────────────────────────────────────────────
  app.delete('/api/client/transactions/:clientId', async (req, res) => {
    if (!adminDb) return res.status(503).json({ error: 'Service indisponible.' });
    try {
      const { clientId } = req.params;
      const snap = await adminDb.collection('client_transactions')
        .where('clientId', '==', clientId)
        .get();
      const batch = adminDb.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      res.json({ success: true, deleted: snap.size });
    } catch (e: any) {
      console.error('[delete transactions]', e);
      res.status(500).json({ error: e.message || 'Erreur serveur.' });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/client/register  — creates a new client via Admin SDK
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/api/client/register', async (req, res) => {
    try {
      const { name, phone, email, password, sponsorCode } = req.body;
      if (!name || !phone || !email || !password) {
        return res.status(400).json({ error: 'Paramètres manquants.' });
      }
      if (!adminDb) return res.status(503).json({ error: 'Service indisponible.' });

      const existing = await adminDb.collection('clients').where('email', '==', email).get();
      if (!existing.empty) {
        return res.status(409).json({ error: 'Un compte avec cet email existe déjà.' });
      }

      // Generate unique wallet ID
      let walletId = '';
      let unique = false;
      while (!unique) {
        walletId = Math.floor(10000000 + Math.random() * 90000000).toString();
        const wSnap = await adminDb.collection('clients').where('walletId', '==', walletId).get();
        if (wSnap.empty) unique = true;
      }

      // Resolve sponsor
      let directSponsorId: string | undefined;
      let indirectSponsorId: string | undefined;
      if (sponsorCode) {
        const affSnap = await adminDb.collection('affiliates').where('code', '==', sponsorCode).get();
        if (!affSnap.empty) {
          directSponsorId = affSnap.docs[0].id;
          const affData = affSnap.docs[0].data();
          if (affData.parentAffiliateId) indirectSponsorId = affData.parentAffiliateId;
        }
      }

      const clientData: any = {
        name, phone, email, password,
        balance: 0, walletId, status: 'active',
        ...(directSponsorId && { directSponsorId }),
        ...(indirectSponsorId && { indirectSponsorId }),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      const ref = await adminDb.collection('clients').add(clientData);
      res.json({ success: true, client: { id: ref.id, ...clientData, createdAt: null, updatedAt: null } });
    } catch (e: any) {
      console.error('[register]', e);
      res.status(500).json({ error: e.message || 'Erreur lors de l\'inscription.' });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/client/login  — authenticates a client via Admin SDK
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/api/client/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis.' });
      }
      if (!adminDb) return res.status(503).json({ error: 'Service indisponible.' });

      const snap = await adminDb.collection('clients')
        .where('email', '==', email)
        .where('password', '==', password)
        .limit(1)
        .get();

      if (snap.empty) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
      }
      const doc = snap.docs[0];
      res.json({ success: true, client: serializeDoc(doc) });
    } catch (e: any) {
      console.error('[login]', e);
      res.status(500).json({ error: e.message || 'Erreur de connexion.' });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/client/register-google  — creates or fetches a Google client
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/api/client/register-google', async (req, res) => {
    try {
      const { phone, sponsorCode, googleUser } = req.body;
      if (!googleUser?.email || !googleUser?.uid) {
        return res.status(400).json({ error: 'Données Google manquantes.' });
      }
      if (!adminDb) return res.status(503).json({ error: 'Service indisponible.' });

      const existing = await adminDb.collection('clients').where('email', '==', googleUser.email).get();
      if (!existing.empty) {
        return res.status(409).json({ error: 'Un compte avec cet email existe déjà.' });
      }

      let walletId = '';
      let unique = false;
      while (!unique) {
        walletId = Math.floor(10000000 + Math.random() * 90000000).toString();
        const wSnap = await adminDb.collection('clients').where('walletId', '==', walletId).get();
        if (wSnap.empty) unique = true;
      }

      let directSponsorId: string | undefined;
      let indirectSponsorId: string | undefined;
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
        updatedAt: FieldValue.serverTimestamp()
      };

      const ref = await adminDb.collection('clients').add(clientData);
      res.json({ success: true, client: { id: ref.id, ...clientData, createdAt: null, updatedAt: null } });
    } catch (e: any) {
      console.error('[register-google]', e);
      res.status(500).json({ error: e.message || 'Erreur lors de l\'inscription Google.' });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // FORMATIONS — Admin CRUD (uses Admin SDK → bypasses Firestore rules)
  // ════════════════════════════════════════════════════════════════════════════

  // Guard for all /api/admin/formations routes
  app.use('/api/admin/formations', (req, res, next) => {
    if (!adminDb) return res.status(503).json({ error: 'Firebase Admin non initialisé.' });
    next();
  });

  // ── Helper: strip undefined/null → use '' or 0 ───────────────────────────
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

  // ── GET /api/admin/formations — list all ──────────────────────────────────
  app.get('/api/admin/formations', async (_req, res) => {
    try {
      const snap = await adminDb.collection('formations').orderBy('createdAt', 'desc').get();
      res.json({ formations: snap.docs.map(serializeDoc) });
    } catch (e: any) {
      console.error('[formations GET]', e);
      res.status(500).json({ error: e.message || 'Erreur.' });
    }
  });

  // ── POST /api/admin/formations — create ────────────────────────────────────
  app.post('/api/admin/formations', async (req, res) => {
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

  // ── PUT /api/admin/formations/:id — update ─────────────────────────────────
  app.put('/api/admin/formations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = sanitizeFormation(req.body);
      await adminDb.collection('formations').doc(id).update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      });
      res.json({ success: true });
    } catch (e: any) {
      console.error('[formations PUT]', e);
      res.status(500).json({ error: e.message || 'Erreur lors de la mise à jour.' });
    }
  });

  // ── DELETE /api/admin/formations/:id — delete ──────────────────────────────
  app.delete('/api/admin/formations/:id', async (req, res) => {
    try {
      await adminDb.collection('formations').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (e: any) {
      console.error('[formations DELETE]', e);
      res.status(500).json({ error: e.message || 'Erreur lors de la suppression.' });
    }
  });

  // ── PATCH /api/admin/formations/purchases/:id — approve/revoke access ──────
  app.patch('/api/admin/formations/purchases/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, formationId } = req.body;
      if (!status) return res.status(400).json({ error: 'Statut requis.' });
      const batch = adminDb.batch();
      batch.update(adminDb.collection('formation_purchases').doc(id), {
        status,
        updatedAt: FieldValue.serverTimestamp(),
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

  // ════════════════════════════════════════════════════════════════════════════
  // ONLINE SUB-SERVICES — Public read via Admin SDK (bypasses Firestore rules)
  // ════════════════════════════════════════════════════════════════════════════

  app.get('/api/online-sub-services', async (_req, res) => {
    if (!adminDb) return res.status(503).json({ error: 'Firebase Admin non initialisé.' });
    try {
      const snap = await adminDb.collection('online_sub_services').orderBy('order', 'asc').get();
      const services = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.json({ services });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/online-sub-services', async (req, res) => {
    if (!adminDb) return res.status(503).json({ error: 'Firebase Admin non initialisé.' });
    if (req.headers['x-admin-secret'] !== 'neopay-admin-2024') return res.status(403).json({ error: 'Non autorisé.' });
    try {
      const { id, createdAt: _c, ...data } = req.body;
      if (id) {
        await adminDb.collection('online_sub_services').doc(id).set({ ...data, updatedAt: new Date() }, { merge: true });
        return res.json({ success: true, id });
      } else {
        const ref = await adminDb.collection('online_sub_services').add({ ...data, createdAt: new Date() });
        return res.json({ success: true, id: ref.id });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/online-sub-services/:id', async (req, res) => {
    if (!adminDb) return res.status(503).json({ error: 'Firebase Admin non initialisé.' });
    if (req.headers['x-admin-secret'] !== 'neopay-admin-2024') return res.status(403).json({ error: 'Non autorisé.' });
    try {
      await adminDb.collection('online_sub_services').doc(req.params.id).delete();
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // FORMATIONS — Public + User routes (Admin SDK, bypasses Firestore rules)
  // ════════════════════════════════════════════════════════════════════════════

  app.use('/api/formations', (req, res, next) => {
    if (!adminDb) return res.status(503).json({ error: 'Firebase Admin non initialisé.' });
    next();
  });

  // GET /api/formations — public: published formations only
  app.get('/api/formations', async (_req, res) => {
    try {
      const snap = await adminDb.collection('formations')
        .where('published', '==', true)
        .orderBy('createdAt', 'desc')
        .get();
      res.json({ formations: snap.docs.map(serializeDoc) });
    } catch (e: any) {
      console.error('[formations public GET]', e);
      res.status(500).json({ error: e.message || 'Erreur.' });
    }
  });

  // GET /api/admin/formations/purchases — all purchases (admin view)
  app.get('/api/admin/formations/purchases', async (_req, res) => {
    try {
      const snap = await adminDb.collection('formation_purchases')
        .orderBy('purchasedAt', 'desc')
        .get();
      res.json({ purchases: snap.docs.map(serializeDoc) });
    } catch (e: any) {
      console.error('[formations purchases GET all]', e);
      res.status(500).json({ error: e.message || 'Erreur.' });
    }
  });

  // GET /api/formations/purchases/user/:userId — a specific user's purchases
  app.get('/api/formations/purchases/user/:userId', async (req, res) => {
    try {
      const snap = await adminDb.collection('formation_purchases')
        .where('userId', '==', req.params.userId)
        .get();
      res.json({ purchases: snap.docs.map(serializeDoc) });
    } catch (e: any) {
      console.error('[formations purchases GET user]', e);
      res.status(500).json({ error: e.message || 'Erreur.' });
    }
  });

  // POST /api/formations/purchases — create a pending purchase request
  app.post('/api/formations/purchases', async (req, res) => {
    try {
      const { userId, userEmail, userName, formationId, formationTitle, amount, method } = req.body;
      if (!userId || !formationId) return res.status(400).json({ error: 'Paramètres manquants.' });
      const existing = await adminDb.collection('formation_purchases')
        .where('userId', '==', userId)
        .where('formationId', '==', formationId)
        .where('status', '==', 'pending')
        .get();
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

  // POST /api/formations/free-access — grant free access immediately
  app.post('/api/formations/free-access', async (req, res) => {
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

  // GET /api/formations/progress/:userId — all progress for a user
  app.get('/api/formations/progress/:userId', async (req, res) => {
    try {
      const snap = await adminDb.collection('formation_progress')
        .where('userId', '==', req.params.userId).get();
      res.json({ progress: snap.docs.map(serializeDoc) });
    } catch (e: any) {
      console.error('[formations progress GET]', e);
      res.status(500).json({ error: e.message || 'Erreur.' });
    }
  });

  // POST /api/formations/progress — mark a module as completed
  app.post('/api/formations/progress', async (req, res) => {
    try {
      const { userId, userEmail, formationId, moduleId, totalModules } = req.body;
      if (!userId || !formationId || !moduleId || !totalModules) {
        return res.status(400).json({ error: 'Paramètres manquants.' });
      }
      const snap = await adminDb.collection('formation_progress')
        .where('userId', '==', userId).where('formationId', '==', formationId).get();
      const now = FieldValue.serverTimestamp();
      if (snap.empty) {
        const completedModules = [moduleId];
        const percentage = Math.round((1 / Number(totalModules)) * 100);
        await adminDb.collection('formation_progress').add({
          userId, userEmail: userEmail || '', formationId,
          completedModules, percentage,
          startedAt: now, lastAccessedAt: now,
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

  // POST /api/formations/user — save/update Google user profile
  app.post('/api/formations/user', async (req, res) => {
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

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/formations/purchases/wallet — buy a formation with wallet balance
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/api/formations/purchases/wallet', async (req, res) => {
    if (!adminDb) return res.status(503).json({ error: 'Firebase Admin non initialisé.' });
    try {
      const { clientId, clientName, formationId, formationTitle, amount } = req.body;
      if (!clientId || !formationId) return res.status(400).json({ error: 'Paramètres manquants.' });

      // Check if already purchased
      const existingSnap = await adminDb.collection('formation_purchases')
        .where('userId', '==', clientId)
        .where('formationId', '==', formationId)
        .where('status', '==', 'active')
        .get();
      if (!existingSnap.empty) {
        return res.json({ success: true, alreadyOwned: true });
      }

      const clientRef = adminDb.collection('clients').doc(clientId);
      const clientSnap = await clientRef.get();
      if (!clientSnap.exists) return res.status(404).json({ error: 'Client introuvable.' });
      const clientData = clientSnap.data()!;

      const price = Number(amount) || 0;
      if (price > 0 && (clientData.balance || 0) < price) {
        return res.status(400).json({ error: 'Solde insuffisant.' });
      }

      const batch = adminDb.batch();

      // Deduct balance if paid
      if (price > 0) {
        batch.update(clientRef, {
          balance: Math.max(0, (clientData.balance || 0) - price),
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      // Create active purchase record
      const purchaseRef = adminDb.collection('formation_purchases').doc();
      batch.set(purchaseRef, {
        userId: clientId,
        userEmail: clientData.email || '',
        userName: clientName || clientData.name || '',
        formationId,
        formationTitle: formationTitle || '',
        amount: price,
        method: price === 0 ? 'Gratuit' : 'Wallet',
        status: 'active',
        purchasedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Increment studentsCount on formation
      if (formationId) {
        batch.update(adminDb.collection('formations').doc(formationId), {
          studentsCount: FieldValue.increment(1),
        });
      }

      // Notify admin
      if (price > 0) {
        const notifRef = adminDb.collection('admin_notifications').doc();
        batch.set(notifRef, {
          type: 'formation_purchase',
          clientId,
          clientName: clientName || clientData.name || '',
          formationId,
          formationTitle: formationTitle || '',
          amount: price,
          method: 'Wallet',
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      res.json({ success: true });
    } catch (e: any) {
      console.error('[formations/purchases/wallet]', e);
      res.status(500).json({ error: e.message || 'Erreur serveur.' });
    }
  });

  // ── Formation Progress Tracking ──────────────────────────────────────────────

  // GET /api/formations/progress/:userId/:formationId
  app.get('/api/formations/progress/:userId/:formationId', async (req, res) => {
    try {
      const { userId, formationId } = req.params;
      const docId = `${userId}_${formationId}`;
      const snap = await adminDb.collection('formation_progress').doc(docId).get();
      if (!snap.exists) return res.json({ progress: null });
      res.json({ progress: { id: snap.id, ...snap.data() } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/formations/progress/complete — mark a module as completed
  app.post('/api/formations/progress/complete', async (req, res) => {
    try {
      const { userId, formationId, moduleId } = req.body;
      if (!userId || !formationId || !moduleId) return res.status(400).json({ error: 'Paramètres manquants.' });
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

  // POST /api/formations/progress/position — save video resume position
  app.post('/api/formations/progress/position', async (req, res) => {
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

  // ── Formation External Payment Requests ─────────────────────────────────────

  // POST /api/formations/payment-request — create external payment request
  app.post('/api/formations/payment-request', async (req, res) => {
    try {
      const { userId, userEmail, userName, formationId, formationTitle, amount, method, transactionCode } = req.body;
      if (!userId || !formationId || !method || !transactionCode) {
        return res.status(400).json({ error: 'Paramètres manquants.' });
      }
      const existing = await adminDb.collection('formation_purchases')
        .where('userId', '==', userId)
        .where('formationId', '==', formationId)
        .where('status', '==', 'active')
        .get();
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

  // GET /api/admin/formations/payment-requests — list all (admin)
  app.get('/api/admin/formations/payment-requests', async (_req, res) => {
    try {
      const snap = await adminDb.collection('formation_payment_requests')
        .orderBy('createdAt', 'desc').get();
      res.json({ requests: snap.docs.map(serializeDoc) });
    } catch (e: any) {
      console.error('[formation payment-requests GET]', e);
      res.status(500).json({ error: e.message || 'Erreur.' });
    }
  });

  // PATCH /api/admin/formations/payment-requests/:id — approve or reject
  app.patch('/api/admin/formations/payment-requests/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body;
      const reqSnap = await adminDb.collection('formation_payment_requests').doc(id).get();
      if (!reqSnap.exists) return res.status(404).json({ error: 'Demande introuvable.' });
      const data = reqSnap.data()!;
      const batch = adminDb.batch();
      if (action === 'approve') {
        batch.update(adminDb.collection('formation_payment_requests').doc(id), {
          status: 'approved', updatedAt: FieldValue.serverTimestamp()
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
        batch.update(adminDb.collection('formation_payment_requests').doc(id), {
          status: 'rejected', updatedAt: FieldValue.serverTimestamp()
        });
      }
      await batch.commit();
      res.json({ success: true });
    } catch (e: any) {
      console.error('[formation payment-requests PATCH]', e);
      res.status(500).json({ error: e.message || 'Erreur.' });
    }
  });

  // ── Catch-all: any unmatched /api/* route returns JSON (never HTML) ──────────
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Route API introuvable.' });
  });

  const httpServer = createHttpServer(app);

  // ── Vite / Static ────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const hmrConfig = process.env.REPLIT_DEV_DOMAIN
      ? {
          clientPort: 443,
          protocol: "wss" as const,
          host: process.env.REPLIT_DEV_DOMAIN,
          server: httpServer,
        }
      : { server: httpServer };

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrConfig,
        allowedHosts: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
