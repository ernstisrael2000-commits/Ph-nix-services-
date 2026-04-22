import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp, 
  orderBy, 
  limit, 
  onSnapshot,
  setDoc,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firebase-errors';
import { Affiliate, WithdrawalRequest, AffiliateRequest, AffiliateNotification } from '../types';

export const loginAffiliate = async (username: string, password: string): Promise<Affiliate | null> => {
  const q = query(
    collection(db, 'affiliates'), 
    where('username', '==', username), 
    where('password', '==', password)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docData = snapshot.docs[0];
  return { id: docData.id, ...docData.data() } as Affiliate;
};

export const useAffiliateData = (affiliateId: string | null) => {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!affiliateId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'affiliates', affiliateId), (docSnap) => {
      if (docSnap.exists()) {
        setAffiliate({ id: docSnap.id, ...docSnap.data() } as Affiliate);
      }
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try { handleFirestoreError(error, 'get', `affiliates/${affiliateId}`, auth); } catch (e) {}
    });

    return () => unsubscribe();
  }, [affiliateId]);

  return { affiliate, loading };
};

export const useTopAffiliates = () => {
  const [topAffiliates, setTopAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'affiliates'), 
      orderBy('referredClients', 'desc'), 
      limit(10)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Affiliate[];
      setTopAffiliates(data);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try { handleFirestoreError(error, 'list', 'affiliates', auth); } catch (e) {}
    });

    return () => unsubscribe();
  }, []);

  return { topAffiliates, loading };
};

export const submitWithdrawal = async (
  affiliate: Affiliate, 
  amount: number, 
  method: 'MonCash' | 'NatCash' | 'Physical',
  accountNumber: string
) => {
  if (amount > affiliate.balance) {
    throw new Error("Montant supérieur au solde disponible.");
  }
  if (amount < 20) {
    throw new Error("Le montant minimum de retrait est de 20 Goud.");
  }
  if (!accountNumber) {
    throw new Error("Le numéro de compte est obligatoire.");
  }

  try {
    await addDoc(collection(db, 'withdrawals'), {
      affiliateId: affiliate.id,
      affiliateName: affiliate.name,
      affiliateCode: affiliate.code,
      amount,
      method,
      accountNumber,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, 'create', 'withdrawals', auth);
  }
};

export const useAffiliateWithdrawals = (affiliateId: string | null) => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!affiliateId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'withdrawals'), 
      where('affiliateId', '==', affiliateId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WithdrawalRequest[];
      setWithdrawals(data);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try { handleFirestoreError(error, 'list', 'withdrawals', auth); } catch (e) {}
    });

    return () => unsubscribe();
  }, [affiliateId]);

  return { withdrawals, loading };
};

// Admin Services
export const useAllAffiliates = () => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'affiliates'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Affiliate[];
      setAffiliates(data);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try { handleFirestoreError(error, 'list', 'affiliates', auth); } catch (e) {}
    });

    return () => unsubscribe();
  }, []);

  return { affiliates, loading };
};

export const useAllWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WithdrawalRequest[];
      setWithdrawals(data);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try { handleFirestoreError(error, 'list', 'withdrawals', auth); } catch (e) {}
    });

    return () => unsubscribe();
  }, []);

  return { withdrawals, loading };
};

