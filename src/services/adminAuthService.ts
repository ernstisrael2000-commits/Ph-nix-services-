import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Admin, AdminRole } from '../types';
import { useState, useEffect } from 'react';

const ADMIN_DOMAIN = '@neopay.admin';

export const loginAdmin = async (username: string, password: string) => {
  const email = `${username}${ADMIN_DOMAIN}`;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error("Admin login error:", error);
    throw new Error(error.message || "Identifiants invalides");
  }
};

export const createSubAdmin = async (adminData: Partial<Admin>) => {
  if (!adminData.username || !adminData.password) {
    throw new Error("Nom d'utilisateur et mot de passe requis");
  }

  const email = `${adminData.username}${ADMIN_DOMAIN}`;
  
  try {
    // 1. Create the auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, adminData.password);
    const user = userCredential.user;

    // 2. Update profile
    await updateProfile(user, { displayName: adminData.name });

    // 3. Create the admin document
    const adminRef = doc(db, 'admins', user.uid);
    await setDoc(adminRef, {
      username: adminData.username,
      name: adminData.name,
      role: adminData.role,
      permissions: adminData.permissions || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return user;
  } catch (error: any) {
    console.error("Create sub-admin error:", error);
    throw new Error(error.message || "Erreur lors de la création de l'administrateur");
  }
};

export const useAllAdmins = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'admins'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Admin[];
      setAdmins(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { admins, loading };
};

export const updateAdmin = async (id: string, data: Partial<Admin>) => {
  const adminRef = doc(db, 'admins', id);
  await updateDoc(adminRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteAdmin = async (id: string) => {
  // Note: This only deletes the document, not the Auth user.
  // Deleting Auth users requires admin SDK or the user to be logged in.
  // For this app, we'll just delete the doc which revokes permissions in rules.
  await deleteDoc(doc(db, 'admins', id));
};
