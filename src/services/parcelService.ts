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
import { Parcel, ParcelStatus, PaymentStatus, Product, AppSettings, Game, ShippingConfig, CardTopup } from '../types';

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
    });

    return () => unsubscribe();
  }, []);

  return { cards, loading };
};

export const saveCardTopup = async (cardData: Partial<CardTopup>, id?: string) => {
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
};

export const deleteCardTopup = async (id: string) => {
  const cardRef = doc(db, 'card_topups', id);
  await deleteDoc(cardRef);
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
};

export const deleteParcel = async (id: string) => {
  const parcelRef = doc(db, 'parcels', id);
  await deleteDoc(parcelRef);
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
    });

    return () => unsubscribe();
  }, []);

  return { products, loading };
};

export const saveProduct = async (productData: Partial<Product>, id?: string) => {
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
};

export const deleteProduct = async (id: string) => {
  const productRef = doc(db, 'products', id);
  await deleteDoc(productRef);
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
    });

    return () => unsubscribe();
  }, []);

  return { games, loading };
};

export const saveGame = async (gameData: Partial<Game>, id?: string) => {
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
};

export const deleteGame = async (id: string) => {
  const gameRef = doc(db, 'games', id);
  await deleteDoc(gameRef);
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
    });

    return () => unsubscribe();
  }, []);

  return { settings, loading };
};

export const updateSettings = async (settingsData: AppSettings) => {
  const docRef = doc(db, 'settings', 'global');
  await setDoc(docRef, settingsData, { merge: true });
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
    });

    return () => unsubscribe();
  }, []);

  return { sliderImages, loading };
};

export const saveSliderImage = async (url: string, title?: string, description?: string) => {
  await addDoc(collection(db, 'slider_images'), {
    url,
    title: title || '',
    description: description || '',
    createdAt: serverTimestamp()
  });
};

export const deleteSliderImage = async (id: string) => {
  const imageRef = doc(db, 'slider_images', id);
  await deleteDoc(imageRef);
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
    });

    return () => unsubscribe();
  }, []);

  return { configs, loading };
};

export const saveShippingConfig = async (configData: Partial<ShippingConfig>) => {
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
};

export const deleteShippingConfig = async (id: string) => {
  const configRef = doc(db, 'shipping_configs', id);
  await deleteDoc(configRef);
};