export const saveAffiliate = async (affiliateData: Partial<Affiliate>, id?: string) => {
  // Filter out undefined values and the id field
  const dataToSave = Object.keys(affiliateData).reduce((acc: any, key) => {
    if (key !== 'id' && affiliateData[key as keyof Affiliate] !== undefined) {
      acc[key] = affiliateData[key as keyof Affiliate];
    }
    return acc;
  }, {});

  try {
    if (id) {
      const affiliateRef = doc(db, 'affiliates', id);
      await updateDoc(affiliateRef, {
        ...dataToSave,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'affiliates'), {
        balance: 0,
        referredClients: 0,
        monthlyReferredClients: 0,
        monthlySales: 0,
        points: 0,
        ...dataToSave,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, id ? 'update' : 'create', 'affiliates', auth);
  }
};

/**
 * Updates the status of a withdrawal request and adjusts affiliate balance if approved.
 */
export const updateWithdrawalStatus = async (
  requestId: string, 
  status: 'approved' | 'rejected', 
  reason?: string
) => {
  try {
    const requestRef = doc(db, 'withdrawals', requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) return;
    const requestData = requestSnap.data() as WithdrawalRequest;

    if (status === 'approved') {
      // Deduct from affiliate balance
      const affiliateRef = doc(db, 'affiliates', requestData.affiliateId);
      const affiliateSnap = await getDoc(affiliateRef);
      
      if (affiliateSnap.exists()) {
        const affiliateData = affiliateSnap.data() as Affiliate;
        await updateDoc(affiliateRef, {
          balance: (affiliateData.balance || 0) - requestData.amount
        });
      }
    }

    await updateDoc(requestRef, {
      status,
      rejectionReason: reason || '',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, 'update', 'withdrawals', auth);
  }
};

/**
 * Deletes an affiliate account.
 */
export const deleteAffiliate = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'affiliates', id));
  } catch (error) {
    handleFirestoreError(error, 'delete', 'affiliates', auth);
  }
};

// Affiliate Request Services
export const submitAffiliateRequest = async (requestData: Partial<AffiliateRequest>) => {
  try {
    await addDoc(collection(db, 'affiliate_requests'), {
      ...requestData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, 'create', 'affiliate_requests', auth);
  }
};

export const useAllAffiliateRequests = () => {
  const [requests, setRequests] = useState<AffiliateRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'affiliate_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AffiliateRequest[];
      setRequests(data);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try { handleFirestoreError(error, 'list', 'affiliate_requests', auth); } catch (e) {}
    });

    return () => unsubscribe();
  }, []);

  return { requests, loading };
};

export const updateAffiliateRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
  try {
    const requestRef = doc(db, 'affiliate_requests', requestId);
    await updateDoc(requestRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, 'update', 'affiliate_requests', auth);
  }
};

export const usePendingCounts = (enabled: boolean = false) => {
  const [counts, setCounts] = useState({ registrations: 0, withdrawals: 0, total: 0 });

  useEffect(() => {
    if (!enabled) {
      setCounts({ registrations: 0, withdrawals: 0, total: 0 });
      return;
    }

    const qReg = query(collection(db, 'affiliate_requests'), where('status', '==', 'pending'));
    const qWith = query(collection(db, 'withdrawals'), where('status', '==', 'pending'));

    const unsubReg = onSnapshot(qReg, (snapReg) => {
      const regCount = snapReg.size;
      const unsubWith = onSnapshot(qWith, (snapWith) => {
        const withCount = snapWith.size;
        setCounts({
          registrations: regCount,
          withdrawals: withCount,
          total: regCount + withCount
        });
      }, (error) => {
        console.error("Error fetching pending withdrawals:", error);
      });
      return () => unsubWith();
    }, (error) => {
      console.error("Error fetching pending registrations:", error);
    });

    return () => unsubReg();
  }, [enabled]);

  return counts;
};

