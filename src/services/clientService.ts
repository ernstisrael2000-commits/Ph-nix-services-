import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
  onSnapshot,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Client, ClientTransaction, AdminClientNotification } from '../types';

// ─── Register / Login ───────────────────────────────────────────────────────

export const registerClient = async (data: {
  name: string;
  phone: string;
  email: string;
  password: string;
  sponsorCode?: string;
}): Promise<Client> => {
  const emailQ = query(collection(db, 'clients'), where('email', '==', data.email));
  const snap = await getDocs(emailQ);
  if (!snap.empty) throw new Error("Un compte avec cet email existe déjà.");

  const walletId = await generateUniqueWalletId();
  const { directSponsorId, indirectSponsorId } = await resolveSponsor(data.sponsorCode);

  const clientData: any = {
    name: data.name,
    phone: data.phone,
    email: data.email,
    password: data.password,
    balance: 0,
    walletId,
    status: 'active',
    ...(directSponsorId && { directSponsorId }),
    ...(indirectSponsorId && { indirectSponsorId }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(collection(db, 'clients'), clientData);
  return { id: ref.id, ...clientData } as Client;
};

export const registerClientWithGoogle = async (data: {
  phone: string;
  sponsorCode?: string;
  googleUser: { uid: string; email: string; name: string; photoUrl?: string };
}): Promise<Client> => {
  const emailQ = query(collection(db, 'clients'), where('email', '==', data.googleUser.email));
  const snap = await getDocs(emailQ);
  if (!snap.empty) throw new Error("Un compte avec cet email existe déjà.");

  const walletId = await generateUniqueWalletId();
  const { directSponsorId, indirectSponsorId } = await resolveSponsor(data.sponsorCode);

  const clientData: any = {
    name: data.googleUser.name,
    phone: data.phone,
    email: data.googleUser.email,
    uid: data.googleUser.uid,
    photoUrl: data.googleUser.photoUrl || '',
    balance: 0,
    walletId,
    status: 'active',
    ...(directSponsorId && { directSponsorId }),
    ...(indirectSponsorId && { indirectSponsorId }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(collection(db, 'clients'), clientData);
  return { id: ref.id, ...clientData } as Client;
};

export const loginClient = async (email: string, password: string): Promise<Client | null> => {
  const q = query(
    collection(db, 'clients'),
    where('email', '==', email),
    where('password', '==', password)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Client;
};

export interface GoogleClientLoginResult {
  client: Client | null;
  googleEmail?: string;
  googleName?: string;
  googlePhotoUrl?: string;
  googleUid?: string;
  noAccount?: boolean;
  error?: string;
}

export const loginClientWithGoogle = async (): Promise<GoogleClientLoginResult> => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const email = user.email;

    if (!email) return { client: null, error: "L'email Google est requis." };

    const q = query(collection(db, 'clients'), where('email', '==', email));
    const snap = await getDocs(q);

    if (snap.empty) {
      return {
        client: null,
        noAccount: true,
        googleEmail: email,
        googleName: user.displayName || '',
        googlePhotoUrl: user.photoURL || '',
        googleUid: user.uid
      };
    }

    const clientDoc = snap.docs[0];
    const clientData = clientDoc.data() as Client;

    if (clientData.status === 'blocked') {
      return { client: null, error: "Votre compte est bloqué. Contactez le support." };
    }

    await updateDoc(doc(db, 'clients', clientDoc.id), {
      uid: user.uid,
      ...(user.photoURL && { photoUrl: user.photoURL }),
      updatedAt: serverTimestamp()
    });

    return { client: { id: clientDoc.id, ...clientData, uid: user.uid } };
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') return { client: null, error: '' };
    console.error("Google client login error:", error);
    return { client: null, error: error.message || "Erreur de connexion Google." };
  }
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function generateUniqueWalletId(): Promise<string> {
  let walletId = '';
  let isUnique = false;
  while (!isUnique) {
    walletId = Math.floor(10000000 + Math.random() * 90000000).toString();
    const wQ = query(collection(db, 'clients'), where('walletId', '==', walletId));
    const wSnap = await getDocs(wQ);
    if (wSnap.empty) isUnique = true;
  }
  return walletId;
}

async function resolveSponsor(sponsorCode?: string) {
  let directSponsorId: string | undefined;
  let indirectSponsorId: string | undefined;
  if (sponsorCode) {
    const affQ = query(collection(db, 'affiliates'), where('code', '==', sponsorCode));
    const affSnap = await getDocs(affQ);
    if (!affSnap.empty) {
      const aff = affSnap.docs[0];
      directSponsorId = aff.id;
      const affData = aff.data();
      if (affData.parentAffiliateId) indirectSponsorId = affData.parentAffiliateId;
    }
  }
  return { directSponsorId, indirectSponsorId };
}

// ─── Client Data Hook ────────────────────────────────────────────────────────

export const useClientData = (clientId: string | null) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    const unsubscribe = onSnapshot(doc(db, 'clients', clientId), (snap) => {
      if (snap.exists()) setClient({ id: snap.id, ...snap.data() } as Client);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, [clientId]);

  return { client, loading };
};

// ─── Deposit ─────────────────────────────────────────────────────────────────

export const submitClientDeposit = async (
  client: Client,
  amount: number,
  method: string,
  txId?: string
) => {
  if (amount <= 0) throw new Error("Montant invalide.");

  const txRef = await addDoc(collection(db, 'client_transactions'), {
    clientId: client.id,
    clientName: client.name,
    type: 'deposit',
    amount,
    status: 'pending',
    method,
    ...(txId && { txId }),
    description: `Demande de dépôt via ${method}`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await addDoc(collection(db, 'admin_notifications'), {
    type: 'client_deposit',
    clientId: client.id,
    clientName: client.name,
    clientWalletId: client.walletId || '',
    transactionId: txRef.id,
    amount,
    method,
    ...(txId && { txId }),
    read: false,
    createdAt: serverTimestamp()
  });
};

// ─── Withdrawal ──────────────────────────────────────────────────────────────

export const submitClientWithdrawal = async (
  client: Client,
  amount: number,
  method: string,
  accountNumber: string
) => {
  if (amount <= 0) throw new Error("Montant invalide.");
  if (amount > client.balance) throw new Error("Solde insuffisant.");
  if (!accountNumber) throw new Error("Numéro de compte requis.");

  const txRef = await addDoc(collection(db, 'client_transactions'), {
    clientId: client.id,
    clientName: client.name,
    type: 'withdrawal',
    amount,
    status: 'pending',
    method,
    accountNumber,
    description: `Demande de retrait via ${method}`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await addDoc(collection(db, 'admin_notifications'), {
    type: 'client_withdrawal',
    clientId: client.id,
    clientName: client.name,
    clientWalletId: client.walletId || '',
    transactionId: txRef.id,
    amount,
    method,
    accountNumber,
    read: false,
    createdAt: serverTimestamp()
  });
};

// ─── Purchase (pending — requires admin approval) ─────────────────────────────

export const submitClientPurchase = async (
  client: Client,
  productName: string,
  productPrice: string,
  amount: number
) => {
  if (amount <= 0) throw new Error("Montant invalide.");
  if (amount > client.balance) throw new Error("Solde insuffisant pour cet achat.");

  // Check if client already has a pending purchase
  const existingQ = query(
    collection(db, 'client_transactions'),
    where('clientId', '==', client.id),
    where('type', '==', 'purchase'),
    where('status', '==', 'pending')
  );
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) {
    throw new Error("Vous avez déjà une demande d'achat en cours. Veuillez attendre la décision de l'administrateur.");
  }

  const batch = writeBatch(db);

  // Create transaction in PENDING state — balance NOT yet deducted
  const txRef = doc(collection(db, 'client_transactions'));
  batch.set(txRef, {
    clientId: client.id,
    clientName: client.name,
    type: 'purchase',
    amount,
    status: 'pending',
    productName,
    productPrice,
    directSponsorId: client.directSponsorId || null,
    description: `Demande d'achat: ${productName} - ${productPrice}`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // Notify admin — shown in "Alertes Système" with Approve / Decline buttons
  const notifRef = doc(collection(db, 'admin_notifications'));
  batch.set(notifRef, {
    type: 'client_purchase',
    clientId: client.id,
    clientName: client.name,
    clientWalletId: client.walletId || '',
    transactionId: txRef.id,
    amount,
    productName,
    productPrice,
    directSponsorId: client.directSponsorId || null,
    status: 'pending',
    read: false,
    createdAt: serverTimestamp()
  });

  await batch.commit();
};

// ─── Admin: approve a pending purchase ───────────────────────────────────────

export const approvePurchaseRequest = async (
  notifId: string,
  transactionId: string,
  clientId: string,
  amount: number,
  directSponsorId?: string | null
) => {
  const batch = writeBatch(db);

  // Deduct client balance
  const clientRef = doc(db, 'clients', clientId);
  const clientSnap = await getDoc(clientRef);
  if (!clientSnap.exists()) throw new Error("Client introuvable.");
  const clientData = clientSnap.data() as Client;
  if ((clientData.balance || 0) < amount) throw new Error("Solde client insuffisant.");

  batch.update(clientRef, {
    balance: Math.max(0, (clientData.balance || 0) - amount),
    updatedAt: serverTimestamp()
  });

  // Credit affiliate sponsor if applicable
  if (directSponsorId) {
    const affiliateRef = doc(db, 'affiliates', directSponsorId);
    const affiliateSnap = await getDoc(affiliateRef);
    if (affiliateSnap.exists()) {
      const aff = affiliateSnap.data();
      batch.update(affiliateRef, {
        balance: (aff.balance || 0) + amount,
        totalEarnings: (aff.totalEarnings || 0) + amount,
        monthlySales: (aff.monthlySales || 0) + amount,
        updatedAt: serverTimestamp()
      });
    }
  }

  // Mark transaction as completed
  const txRef = doc(db, 'client_transactions', transactionId);
  batch.update(txRef, {
    status: 'completed',
    affiliateCredited: !!directSponsorId,
    updatedAt: serverTimestamp()
  });

  // Mark notification as handled (approved)
  const notifRef = doc(db, 'admin_notifications', notifId);
  batch.update(notifRef, {
    status: 'approved',
    read: true,
    resolvedAt: serverTimestamp()
  });

  await batch.commit();
};

// ─── Admin: decline a pending purchase ───────────────────────────────────────

export const declinePurchaseRequest = async (
  notifId: string,
  transactionId: string
) => {
  const batch = writeBatch(db);

  // Mark transaction as rejected (balance was never touched)
  const txRef = doc(db, 'client_transactions', transactionId);
  batch.update(txRef, {
    status: 'rejected',
    updatedAt: serverTimestamp()
  });

  // Mark notification as handled (declined)
  const notifRef = doc(db, 'admin_notifications', notifId);
  batch.update(notifRef, {
    status: 'declined',
    read: true,
    resolvedAt: serverTimestamp()
  });

  await batch.commit();
};

// ─── Hook: does this client have a pending purchase? ────────────────────────

export const useClientPendingPurchase = (clientId: string | null) => {
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    if (!clientId) { setHasPending(false); return; }
    const q = query(
      collection(db, 'client_transactions'),
      where('clientId', '==', clientId),
      where('type', '==', 'purchase'),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, (snap) => setHasPending(!snap.empty), () => {});
    return () => unsub();
  }, [clientId]);

  return hasPending;
};

// ─── Transaction Hooks ───────────────────────────────────────────────────────

export const useClientTransactions = (clientId: string | null) => {
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    const q = query(
      collection(db, 'client_transactions'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientTransaction)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, [clientId]);

  return { transactions, loading };
};

export const useAllClientTransactions = () => {
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'client_transactions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientTransaction)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  return { transactions, loading };
};

export const useAllClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  return { clients, loading };
};

// ─── Update transaction status (deposits & withdrawals) ──────────────────────

export const updateClientTransactionStatus = async (
  txId: string,
  status: 'approved' | 'rejected',
  reason?: string
) => {
  const txRef = doc(db, 'client_transactions', txId);
  const txSnap = await getDoc(txRef);
  if (!txSnap.exists()) throw new Error("Transaction introuvable.");
  const txData = txSnap.data() as ClientTransaction;
  if (txData.status !== 'pending') throw new Error("Transaction déjà traitée.");

  const batch = writeBatch(db);
  batch.update(txRef, {
    status,
    ...(reason && { rejectionReason: reason }),
    updatedAt: serverTimestamp()
  });

  if (status === 'approved') {
    const clientRef = doc(db, 'clients', txData.clientId);
    const clientSnap = await getDoc(clientRef);
    if (clientSnap.exists()) {
      const clientData = clientSnap.data() as Client;
      if (txData.type === 'deposit') {
        batch.update(clientRef, {
          balance: (clientData.balance || 0) + txData.amount,
          updatedAt: serverTimestamp()
        });
      } else if (txData.type === 'withdrawal') {
        batch.update(clientRef, {
          balance: Math.max(0, (clientData.balance || 0) - txData.amount),
          updatedAt: serverTimestamp()
        });
      }
    }
  }

  await batch.commit();
};

// ─── Misc Hooks & Utils ──────────────────────────────────────────────────────

export const usePendingClientCount = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const q = query(collection(db, 'client_transactions'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snap) => setCount(snap.size), () => {});
    return () => unsubscribe();
  }, []);
  return count;
};

export const useAdminClientNotifications = () => {
  const [notifications, setNotifications] = useState<AdminClientNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminClientNotification)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  return { notifications, loading };
};

export const markAdminNotificationRead = async (notifId: string) => {
  await updateDoc(doc(db, 'admin_notifications', notifId), { read: true });
};

export const markAllAdminNotificationsRead = async () => {
  const q = query(collection(db, 'admin_notifications'), where('read', '==', false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
};
