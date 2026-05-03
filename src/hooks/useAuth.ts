import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

const ADMIN_EMAILS = ['ernstisrael2000@gmail.com', 'ernstisrael508@gmail.com', 'admin@neopay.com'];

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // 1. Check users collection
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        let foundProfile: UserProfile | null = null;
        
        if (userDocSnap.exists()) {
          foundProfile = userDocSnap.data() as UserProfile;
        }

        // 2. Check hardcoded admins
        if (ADMIN_EMAILS.includes(firebaseUser.email || '')) {
          foundProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: 'admin',
            ...(foundProfile || {})
          };
        }

        // 3. Check admin_uids collection (for anonymous/custom admins)
        if (!foundProfile || foundProfile.role !== 'admin') {
          const adminUidRef = doc(db, 'admin_uids', firebaseUser.uid);
          const adminUidSnap = await getDoc(adminUidRef);
          if (adminUidSnap.exists()) {
            foundProfile = {
              uid: firebaseUser.uid,
              role: 'admin',
              ...(foundProfile || {})
            } as any;
          }
        }

        setProfile(foundProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'admin' || ADMIN_EMAILS.includes(user?.email || '');

  useEffect(() => {
    if (user) {
      console.log("Current user:", user.email, "isAdmin:", isAdmin);
    }
  }, [user, isAdmin]);

  return { user, profile, loading, isAdmin };
};