export const useMonthlyRankings = () => {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'global');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setRankings(data.officialWinners || []);
      } else {
        setRankings([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching rankings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { rankings, loading };
};

// Notification Services
export const useNotifications = (affiliateId: string | null) => {
  const [notifications, setNotifications] = useState<AffiliateNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!affiliateId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('affiliateId', '==', affiliateId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AffiliateNotification[];
      setNotifications(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [affiliateId]);

  return { notifications, loading };
};

export const markNotificationAsRead = async (notificationId: string) => {
  const ref = doc(db, 'notifications', notificationId);
  await updateDoc(ref, { read: true });
};

export const createNotification = async (
  affiliateId: string, 
  title: string, 
  message: string, 
  type: AffiliateNotification['type']
) => {
  await addDoc(collection(db, 'notifications'), {
    affiliateId,
    title,
    message,
    type,
    read: false,
    createdAt: serverTimestamp()
  });
};

// Level Calculation Helper
export const getAffiliateLevelInfo = (points: number) => {
  if (points >= 5000) return { level: 'VIP', nextThreshold: Infinity, progress: 100 };
  if (points >= 2500) return { level: 'Elite', nextThreshold: 5000, progress: ((points - 2500) / 2500) * 100 };
  if (points >= 1000) return { level: 'Gold', nextThreshold: 2500, progress: ((points - 1000) / 1500) * 100 };
  if (points >= 250) return { level: 'Silver', nextThreshold: 1000, progress: ((points - 250) / 750) * 100 };
  return { level: 'Bronze', nextThreshold: 250, progress: (points / 250) * 100 };
};

export const clearMonthlyWinners = async () => {
  try {
    // 1. Clear flags on affiliates
    const snapshot = await getDocs(query(collection(db, 'affiliates'), where('isMonthlyWinner', '==', true)));
    const promises = snapshot.docs.map(docSnap => 
      updateDoc(doc(db, 'affiliates', docSnap.id), {
        isMonthlyWinner: false,
        updatedAt: serverTimestamp()
      })
    );
    await Promise.all(promises);

    // 2. Clear official winners in settings
    const settingsRef = doc(db, 'settings', 'global');
    await setDoc(settingsRef, {
      officialWinners: [],
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'update', 'affiliates', auth);
  }
};

export const awardMonthlyPrizes = async () => {
  try {
    // 1. Clear all current monthly winners first to ensure a fresh start
    const winnersQuery = query(collection(db, 'affiliates'), where('isMonthlyWinner', '==', true));
    const winnersSnap = await getDocs(winnersQuery);
    const clearPromises = winnersSnap.docs.map(d => updateDoc(doc(db, 'affiliates', d.id), { 
      isMonthlyWinner: false,
      updatedAt: serverTimestamp() 
    }));
    await Promise.all(clearPromises);

    // 2. Get all affiliates to calculate new winners based on points
    const snapshot = await getDocs(collection(db, 'affiliates'));
    const affiliates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Affiliate[];

    // 3. Filter those with points > 0 and sort descending
    const eligible = affiliates
      .filter(a => (a.points || 0) > 0)
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 3);

    if (eligible.length === 0) return [];

    const prizes = [500, 250, 150];
    const promises = [];
    const awardedWinners: Affiliate[] = [];

    // 4. Award prizes and mark as winners
    const officialWinners = [];
    for (let i = 0; i < eligible.length; i++) {
      const affiliateRef = doc(db, 'affiliates', eligible[i].id!);
      const prize = prizes[i];
      
      promises.push(updateDoc(affiliateRef, {
        balance: (eligible[i].balance || 0) + prize,
        isMonthlyWinner: true,
        updatedAt: serverTimestamp()
      }));
      
      const winnerInfo = {
        id: eligible[i].id!,
        name: eligible[i].name,
        points: eligible[i].points || 0,
        prize: prize,
        monthlySales: eligible[i].monthlySales || 0,
        monthlyReferredClients: eligible[i].monthlyReferredClients || 0
      };
      
      officialWinners.push(winnerInfo);
      
      awardedWinners.push({
        ...eligible[i],
        balance: (eligible[i].balance || 0) + prize,
        isMonthlyWinner: true
      });
    }

    // 5. Update official winners in settings
    const settingsRef = doc(db, 'settings', 'global');
    promises.push(setDoc(settingsRef, {
      officialWinners: officialWinners,
      updatedAt: serverTimestamp()
    }, { merge: true }));

    await Promise.all(promises);
    return awardedWinners;
  } catch (error) {
    handleFirestoreError(error, 'update', 'affiliates', auth);
    throw error;
  }
};

export const resetMonthlyStats = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'affiliates'));
    const promises = snapshot.docs.map(docSnap => 
      updateDoc(doc(db, 'affiliates', docSnap.id), {
        monthlyReferredClients: 0,
        monthlySales: 0,
        points: 0,
        isMonthlyWinner: false, // Reset winner status
        updatedAt: serverTimestamp()
      })
    );
    await Promise.all(promises);
  } catch (error) {
    handleFirestoreError(error, 'update', 'affiliates', auth);
  }
};

