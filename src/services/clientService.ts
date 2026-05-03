import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Client } from '../types';
import { handleFirestoreError } from '../lib/firebase-errors';

export const registerClient = async (clientData: Partial<Client>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'clients'), {
      ...clientData,
      balance: 0,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, 'create', 'clients');
    throw error;
  }
};

export const getClientByEmail = async (email: string): Promise<Client | null> => {
  try {
    const q = query(collection(db, 'clients'), where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Client;
  } catch (error) {
    handleFirestoreError(error, 'get', 'clients');
    return null;
  }
};

export const getClientByUid = async (uid: string): Promise<Client | null> => {
  try {
    const q = query(collection(db, 'clients'), where('uid', '==', uid));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Client;
  } catch (error) {
    handleFirestoreError(error, 'get', 'clients');
    return null;
  }
};

export const updateClientBalance = async (clientId: string, amount: number) => {
  try {
    const clientRef = doc(db, 'clients', clientId);
    const clientSnap = await getDoc(clientRef);
    if (!clientSnap.exists()) throw new Error("Client non trouvé");
    
    const currentBalance = clientSnap.data().balance || 0;
    await updateDoc(clientRef, {
      balance: currentBalance + amount,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, 'update', `clients/${clientId}`);
    throw error;
  }
};

export const useClientData = (clientId: string | null, callback: (client: Client | null) => void) => {
  if (!clientId) return () => {};
  
  return onSnapshot(doc(db, 'clients', clientId), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as Client);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, 'get', `clients/${clientId}`);
  });
};
