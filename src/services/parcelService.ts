import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp,
  getDocs,
  orderBy,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { db, storage, auth } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firebase-errors';
import { Parcel, ParcelStatus, PaymentStatus, Product, AppSettings, Game, ShippingConfig, CardTopup, NavButton, OnlineSubService, Formation } from '../types';

// Navigation Buttons Services
export const useNavButtons = () => {
  const [buttons, setButtons] = useState<NavButton[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'nav_buttons'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NavButton[];
      setButtons(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching nav buttons:", error);
      setLoading(false);
      try {
        handleFirestoreError(error, 'list', 'nav_buttons', auth);
      } catch (e) {
        // Log handled
      }
    });

    return () => unsubscribe();
  }, []);

  return { buttons, loading };
};

export const saveNavButton = async (buttonData: Partial<NavButton>, id?: string) => {
  try {
    const { id: _, createdAt: __, ...dataToSave } = buttonData;
    if (id) {
      const buttonRef = doc(db, 'nav_buttons', id);
      await updateDoc(buttonRef, {
        ...dataToSave,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, 'nav_buttons'), {
        ...dataToSave,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, id ? 'update' : 'create', 'nav_buttons', auth);
  }
};

export const deleteNavButton = async (id: string) => {
  try {
    const buttonRef = doc(db, 'nav_buttons', id);
    await deleteDoc(buttonRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', 'nav_buttons', auth);
  }
};

// Card Topup Services
export const useCardTopups = () => {
  const [cards, setCards] = useState<CardTopup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'card_topups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CardTopup[];
      setCards(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching card topups:", error);
      setLoading(false);
      try { handleFirestoreError(error, 'list', 'card_topups', auth); } catch (e) {}
    });

    return () => unsubscribe();
  }, []);

  return { cards, loading };
};

export const saveCardTopup = async (cardData: Partial<CardTopup>, id?: string) => {
  try {
    if (id) {
      const cardRef = doc(db, 'card_topups', id);
      await updateDoc(cardRef, {
        ...cardData,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'card_topups'), {
        ...cardData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, id ? 'update' : 'create', 'card_topups', auth);
  }
};

export const deleteCardTopup = async (id: string) => {
  try {
    const cardRef = doc(db, 'card_topups', id);
    await deleteDoc(cardRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', 'card_topups', auth);
  }
};

// Helper for resumable uploads with progress
const uploadWithProgress = (
  file: File | Blob, 
  path: string, 
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: 'image/jpeg'
    });

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      }, 
      (error) => {
        console.error("Upload error:", error);
        reject(error);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};

export const useParcels = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'parcels'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Parcel[];
      setParcels(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching parcels:", error);
      setLoading(false);
      try { handleFirestoreError(error, 'list', 'parcels', auth); } catch (e) {}
    });

    return () => unsubscribe();
  }, []);

  return { parcels, loading };
};

export const searchParcel = async (trackingNumber: string): Promise<Parcel | null> => {
  const q = query(collection(db, 'parcels'), where('trackingNumber', '==', trackingNumber));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docData = snapshot.docs[0];
  return { id: docData.id, ...docData.data() } as Parcel;
};

export const saveParcel = async (parcelData: Partial<Parcel>, id?: string) => {
  try {
    if (id) {
      const parcelRef = doc(db, 'parcels', id);
      await updateDoc(parcelRef, {
        ...parcelData,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'parcels'), {
        ...parcelData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, id ? 'update' : 'create', 'parcels', auth);
  }
};

export const deleteParcel = async (id: string) => {
  try {
    const parcelRef = doc(db, 'parcels', id);
    await deleteDoc(parcelRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', 'parcels', auth);
  }
};

export const uploadProof = async (
  file: File | Blob, 
  trackingNumber: string, 
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    const path = `proofs/${trackingNumber}_${Date.now()}`;
    return await uploadWithProgress(file, path, onProgress);
  } catch (error) {
    console.error("Error uploading proof:", error);
    throw new Error("Échec du téléchargement de l'image. Veuillez vérifier votre connexion.");
  }
};

// Product Services
export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setLoading(false);
      try { handleFirestoreError(error, 'list', 'products', auth); } catch (e) {}
    });

    return () => unsubscribe();
  }, []);

  return { products, loading };
};

export const saveProduct = async (productData: Partial<Product>, id?: string) => {
  try {
    if (id) {
      const productRef = doc(db, 'products', id);
      await updateDoc(productRef, {
        ...productData,
      });
    } else {
      await addDoc(collection(db, 'products'), {
        ...productData,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, id ? 'update' : 'create', 'products', auth);
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const productRef = doc(db, 'products', id);
    await deleteDoc(productRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', 'products', auth);
  }
};

// Game Services
export const useGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'games'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Game[];
      setGames(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching games:", error);
      setLoading(false);
      try { handleFirestoreError(error, 'list', 'games', auth); } catch (e) {}
    });

    return () => unsubscribe();
  }, []);

  return { games, loading };
};