export const recordPurchase = async (affiliateId: string, type: 'purchase' | 'subscription' | 'virtual_card') => {
  try {
    const affiliateRef = doc(db, 'affiliates', affiliateId);
    const affiliateSnap = await getDoc(affiliateRef);
    
    if (!affiliateSnap.exists()) throw new Error("Affilié non trouvé");
    
    const affiliateData = affiliateSnap.data() as Affiliate;
    
    // Commission rates
    let directCommission = 2.5; // Default for general purchase
    let pointsEarned = 1;
    
    if (type === 'subscription') {
      directCommission = 100;
      pointsEarned = 10;
    } else if (type === 'virtual_card') {
      directCommission = 500;
      pointsEarned = 50;
    }
    
    const indirectCommission = 0.5;
    
    const batch = writeBatch(db);
    
    // 1. Update Direct Affiliate
    batch.update(affiliateRef, {
      balance: increment(directCommission),
      directRevenue: increment(directCommission),
      totalEarnings: increment(directCommission),
      points: increment(pointsEarned),
      monthlySales: increment(1),
      updatedAt: serverTimestamp()
    });

    // 1b. Record in Sales collection for analytics
    const saleRef = doc(collection(db, 'sales'));
    batch.set(saleRef, {
      affiliateId,
      affiliateName: affiliateData.name,
      itemType: type === 'purchase' ? 'product' : type === 'subscription' ? 'game' : 'card',
      itemName: type === 'subscription' ? 'Abonnement' : type === 'virtual_card' ? 'Carte Virtuelle' : 'Produit Rapide',
      price: type === 'purchase' ? 0 : type === 'subscription' ? 100 : 500, // Approximate for logging if real price not passed
      createdAt: serverTimestamp()
    });
    
    // 2. Update Parent Affiliate (Indirect Revenue)
    if (affiliateData.parentAffiliateId) {
      const parentRef = doc(db, 'affiliates', affiliateData.parentAffiliateId);
      const parentSnap = await getDoc(parentRef);
      
      if (parentSnap.exists()) {
        batch.update(parentRef, {
          balance: increment(indirectCommission),
          indirectRevenue: increment(indirectCommission),
          totalEarnings: increment(indirectCommission),
          updatedAt: serverTimestamp()
        });
        
        // Create notification for parent
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          affiliateId: affiliateData.parentAffiliateId,
          title: "Revenu Indirect !",
          message: `Vous avez reçu ${indirectCommission} Goud grâce à une vente de votre affilié ${affiliateData.name}.`,
          type: 'revenue',
          read: false,
          createdAt: serverTimestamp()
        });
      }
    }
    
    // Create notification for direct affiliate
    const directNotifRef = doc(collection(db, 'notifications'));
    batch.set(directNotifRef, {
      affiliateId: affiliateId,
      title: "Nouvelle Vente !",
      message: `Félicitations ! Vous avez gagné ${directCommission} Goud et ${pointsEarned} points.`,
      type: 'revenue',
      read: false,
      createdAt: serverTimestamp()
    });
    
    await batch.commit();
    
    // Check for level up (async)
    const updatedAffiliateSnap = await getDoc(affiliateRef);
    if (updatedAffiliateSnap.exists()) {
      const updatedData = updatedAffiliateSnap.data() as Affiliate;
      const { level: newLevel } = getAffiliateLevelInfo(updatedData.points || 0);
      
      if (newLevel !== updatedData.level) {
        await updateDoc(affiliateRef, { level: newLevel });
        await createNotification(affiliateId, "Niveau Supérieur !", `Félicitations ! Vous êtes maintenant au niveau ${newLevel}.`, 'level_up');
      }
    }
  } catch (error) {
    handleFirestoreError(error, 'update', 'affiliates', auth);
  }
};
