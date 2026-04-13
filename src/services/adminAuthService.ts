import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  updateDoc,
  where,
  getDocs,
  addDoc,
  getDocFromServer
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Admin, AdminRole } from '../types';
import { useState, useEffect } from 'react';

async function testConnection() {
  try {
    const testDocRef = doc(db, 'settings', 'connection_test');
    await getDocFromServer(testDocRef);
    console.log("Firestore connection verified.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}

testConnection();

export const loginAdmin = async (username: string, password: string): Promise<Admin | null> => {
  try {
    // 1. Sign in anonymously FIRST to get a valid request.auth.uid for Firestore rules
    // This ensures that even the initial query is performed by an authenticated user
    const userCredential = await signInAnonymously(auth);
    const uid = userCredential.user.uid;

    // 2. Find the admin document by username and password
    const q = query(
      collection(db, 'admins'), 
      where('username', '==', username), 
      where('password', '==', password)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      // If login fails, we should probably sign out or just leave it anonymous
      // but for now, we return null
      return null;
    }
    
    const docData = snapshot.docs[0];
    const adminData = docData.data() as Admin;

    // 3. Create a session document at /admin_sessions/{uid} for security rules
    // This allows rules to verify the user is a valid admin without knowing their username
    await setDoc(doc(db, 'admin_sessions', uid), {
      username: adminData.username,
      role: adminData.role,
      permissions: adminData.permissions || [],
      adminDocId: docData.id,
      createdAt: serverTimestamp()
    });

    const loggedAdmin = { ...adminData, id: docData.id, uid };
    
    // Store in localStorage for persistence
    localStorage.setItem('neopay_admin', JSON.stringify(loggedAdmin));
    return loggedAdmin;
  } catch (error: any) {
    console.error("Admin login error:", error);
    throw new Error(error.message || "Erreur de connexion");
  }
};

export const logoutAdmin = () => {
  localStorage.removeItem('neopay_admin');
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const createSubAdmin = async (adminData: Partial<Admin>) => {
  if (!adminData.username || !adminData.password) {
    throw new Error("Nom d'utilisateur et mot de passe requis");
  }

  const path = 'admins';
  try {
    // Check if username already exists
    const q = query(collection(db, path), where('username', '==', adminData.username));
    let existingDocs;
    try {
      existingDocs = await getDocs(q);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return; // Should not reach here
    }

    if (!existingDocs.empty) {
      throw new Error("Ce nom d'utilisateur est déjà utilisé");
    }

    // Simply add to Firestore
    try {
      const docRef = await addDoc(collection(db, path), {
        username: adminData.username,
        password: adminData.password,
        name: adminData.name,
        role: adminData.role,
        permissions: adminData.permissions || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, ...adminData };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } catch (error: any) {
    console.error("Create sub-admin error:", error);
    // If it's already our JSON error, just rethrow
    if (error.message.startsWith('{')) throw error;
    throw new Error(error.message || "Erreur lors de la création de l'administrateur");
  }
};

export const useAllAdmins = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = 'admins';
    const q = query(collection(db, path));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Admin[];
      setAdmins(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  return { admins, loading };
};

export const updateAdmin = async (id: string, data: Partial<Admin>) => {
  const path = 'admins';
  const adminRef = doc(db, path, id);
  const updateData: any = {
    updatedAt: serverTimestamp()
  };

  if (data.name) updateData.name = data.name;
  if (data.role) updateData.role = data.role;
  if (data.permissions) updateData.permissions = data.permissions;
  if (data.username) updateData.username = data.username;
  if (data.password) updateData.password = data.password;

  try {
    await updateDoc(adminRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
  }
};

export const deleteAdmin = async (id: string) => {
  const path = 'admins';
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
  }
};
