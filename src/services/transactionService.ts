import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp,
  onSnapshot,
  orderBy,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firebase-errors';

export interface ClientTransaction {
  id?: string;
  clientId: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'purchase';
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  description?: string;
  recipientId?: string;
  method?: string;
  createdAt: any;
  updatedAt: any;
}

export const createTransactionRequest = async (transaction: Partial<ClientTransaction>) => {
  try {
    // Sanitize transaction object to remove undefined values
    const sanitizedTransaction = Object.entries(transaction).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    await addDoc(collection(db, 'client_transactions'), {
      ...sanitizedTransaction,
      status: sanitizedTransaction.status || 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, 'create', 'client_transactions');
    throw error;
  }
};

export const useClientTransactions = (clientId: string, callback: (txs: ClientTransaction[]) => void) => {
  const q = query(
    collection(db, 'client_transactions'), 
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snap) => {
    const txs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientTransaction));
    callback(txs);
  });
};

export const useAllClientTransactions = (callback: (txs: ClientTransaction[]) => void, enabled: boolean = false) => {
  if (!enabled || !auth.currentUser) return () => {};
  
  const q = query(
    collection(db, 'client_transactions'), 
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snap) => {
    const txs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientTransaction));
    callback(txs);
  });
};

export const updateClientTransactionStatus = async (
  transactionId: string, 
  status: 'approved' | 'rejected' | 'completed',
  clientId: string,
  amount: number,
  type: string
) => {
  try {
    const batch = writeBatch(db);
    const txRef = doc(db, 'client_transactions', transactionId);
    
    batch.update(txRef, {
      status,
      updatedAt: serverTimestamp()
    });

    if (status === 'approved' || status === 'completed') {
      const clientRef = doc(db, 'clients', clientId);
      
      if (type === 'deposit') {
        batch.update(clientRef, {
          balance: increment(amount),
          updatedAt: serverTimestamp()
        });
      } else if (type === 'withdrawal' || type === 'purchase' || type === 'transfer') {
        // For transfer, we'd also need the recipient logic, but let's stick to basics for now
        batch.update(clientRef, {
          balance: increment(-amount),
          updatedAt: serverTimestamp()
        });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, 'update', 'client_transactions');
    throw error;
  }
};
