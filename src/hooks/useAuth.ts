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
      if (firebaseUser) {
        setUser(firebaseUser);
        // Try users collection first (Google Auth admins)
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          setProfile(userDocSnap.data() as UserProfile);
        } else {
          // Check admin_sessions (sub-admins)
          const sessionDocRef = doc(db, 'admin_sessions', firebaseUser.uid);
          const sessionDocSnap = await getDoc(sessionDocRef);
          
          if (sessionDocSnap.exists()) {
            const sessionData = sessionDocSnap.data();
            setProfile({
              uid: firebaseUser.uid,
              email: '',
              role: sessionData.role as AdminRole,
              username: sessionData.username
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
        // Check for simple admin login in localStorage
        const savedAdmin = localStorage.getItem('neopay_admin');
        if (savedAdmin) {
          const adminData = JSON.parse(savedAdmin);
          setUser(null);
          setProfile({
            uid: adminData.id,
            email: '',
            role: adminData.role,
            username: adminData.username
          });
        } else {
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = !!profile?.role;
  const isSuperAdmin = profile?.role === 'super_admin' || 
                       (user?.email === 'ernstisrael2000@gmail.com' && user?.emailVerified);

  return { user, profile, loading, isAdmin, isSuperAdmin };
};
