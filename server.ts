import express from "express";
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

  // ── Health check ────────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

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

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/client/deposit
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/api/client/deposit', async (req, res) => {
    try {
      const { clientId, clientName, clientWalletId, amount, method, txId } = req.body;
      if (!clientId || !clientName || !amount || !method) {
        return res.status(400).json({ error: 'Paramètres manquants.' });
      }
      if (amount <= 0) return res.status(400).json({ error: 'Montant invalide.' });

      const txRef = await adminDb.collection('client_transactions').add({
        clientId,
        clientName,
        type: 'deposit',
        amount,
        status: 'pending',
        method,
        ...(txId && { txId }),
        description: `Demande de dépôt via ${method}`,
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
      const { clientId, clientName, clientPhone, clientWalletId, amount, method, accountNumber } = req.body;
      if (!clientId || !clientName || !amount || !method || !accountNumber) {
        return res.status(400).json({ error: 'Paramètres manquants.' });
      }
      if (amount <= 0) return res.status(400).json({ error: 'Montant invalide.' });

      // Check balance server-side
      const clientSnap = await adminDb.collection('clients').doc(clientId).get();
      if (!clientSnap.exists) return res.status(404).json({ error: 'Client introuvable.' });
      const clientData = clientSnap.data()!;
      if ((clientData.balance || 0) < amount) {
        return res.status(400).json({ error: 'Solde insuffisant.' });
      }

      const txRef = await adminDb.collection('client_transactions').add({
        clientId,
        clientName,
        type: 'withdrawal',
        amount,
        status: 'pending',
        method,
        accountNumber,
        description: `Demande de retrait via ${method}`,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      await adminDb.collection('admin_notifications').add({
        type: 'client_withdrawal',
        clientId,
        clientName,
        clientPhone: clientPhone || '',
        clientWalletId: clientWalletId || '',
        transactionId: txRef.id,
        amount,
        method,
        accountNumber,
        read: false,
        createdAt: FieldValue.serverTimestamp()
      });

      res.json({ success: true, transactionId: txRef.id });
    } catch (e: any) {
      console.error('[withdrawal]', e);
      res.status(500).json({ error: e.message || 'Erreur serveur.' });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/client/purchase
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/api/client/purchase', async (req, res) => {
    try {
      const { clientId, clientName, clientPhone, clientWalletId, amount, productName, productPrice, directSponsorId } = req.body;
      if (!clientId || !clientName || !amount || !productName) {
        return res.status(400).json({ error: 'Paramètres manquants.' });
      }
      if (amount <= 0) return res.status(400).json({ error: 'Montant invalide.' });

      // Check balance server-side
      const clientSnap = await adminDb.collection('clients').doc(clientId).get();
      if (!clientSnap.exists) return res.status(404).json({ error: 'Client introuvable.' });
      const clientData = clientSnap.data()!;
      if ((clientData.balance || 0) < amount) {
        return res.status(400).json({ error: 'Solde insuffisant pour cet achat.' });
      }

      // Check no existing pending purchase
      const existingSnap = await adminDb.collection('client_transactions')
        .where('clientId', '==', clientId)
        .where('type', '==', 'purchase')
        .where('status', '==', 'pending')
        .get();
      if (!existingSnap.empty) {
        return res.status(400).json({ error: "Vous avez déjà une demande d'achat en cours. Veuillez attendre la décision de l'administrateur." });
      }

      const batch = adminDb.batch();

      const txRef = adminDb.collection('client_transactions').doc();
      batch.set(txRef, {
        clientId,
        clientName,
        type: 'purchase',
        amount,
        status: 'pending',
        productName,
        productPrice,
        directSponsorId: directSponsorId || null,
        description: `Demande d'achat: ${productName} - ${productPrice}`,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

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
        status: 'pending',
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

      if (status === 'approved') {
        const clientRef = adminDb.collection('clients').doc(txData.clientId);
        const clientSnap = await clientRef.get();
        if (clientSnap.exists) {
          const clientData = clientSnap.data()!;
          if (txData.type === 'deposit') {
            batch.update(clientRef, {
              balance: (clientData.balance || 0) + txData.amount,
              updatedAt: FieldValue.serverTimestamp()
            });
          } else if (txData.type === 'withdrawal') {
            batch.update(clientRef, {
              balance: Math.max(0, (clientData.balance || 0) - txData.amount),
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

  // ── Vite / Static ────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const hmrConfig = process.env.REPLIT_DEV_DOMAIN
      ? {
          clientPort: 443,
          protocol: "wss" as const,
          host: process.env.REPLIT_DEV_DOMAIN,
        }
      : true;

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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
