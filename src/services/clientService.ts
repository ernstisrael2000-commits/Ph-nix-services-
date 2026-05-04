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
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firebase-errors';
import { Client, ClientTransaction, AdminClientNotification } from '../types';

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

  let walletId = '';
  let isUnique = false;
  while (!isUnique) {
    walletId = Math.floor(10000000 + Math.random() * 90000000).toString();
    const wQ = query(collection(db, 'clients'), where('walletId', '==', walletId));
    const wSnap = await getDocs(wQ);
    if (wSnap.empty) isUnique = true;
  }

  let directSponsorId: string | undefined;
  let indirectSponsorId: string | undefined;

  if (data.sponsorCode) {
    const affQ = query(collection(db, 'affiliates'), where('code', '==', data.sponsorCode));
    const affSnap = await getDocs(affQ);
    if (!affSnap.empty) {
      const aff = affSnap.docs[0];
      directSponsorId = aff.id;
      const affData = aff.data();
      if (affData.parentAffiliateId) {
        indirectSponsorId = affData.parentAffiliateId;
      }
    }
  }

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
    clientWalletId: client.walletId,
    transactionId: txRef.id,
    amount,
    method,
    ...(txId && { txId }),
    read: false,
    createdAt: serverTimestamp()
  });
};

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
    clientWalletId: client.walletId,
    transactionId: txRef.id,
    amount,
    method,
    accountNumber,
    read: false,
    createdAt: serverTimestamp()
  });
};

export const submitClientPurchase = async (
  client: Client,
  productName: string,
  productPrice: string,
  amount: number
) => {
  if (amount <= 0) throw new Error("Montant invalide.");
  if (amount > client.balance) throw new Error("Solde insuffisant pour cet achat.");

  const batch = writeBatch(db);

  // Deduct balance immediately
  const clientRef = doc(db, 'clients', client.id!);
  batch.update(clientRef, {
    balance: Math.max(0, (client.balance || 0) - amount),
    updatedAt: serverTimestamp()
  });

  // Record transaction as completed
  const txRef = doc(collection(db, 'client_transactions'));
  batch.set(txRef, {
    clientId: client.id,
    clientName: client.name,
    type: 'purchase',
    amount,
    status: 'completed',
    productName,
    productPrice,
    description: `Achat: ${productName} - ${productPrice}`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // Notify admin (shown in "Alertes Systeme" with "Services Rendus" button)
  const notifRef = doc(collection(db, 'admin_notifications'));
  batch.set(notifRef, {
    type: 'client_purchase',
    clientId: client.id,
    clientName: client.name,
    clientWalletId: client.walletId,
    transactionId: txRef.id,
    amount,
    productName,
    productPrice,
    read: false,
    servicesRendus: false,
    createdAt: serverTimestamp()
  });

  await batch.commit();
};

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
      } else if (txData.type === 'withdrawal' || txData.type === 'purchase') {
        batch.update(clientRef, {
          balance: Math.max(0, (clientData.balance || 0) - txData.amount),
          updatedAt: serverTimestamp()
        });
      }
    }
  }

  await batch.commit();
};

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
    const q = query(
      collection(db, 'admin_notifications'),
      orderBy('createdAt', 'desc')
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
  await updateDoc(doc(db, 'admin_notifications', notifId), { read: true });
};

export const markAllAdminNotificationsRead = async () => {
  const q = query(collection(db, 'admin_notifications'), where('read', '==', false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
};

export const markPurchaseServicesRendus = async (notifId: string) => {
  await updateDoc(doc(db, 'admin_notifications', notifId), {
    servicesRendus: true,
    read: true
  });
};
