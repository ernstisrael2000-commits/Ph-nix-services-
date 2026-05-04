import React, { useState, useEffect, useCallback } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Formation, FormationProgress, FormationPurchase, FormationUser } from '../types';

// ─── API Helper ───────────────────────────────────────────────────────────────

async function apiCall(method: string, path: string, body?: object): Promise<any> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
  return json;
}

// ─── Generic polling hook ─────────────────────────────────────────────────────
// All formation data goes through the backend API (Admin SDK) — zero direct Firestore calls.

function usePoll<T>(
  fetcher: (() => Promise<T>) | null,
  initial: T,
  deps: React.DependencyList,
  interval = 12000
): { data: T; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState<boolean>(fetcher !== null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!fetcher) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const go = async () => {
      try {
        const result = await fetcher();
        if (!cancelled) { setData(result); setLoading(false); }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    go();
    const id = setInterval(go, interval);
    return () => { cancelled = true; clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, refresh };
}

// ─── Google Sign-In ───────────────────────────────────────────────────────────

export const signInWithGoogle = async (): Promise<FormationUser> => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  // Save user profile via backend (no direct Firestore write)
  await apiCall('POST', '/api/formations/user', {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
  });
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    createdAt: null,
  };
};

// ─── Formations ───────────────────────────────────────────────────────────────

export const useFormations = (onlyPublished = true) => {
  const endpoint = onlyPublished ? '/api/formations' : '/api/admin/formations';
  const { data, loading, refresh } = usePoll<{ formations: Formation[] }>(
    () => apiCall('GET', endpoint),
    { formations: [] },
    [onlyPublished]
  );
  return { formations: data.formations || [], loading, refresh };
};

export const createFormation = async (data: Omit<Formation, 'id' | 'createdAt' | 'updatedAt'>) => {
  return apiCall('POST', '/api/admin/formations', data);
};

export const updateFormation = async (id: string, data: Partial<Formation>) => {
  return apiCall('PUT', `/api/admin/formations/${id}`, data);
};

export const deleteFormation = async (id: string) => {
  return apiCall('DELETE', `/api/admin/formations/${id}`);
};

// ─── Purchases ────────────────────────────────────────────────────────────────

export const useUserPurchases = (userId: string | null) => {
  const { data, loading, refresh } = usePoll<{ purchases: FormationPurchase[] }>(
    userId ? () => apiCall('GET', `/api/formations/purchases/user/${userId}`) : null,
    { purchases: [] },
    [userId]
  );
  return { purchases: data.purchases || [], loading, refresh };
};

export const useAllPurchases = () => {
  const { data, loading, refresh } = usePoll<{ purchases: FormationPurchase[] }>(
    () => apiCall('GET', '/api/admin/formations/purchases'),
    { purchases: [] },
    []
  );
  return { purchases: data.purchases || [], loading, refresh };
};

export const hasUserPurchased = (purchases: FormationPurchase[], formationId: string) =>
  purchases.some(p => p.formationId === formationId && p.status === 'active');

export const requestFormationAccess = async (
  userId: string, userEmail: string, userName: string,
  formation: Formation, method: string, adminPhone: string
) => {
  await apiCall('POST', '/api/formations/purchases', {
    userId, userEmail, userName,
    formationId: formation.id!,
    formationTitle: formation.title,
    amount: formation.price,
    method,
  });
  const msg = `Bonjour Neopay 👋\n\nJe souhaite acheter une *FORMATION*:\n👤 Nom: *${userName}*\n📧 Email: *${userEmail}*\n📚 Formation: *${formation.title}*\n💰 Prix: *${formation.price.toLocaleString()} HTG*\n💳 Via: *${method}*\n\nMerci de valider mon accès.`;
  window.open(`https://wa.me/${adminPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
};

export const grantFreeAccess = async (
  userId: string, userEmail: string, userName: string, formation: Formation
) => {
  await apiCall('POST', '/api/formations/free-access', {
    userId, userEmail, userName,
    formationId: formation.id!,
    formationTitle: formation.title,
  });
};

export const updatePurchaseStatus = async (purchaseId: string, status: 'active' | 'revoked', formationId?: string) => {
  return apiCall('PATCH', `/api/admin/formations/purchases/${purchaseId}`, { status, formationId });
};

// ─── Progress ─────────────────────────────────────────────────────────────────

export const useAllProgress = (userId: string | null): FormationProgress[] => {
  const { data } = usePoll<{ progress: FormationProgress[] }>(
    userId ? () => apiCall('GET', `/api/formations/progress/${userId}`) : null,
    { progress: [] },
    [userId]
  );
  return data.progress || [];
};

export const useFormationProgress = (userId: string | null, formationId: string | null) => {
  const { data, loading, refresh } = usePoll<{ progress: FormationProgress[] }>(
    userId ? () => apiCall('GET', `/api/formations/progress/${userId}`) : null,
    { progress: [] },
    [userId]
  );
  const progress = (data.progress || []).find(p => p.formationId === formationId) ?? null;
  return { progress, loading, refresh };
};

export const markModuleCompleted = async (
  userId: string, userEmail: string, formationId: string,
  moduleId: string, totalModules: number
) => {
  await apiCall('POST', '/api/formations/progress', {
    userId, userEmail, formationId, moduleId, totalModules,
  });
};

// ─── Admin helpers ────────────────────────────────────────────────────────────

export const getAllFormationUsers = async (): Promise<FormationUser[]> => {
  return [];
};

export const getAllFormationProgress = async (): Promise<FormationProgress[]> => {
  return [];
};
