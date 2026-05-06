import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  doc, 
  serverTimestamp,
  getDocs,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { signInAnonymously, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { signInWithGooglePopup, mapGoogleAuthError } from '../lib/google-auth';
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
    // 1. Sign in anonymously FIRST if not already authenticated
    // This ensures we have a UID for Firestore rules
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (authError) {
        console.error("Auth error:", authError);
        return { success: false, error: "Erreur d'authentification système." };
      }
    }

    // 2. Query the admin
    const q = query(collection(db, ADMINS_COLLECTION), where('fullName', '==', fullName));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await logAdminAttempt(fullName, false);
      return { success: false, error: "Identifiants incorrects." };
    }

    const adminDoc = snapshot.docs[0];
    const adminData = { id: adminDoc.id, ...adminDoc.data() } as AdminAccount;

    // 3. Check lockout
    if (adminData.lockUntil) {
      const lockUntilDate = adminData.lockUntil instanceof Timestamp ? adminData.lockUntil.toDate() : new Date(adminData.lockUntil);
      if (lockUntilDate > new Date()) {
        return { success: false, error: `Compte bloqué temporairement. Réessayez plus tard.` };
      }
    }

    // 4. Verify password
    if (adminData.password !== password) {
      const newAttempts = (adminData.failedAttempts || 0) + 1;
      const updates: any = { failedAttempts: newAttempts };
      
      if (newAttempts >= 5) {
        // Lock for 15 minutes
        updates.lockUntil = Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000));
      }
      
      // We try to update failed attempts. This might fail if rules are strict, 
      // but the login should still return "Identifiants incorrects".
      try {
        await updateDoc(doc(db, ADMINS_COLLECTION, adminData.id!), updates);
      } catch (err) {
        console.warn("Could not update failed attempts (permission denied), but security is maintained.");
      }
      
      await logAdminAttempt(fullName, false);
      return { success: false, error: "Identifiants incorrects." };
    }

    // 5. Verify Login Code for Super Admin
    if (adminData.isSuperAdmin && adminData.loginCode && adminData.loginCode !== loginCode) {
      await logAdminAttempt(fullName, false);
      return { success: false, error: "Code de connexion incorrect." };
    }

    // 6. Success - Update UID and reset attempts
    const uid = auth.currentUser?.uid;
    const finalUpdates: any = {
      failedAttempts: 0,
      lockUntil: null,
      updatedAt: serverTimestamp()
    };
    
    // Link UID if not already set or changed
    if (uid && adminData.uid !== uid) {
      finalUpdates.uid = uid;
    }

    try {
      // 1. Update the main account doc
      await updateDoc(doc(db, ADMINS_COLLECTION, adminData.id!), finalUpdates);
      
      // 2. Create/Update the admin_uids doc so isAdmin() rules pass
      if (uid) {
        await setDoc(doc(db, 'admin_uids', uid), {
          adminId: adminData.id,
          fullName: adminData.fullName,
          updatedAt: serverTimestamp()
        });
      }
      
      adminData.uid = uid || adminData.uid;
    } catch (err) {
      console.warn("Could not fully update admin records (permission denied).", err);
    }

    await logAdminAttempt(fullName, true);
    
    return { success: true, admin: adminData };
  } catch (error) {
    console.error("Login Error:", error);
    try {
      handleFirestoreError(error, 'list', ADMINS_COLLECTION, auth);
    } catch (e) {
      // Return standard error msg
    }
    return { success: false, error: "Une erreur est survenue lors de la connexion." };
  }
};

export const loginAdminWithGoogle = async (): Promise<{ success: boolean; admin?: AdminAccount; error?: string }> => {
  try {
    const result = await signInWithGooglePopup();
    const googleEmail = result.user.email?.toLowerCase() || '';
    const googleUid = result.user.uid;

    // Search by email first
    let adminSnap = await getDocs(query(collection(db, ADMINS_COLLECTION), where('email', '==', googleEmail)));

    // Fallback: search by uid
    if (adminSnap.empty) {
      adminSnap = await getDocs(query(collection(db, ADMINS_COLLECTION), where('uid', '==', googleUid)));
    }

    if (adminSnap.empty) {
      // Not an authorized admin — sign out immediately
      await signOut(auth);
      return {
        success: false,
        error: `Accès refusé. L'adresse "${result.user.email}" n'est associée à aucun compte administrateur Neopay.`
      };
    }

    const adminDoc = adminSnap.docs[0];
    const adminData = { id: adminDoc.id, ...adminDoc.data() } as AdminAccount;

    // Check lockout
    if (adminData.lockUntil) {
      const lockDate = adminData.lockUntil instanceof Timestamp
        ? adminData.lockUntil.toDate()
        : new Date(adminData.lockUntil);
      if (lockDate > new Date()) {
        await signOut(auth);
        return { success: false, error: 'Compte bloqué temporairement. Réessayez plus tard.' };
      }
    }

    // Store uid + email on admin account if missing
    try {
      const updates: any = { failedAttempts: 0, updatedAt: serverTimestamp() };
      if (!adminData.uid) updates.uid = googleUid;
      if (!adminData.email) updates.email = googleEmail;
      await updateDoc(doc(db, ADMINS_COLLECTION, adminData.id!), updates);

      await setDoc(doc(db, 'admin_uids', googleUid), {
        adminId: adminData.id,
        fullName: adminData.fullName,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Could not update admin uid/email:', err);
    }

    await logAdminAttempt(adminData.fullName, true);
    adminData.uid = googleUid;
    return { success: true, admin: adminData };
  } catch (error: any) {
    const mapped = mapGoogleAuthError(error);
    if (!mapped) return { success: false, error: '' };
    console.error('Google admin login error:', error);
    return { success: false, error: mapped };
  }
};
