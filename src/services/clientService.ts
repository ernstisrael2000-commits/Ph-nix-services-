import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Client, ClientTransaction, AdminClientNotification } from '../types';

// ─── Deserialize API doc (converts {_seconds} timestamps back to {toDate()}) ──
function fromApi<T>(doc: any): T {
  const result: any = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value && typeof value === 'object' && '_seconds' in (value as any)) {
      result[key] = { toDate: () => new Date((value as any)._seconds * 1000) };
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

// ─── Register / Login ───────────────────────────────────────────────────────

export const registerClient = async (data: {
  name: string;
  phone: string;
  email: string;
  password: string;
  sponsorCode?: string;
}): Promise<Client> => {
  const res = await fetch('/api/client/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Erreur inscription (${res.status})`);
  return json.client as Client;
};

export const registerClientWithGoogle = async (data: {
  phone: string;
  sponsorCode?: string;
  googleUser: { uid: string; email: string; name: string; photoUrl?: string };
}): Promise<Client> => {
  const res = await fetch('/api/client/register-google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Erreur inscription Google (${res.status})`);
  return json.client as Client;
};

export const loginClient = async (email: string, password: string): Promise<Client | null> => {
  const res = await fetch('/api/client/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (res.status === 401) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Erreur connexion (${res.status})`);
  return json.client as Client;
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

// ─── API helper ──────────────────────────────────────────────────────────────

async function apiPost(path: string, body: object): Promise<any> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let data: any = {};
  try {
    const text = await res.text();
    data = JSON.parse(text);
  } catch {
    if (!res.ok) throw new Error(`Erreur serveur (${res.status}). Veuillez réessayer.`);
    return;
  }
  if (!res.ok) throw new Error(data.error || `Erreur serveur (${res.status})`);
  return data;
}

// ─── Deposit ─────────────────────────────────────────────────────────────────

export const submitClientDeposit = async (
  client: Client,
  amount: number,
  method: string,
  txId?: string
) => {
  if (amount <= 0) throw new Error("Montant invalide.");
  await apiPost('/api/client/deposit', {
    clientId: client.id,
    clientName: client.name,
    clientWalletId: client.walletId || '',
    amount,
    method,
    ...(txId && { txId })
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
  await apiPost('/api/client/withdrawal', {
    clientId: client.id,
    clientName: client.name,
    clientPhone: client.phone || '',
    clientWalletId: client.walletId || '',
    amount,
    method,
    accountNumber
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
  await apiPost('/api/client/purchase', {
    clientId: client.id,
    clientName: client.name,
    clientPhone: client.phone || '',
    clientWalletId: client.walletId || '',
    amount,
    productName,
    productPrice,
    directSponsorId: client.directSponsorId || null
  });
};

// ─── Admin: approve a pending purchase ───────────────────────────────────────

export const approvePurchaseRequest = async (
  notifId: string,
  transactionId: string,
  clientId: string,
  amount: number,
  directSponsorId?: string | null
) => {
  await apiPost('/api/admin/purchase/approve', {
    notifId,
    transactionId,
    clientId,
    amount,
    directSponsorId: directSponsorId || null
  });
};

// ─── Admin: decline a pending purchase ───────────────────────────────────────

export const declinePurchaseRequest = async (
  notifId: string,
  transactionId: string
) => {
  await apiPost('/api/admin/purchase/decline', { notifId, transactionId });
};

// ─── Hook: does this client have a pending purchase? ────────────────────────

// purchases are now instant — this hook always returns false
export const useClientPendingPurchase = (_clientId: string | null) => false;

// ─── Transaction Hooks (real-time via onSnapshot) ────────────────────────────

export const useClientTransactions = (clientId: string | null) => {
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    const q = query(
      collection(db, 'client_transactions'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc'),
      limit(100)
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
    const q = query(
      collection(db, 'client_transactions'),
      orderBy('createdAt', 'desc'),
      limit(500)
    );
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
  await apiPost('/api/admin/transaction/status', { txId, status, reason });
};

// ─── Misc Hooks & Utils (real-time via onSnapshot) ───────────────────────────

export const usePendingClientCount = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const q = query(
      collection(db, 'client_transactions'),
      where('status', '==', 'pending')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setCount(snap.size);
    }, () => {});
    return () => unsubscribe();
  }, []);
  return count;
};

export const useAdminClientNotifications = () => {
  const [notifications, setNotifications] = useState<AdminClientNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'admin_notifications'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminClientNotification)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  return { notifications, loading };
};

export const markAdminNotificationRead = async (notifId: string) => {
  await fetch(`/api/admin/notifications/${notifId}/read`, { method: 'PATCH' });
};

export const markAllAdminNotificationsRead = async () => {
  await fetch('/api/admin/notifications/read-all', { method: 'PATCH' });
};