export const saveGame = async (gameData: Partial<Game>, id?: string) => {
  try {
    const { id: _, createdAt: __, updatedAt: ___, ...dataToSave } = gameData;
    if (id) {
      const gameRef = doc(db, 'games', id);
      await updateDoc(gameRef, {
        ...dataToSave,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, 'games'), {
        ...dataToSave,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, id ? 'update' : 'create', 'games', auth);
  }
};

export const deleteGame = async (id: string) => {
  try {
    const gameRef = doc(db, 'games', id);
    await deleteDoc(gameRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', 'games', auth);
  }
};

// Settings Services
export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      }
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try { handleFirestoreError(error, 'get', 'settings/global', auth); } catch (e) {}
    });

    return () => unsubscribe();
  }, []);

  return { settings, loading };
};

export const updateSettings = async (settingsData: Partial<AppSettings>) => {
  try {
    const docRef = doc(db, 'settings', 'global');
    // Supprimer les valeurs undefined pour éviter les erreurs Firestore
    const cleanData = Object.entries(settingsData).reduce((acc: any, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});
    
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'update', 'settings/global', auth);
  }
};

export const uploadLogo = async (
  file: File | Blob,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    const path = `logo/app_logo_${Date.now()}`;
    return await uploadWithProgress(file, path, onProgress);
  } catch (error) {
    console.error("Error uploading logo:", error);
    throw new Error("Échec du téléchargement du logo.");
  }
};

// Slider Images Services
export const useSliderImages = () => {
  const [sliderImages, setSliderImages] = useState<{ id: string, url: string, title?: string, description?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'slider_images'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as { id: string, url: string, title?: string, description?: string }[];
      setSliderImages(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching slider images:", error);
      setLoading(false);
      try { handleFirestoreError(error, 'list', 'slider_images', auth); } catch (e) {}
    });

    return () => unsubscribe();
  }, []);

  return { sliderImages, loading };
};

export const saveSliderImage = async (url: string, title?: string, description?: string) => {
  try {
    await addDoc(collection(db, 'slider_images'), {
      url,
      title: title || '',
      description: description || '',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, 'create', 'slider_images', auth);
  }
};

export const updateSliderImage = async (id: string, updates: { url?: string, title?: string, description?: string }) => {
  try {
    const imageRef = doc(db, 'slider_images', id);
    await updateDoc(imageRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, 'update', 'slider_images', auth);
  }
};

export const deleteSliderImage = async (id: string) => {
  try {
    const imageRef = doc(db, 'slider_images', id);
    await deleteDoc(imageRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', 'slider_images', auth);
  }
};

// Shipping Services
export const useShippingConfigs = () => {
  const [configs, setConfigs] = useState<ShippingConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = collection(db, 'shipping_configs');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ShippingConfig[];
      setConfigs(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching shipping configs:", error);
      setLoading(false);
      try { handleFirestoreError(error, 'list', 'shipping_configs', auth); } catch (e) {}
    });

    return () => unsubscribe();
  }, []);

  return { configs, loading };
};

export const saveShippingConfig = async (configData: Partial<ShippingConfig>) => {
  try {
    const { id: _id, type, ...dataWithoutId } = configData as any;
    
    if (!type) {
      throw new Error("L'option de type est requise pour la configuration.");
    }

    const payload = {
      ...dataWithoutId,
      type,
      updatedAt: serverTimestamp()
    };

    // On utilise le 'type' comme ID du document pour garantir l'unicité
    const configRef = doc(db, 'shipping_configs', type);
    await setDoc(configRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'update', 'shipping_configs', auth);
  }
};

export const deleteShippingConfig = async (id: string) => {
  try {
    const configRef = doc(db, 'shipping_configs', id);
    await deleteDoc(configRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', 'shipping_configs', auth);
  }
};

// ── Online Sub-Services ────────────────────────────────────────────────────

export const useOnlineServices = () => {
  const [services, setServices] = useState<OnlineSubService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/online-sub-services')
      .then(r => r.json())
      .then(data => { if (!cancelled) { setServices(data.services || []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refresh]);

  const forceRefresh = () => setRefresh(r => r + 1);
  return { services, loading, refresh: forceRefresh };
};

export const saveOnlineSubService = async (data: Partial<OnlineSubService>, id?: string) => {
  const payload = id ? { ...data, id } : data;
  const res = await fetch('/api/admin/online-sub-services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': 'neopay-admin-2024' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Erreur sauvegarde service'); }
};

export const deleteOnlineSubService = async (id: string) => {
  const res = await fetch(`/api/admin/online-sub-services/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-secret': 'neopay-admin-2024' },
  });
  if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Erreur suppression service'); }
};

// ─── Formations (Admin CRUD via API) ─────────────────────────────────────────

export const useAdminFormations = () => {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/formations', { headers: { 'x-admin-secret': 'neopay-admin-2024' } })
      .then(r => r.json())
      .then(data => setFormations(data.formations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refresh = () => {
    setLoading(true);
    fetch('/api/admin/formations', { headers: { 'x-admin-secret': 'neopay-admin-2024' } })
      .then(r => r.json())
      .then(data => setFormations(data.formations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  return { formations, loading, refresh };
};

export const saveAdminFormation = async (data: Partial<Formation>, id?: string): Promise<void> => {
  const url = id ? `/api/admin/formations/${id}` : '/api/admin/formations';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': 'neopay-admin-2024' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || 'Erreur lors de la sauvegarde.');
  }
};

export const deleteAdminFormation = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/formations/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-secret': 'neopay-admin-2024' }
  });
  if (!res.ok) throw new Error('Erreur lors de la suppression.');
};
