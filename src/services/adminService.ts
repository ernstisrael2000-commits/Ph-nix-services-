import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp,
  getDocs,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firebase-errors';
import { AdminAccount, AdminLog } from '../types';
import { useState, useEffect } from 'react';

const ADMINS_COLLECTION = 'admin_accounts';
const LOGS_COLLECTION = 'admin_login_logs';

export const useAdminAccounts = () => {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, ADMINS_COLLECTION), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminAccount[];
      setAdmins(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching admin accounts:", error);
      setLoading(false);
      try {
        handleFirestoreError(error, 'list', ADMINS_COLLECTION, auth);
      } catch (e) {
        // Just log for now to prevent app crash in hook
      }
    });

    return () => unsubscribe();
  }, []);

  return { admins, loading };
};

export const saveAdminAccount = async (adminData: Partial<AdminAccount>, id?: string) => {
  try {
    if (id) {
      const adminRef = doc(db, ADMINS_COLLECTION, id);
      await updateDoc(adminRef, {
        ...adminData,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, ADMINS_COLLECTION), {
        ...adminData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        failedAttempts: 0
      });
    }
  } catch (error) {
    handleFirestoreError(error, id ? 'update' : 'create', ADMINS_COLLECTION, auth);
  }
};

export const deleteAdminAccount = async (id: string) => {
  try {
    const adminRef = doc(db, ADMINS_COLLECTION, id);
    await deleteDoc(adminRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', ADMINS_COLLECTION, auth);
  }
};

export const logAdminAttempt = async (adminName: string, success: boolean) => {
  try {
    await addDoc(collection(db, LOGS_COLLECTION), {
      adminName,
      success,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent
    });
  } catch (error) {
    handleFirestoreError(error, 'create', LOGS_COLLECTION, auth);
  }
};

export const useAdminLogs = (max: number = 50) => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, LOGS_COLLECTION), orderBy('timestamp', 'desc'), limit(max));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminLog[];
      setLogs(data);
      setLoading(false);
    }, (error) => {
      try {
        handleFirestoreError(error, 'list', LOGS_COLLECTION, auth);
      } catch (e) {
        // Log error
      }
    });

    return () => unsubscribe();
  }, [max]);

  return { logs, loading };
};

export const checkAdminLogin = async (fullName: string, password: string, loginCode?: string): Promise<{ success: boolean; admin?: AdminAccount; error?: string }> => {
  try {
    const q = query(collection(db, ADMINS_COLLECTION), where('fullName', '==', fullName));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await logAdminAttempt(fullName, false);
      return { success: false, error: "Identifiants incorrects." };
    }

    const adminDoc = snapshot.docs[0];
    const adminData = { id: adminDoc.id, ...adminDoc.data() } as AdminAccount;

    // Check lockout
    if (adminData.lockUntil) {
      const lockUntilDate = adminData.lockUntil instanceof Timestamp ? adminData.lockUntil.toDate() : new Date(adminData.lockUntil);
      if (lockUntilDate > new Date()) {
        return { success: false, error: `Compte bloqué temporairement. Réessayez plus tard.` };
      }
    }

    // Verify password
    if (adminData.password !== password) {
      const newAttempts = (adminData.failedAttempts || 0) + 1;
      const updates: any = { failedAttempts: newAttempts };
      
      if (newAttempts >= 5) {
        // Lock for 15 minutes
        updates.lockUntil = Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000));
      }
      
      await updateDoc(doc(db, ADMINS_COLLECTION, adminData.id!), updates);
      await logAdminAttempt(fullName, false);
      return { success: false, error: "Identifiants incorrects." };
    }

    // Verify Login Code for Super Admin
    if (adminData.isSuperAdmin && adminData.loginCode && adminData.loginCode !== loginCode) {
      await logAdminAttempt(fullName, false);
      return { success: false, error: "Code de connexion incorrect." };
    }

    // Success
    // Sign in anonymously to get a UID for Firestore rules if not already authenticated
    if (!auth.currentUser) {
      const userCred = await signInAnonymously(auth);
      const uid = userCred.user.uid;
      
      // Link this UID if not already linked (or if it changed)
      await updateDoc(doc(db, ADMINS_COLLECTION, adminData.id!), {
        uid: uid,
        failedAttempts: 0,
        lockUntil: null,
        updatedAt: serverTimestamp()
      });
      adminData.uid = uid;
    } else {
      await updateDoc(doc(db, ADMINS_COLLECTION, adminData.id!), {
        failedAttempts: 0,
        lockUntil: null,
        updatedAt: serverTimestamp()
      });
    }

    await logAdminAttempt(fullName, true);
    
    return { success: true, admin: adminData };
  } catch (error) {
    handleFirestoreError(error, 'list', ADMINS_COLLECTION, auth);
    return { success: false, error: "Une erreur est survenue lors de la connexion." };
  }
};
