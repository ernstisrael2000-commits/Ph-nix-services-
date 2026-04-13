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

import { signInWithCustomToken } from 'firebase/auth';

export const loginAdmin = async (username: string, password: string): Promise<Admin | null> => {
  try {
    // 1. Call the backend API to verify credentials and get a Custom Token
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Identifiants incorrects");
    }

    const { token, admin } = await response.json();

    // 2. Sign in with the Custom Token to get a valid request.auth.uid for Firestore rules
    await signInWithCustomToken(auth, token);

    // Store in localStorage for persistence
    localStorage.setItem('neopay_admin', JSON.stringify(admin));
    return admin;
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
