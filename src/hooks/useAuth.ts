import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, AdminRole } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Try users collection first (Google Auth admins)
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          setProfile(userDocSnap.data() as UserProfile);
        } else {
          // Try admins collection (Username/Password admins)
          const adminDocRef = doc(db, 'admins', firebaseUser.uid);
          const adminDocSnap = await getDoc(adminDocRef);
          
          if (adminDocSnap.exists()) {
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: adminDocSnap.data().role as AdminRole,
              username: adminDocSnap.data().username
            });
          } else if (firebaseUser.email === 'ernstisrael2000@gmail.com') {
            // Hardcoded super admin
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'super_admin'
            });
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = !!profile?.role;
  const isSuperAdmin = profile?.role === 'super_admin' || user?.email === 'ernstisrael2000@gmail.com';

  return { user, profile, loading, isAdmin, isSuperAdmin };
};
