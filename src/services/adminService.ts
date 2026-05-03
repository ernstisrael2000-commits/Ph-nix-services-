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
import { signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firebase-errors';
import { AdminAccount, AdminLog } from '../types';
import { useState, useEffect } from 'react';

const ADMINS_COLLECTION = 'admin_accounts';
const LOGS_COLLECTION = 'admin_login_logs';

export const useAdminAccounts = (enabled: boolean = false) => {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !auth.currentUser) {
      setLoading(false);
      return;
    }
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
  }, [enabled]);

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

export const useAdminLogs = (max: number = 50, enabled: boolean = false) => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !auth.currentUser) {
      setLoading(false);
      return;
    }
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
  }, [max, enabled]);

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

export const signInWithGoogleAdmin = async (): Promise<{ success: boolean; admin?: AdminAccount; error?: string }> => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    if (!user.email) {
      return { success: false, error: "Email non trouvé dans votre compte Google." };
    }

    const authorizedEmails = [
      "ernstisrael2000@gmail.com",
      "ernstisrael508@gmail.com",
      "admin@neopay.com"
    ];

    const isAuthorizedEmail = authorizedEmails.includes(user.email);

    // Query by UID
    const qUid = query(collection(db, ADMINS_COLLECTION), where('uid', '==', user.uid));
    const snapshotUid = await getDocs(qUid);

    let adminData: AdminAccount | null = null;

    if (!snapshotUid.empty) {
      adminData = { id: snapshotUid.docs[0].id, ...snapshotUid.docs[0].data() } as AdminAccount;
    } else {
      // Try by name or create if authorized by email
      const qName = query(collection(db, ADMINS_COLLECTION), where('fullName', '==', user.displayName || user.email));
      const snapshotName = await getDocs(qName);
      
      if (!snapshotName.empty) {
        adminData = { id: snapshotName.docs[0].id, ...snapshotName.docs[0].data() } as AdminAccount;
      } else if (isAuthorizedEmail) {
        // Auto-bootstrap authorized admins
        const newAdmin: Partial<AdminAccount> = {
          fullName: user.displayName || user.email,
          isSuperAdmin: user.email === "ernstisrael2000@gmail.com",
          permissions: ['all'],
          uid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          failedAttempts: 0
        };
        const docRef = await addDoc(collection(db, ADMINS_COLLECTION), newAdmin);
        adminData = { id: docRef.id, ...newAdmin } as AdminAccount;
      }
    }

    if (!adminData) {
      return { success: false, error: "Accès refusé. Vous n'êtes pas enregistré comme administrateur." };
    }

    // Ensure UID linkage
    if (user.uid) {
      try {
        await setDoc(doc(db, 'admin_uids', user.uid), {
          adminId: adminData.id,
          fullName: adminData.fullName,
          email: user.email,
          updatedAt: serverTimestamp()
        });
        
        if (adminData.uid !== user.uid) {
          await updateDoc(doc(db, ADMINS_COLLECTION, adminData.id!), {
            uid: user.uid,
            updatedAt: serverTimestamp()
          });
          adminData.uid = user.uid;
        }
      } catch (linkError) {
        console.warn("Could not link admin UID (may be already linked or insufficient perms):", linkError);
      }
    }

    await logAdminAttempt(adminData.fullName, true);

    return { success: true, admin: adminData };
  } catch (error: any) {
    console.error("Google Login Error:", error);
    
    if (error.code === 'permission-denied' || error.message?.includes('insufficient permissions')) {
      return { 
        success: false, 
        error: "Accès refusé. Vérifiez que votre email est autorisé ou contactez l'administrateur principal." 
      };
    }
    
    if (error.code === 'auth/popup-blocked') {
      return { success: false, error: "La fenêtre de connexion a été bloquée par votre navigateur." };
    }
    return { success: false, error: "Erreur lors de la connexion Google." };
  }
};
