import React from 'react';
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, serverTimestamp, setDoc, increment
} from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Formation, FormationProgress, FormationPurchase, FormationUser } from '../types';

// ─── Google Sign-In for Formations ───────────────────────────────────────────

export const signInWithGoogle = async (): Promise<FormationUser> => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  const userRef = doc(db, 'formation_users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
    });
  }
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    createdAt: snap.data()?.createdAt || null,
  };
};

// ─── Utility: strip undefined values from any object before Firestore writes ──
function stripUndefined<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_key, value) => (value === undefined ? null : value)));
}

// ─── Formations CRUD ─────────────────────────────────────────────────────────

export const useFormations = (onlyPublished = true) => {
  const [formations, setFormations] = React.useState<Formation[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let q;
    try {
      q = onlyPublished
        ? query(collection(db, 'formations'), where('published', '==', true), orderBy('createdAt', 'desc'))
        : query(collection(db, 'formations'), orderBy('createdAt', 'desc'));
    } catch {
      q = query(collection(db, 'formations'));
    }
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Formation));
      setFormations(onlyPublished ? all.filter(f => f.published) : all);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [onlyPublished]);

  return { formations, loading };
};

export const useFormation = (id: string | null) => {
  const [formation, setFormation] = React.useState<Formation | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, 'formations', id), (snap) => {
      setFormation(snap.exists() ? { id: snap.id, ...snap.data() } as Formation : null);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [id]);

  return { formation, loading };
};

export const createFormation = async (data: Omit<Formation, 'id' | 'createdAt' | 'updatedAt'>) => {
  const clean = stripUndefined({
    ...data,
    studentsCount: 0,
    rating: 0,
  });
  return addDoc(collection(db, 'formations'), {
    ...clean,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateFormation = async (id: string, data: Partial<Formation>) => {
  const clean = stripUndefined(data);
  return updateDoc(doc(db, 'formations', id), { ...clean, updatedAt: serverTimestamp() });
};

export const deleteFormation = async (id: string) => {
  return deleteDoc(doc(db, 'formations', id));
};

// ─── Purchases ───────────────────────────────────────────────────────────────

export const useUserPurchases = (userId: string | null) => {
  const [purchases, setPurchases] = React.useState<FormationPurchase[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const q = query(collection(db, 'formation_purchases'), where('userId', '==', userId));
    const unsub = onSnapshot(q, (snap) => {
      setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() } as FormationPurchase)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [userId]);

  return { purchases, loading };
};

export const useAllPurchases = () => {
  const [purchases, setPurchases] = React.useState<FormationPurchase[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const q = query(collection(db, 'formation_purchases'), orderBy('purchasedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() } as FormationPurchase)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  return { purchases, loading };
};

export const hasUserPurchased = (purchases: FormationPurchase[], formationId: string) =>
  purchases.some(p => p.formationId === formationId && p.status === 'active');

export const requestFormationAccess = async (
  userId: string, userEmail: string, userName: string,
  formation: Formation, method: string, adminPhone: string
) => {
  await addDoc(collection(db, 'formation_purchases'), {
    userId, userEmail, userName,
    formationId: formation.id!,
    formationTitle: formation.title,
    amount: formation.price,
    method,
    status: 'pending',
    purchasedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const msg = `Bonjour Neopay 👋\n\nJe souhaite acheter une *FORMATION*:\n👤 Nom: *${userName}*\n📧 Email: *${userEmail}*\n📚 Formation: *${formation.title}*\n💰 Prix: *${formation.price.toLocaleString()} HTG*\n💳 Via: *${method}*\n\nMerci de valider mon accès.`;
  window.open(`https://wa.me/${adminPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
};

export const grantFreeAccess = async (
  userId: string, userEmail: string, userName: string, formation: Formation
) => {
  const q = query(
    collection(db, 'formation_purchases'),
    where('userId', '==', userId),
    where('formationId', '==', formation.id!)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    await updateDoc(doc(db, 'formation_purchases', snap.docs[0].id), {
      status: 'active', updatedAt: serverTimestamp()
    });
  } else {
    await addDoc(collection(db, 'formation_purchases'), {
      userId, userEmail, userName,
      formationId: formation.id!,
      formationTitle: formation.title,
      amount: 0,
      method: 'Gratuit',
      status: 'active',
      purchasedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'formations', formation.id!), { studentsCount: increment(1) });
  }
};

export const updatePurchaseStatus = async (purchaseId: string, status: 'active' | 'revoked', formationId?: string) => {
  await updateDoc(doc(db, 'formation_purchases', purchaseId), {
    status,
    updatedAt: serverTimestamp(),
  });
  if (status === 'active' && formationId) {
    await updateDoc(doc(db, 'formations', formationId), { studentsCount: increment(1) });
  }
};

// ─── Progress ────────────────────────────────────────────────────────────────

export const useFormationProgress = (userId: string | null, formationId: string | null) => {
  const [progress, setProgress] = React.useState<FormationProgress | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId || !formationId) { setLoading(false); return; }
    const q = query(
      collection(db, 'formation_progress'),
      where('userId', '==', userId),
      where('formationId', '==', formationId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setProgress(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as FormationProgress);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [userId, formationId]);

  return { progress, loading };
};

export const useAllProgress = (userId: string | null) => {
  const [progressList, setProgressList] = React.useState<FormationProgress[]>([]);

  React.useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'formation_progress'), where('userId', '==', userId));
    const unsub = onSnapshot(q, (snap) => {
      setProgressList(snap.docs.map(d => ({ id: d.id, ...d.data() } as FormationProgress)));
    });
    return () => unsub();
  }, [userId]);

  return progressList;
};

export const markModuleCompleted = async (
  userId: string, userEmail: string, formationId: string,
  moduleId: string, totalModules: number, existingProgressId?: string
) => {
  const progressRef = existingProgressId
    ? doc(db, 'formation_progress', existingProgressId)
    : doc(collection(db, 'formation_progress'));

  const snap = existingProgressId ? await getDoc(progressRef) : null;
  const existing = snap?.data() as FormationProgress | undefined;
  const completedModules = Array.from(new Set([...(existing?.completedModules || []), moduleId]));
  const percentage = Math.round((completedModules.length / totalModules) * 100);
  const now = serverTimestamp();

  await setDoc(progressRef, {
    userId, userEmail, formationId,
    completedModules,
    percentage,
    startedAt: existing?.startedAt || now,
    lastAccessedAt: now,
    ...(percentage === 100 ? { completedAt: now } : {}),
  }, { merge: true });
};

// ─── Admin: All Users Data ────────────────────────────────────────────────────

export const getAllFormationUsers = async (): Promise<FormationUser[]> => {
  const snap = await getDocs(collection(db, 'formation_users'));
  return snap.docs.map(d => d.data() as FormationUser);
};

export const getAllFormationProgress = async (): Promise<FormationProgress[]> => {
  const snap = await getDocs(collection(db, 'formation_progress'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FormationProgress));
};
