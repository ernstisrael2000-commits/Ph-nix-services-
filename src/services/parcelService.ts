import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  orderBy,
  where,
  getDocs,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firebase-errors';
import { Parcel, Product, AppSettings, Game, ShippingConfig, CardTopup, NavButton, OnlineSubService, Formation } from '../types';

const ADMIN_SECRET = 'rena-admin-2024';

// ── Admin API helper (toutes les écritures passent par le serveur) ────────────
async function adminApi(method: string, path: string, body?: object): Promise<any> {
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': ADMIN_SECRET,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur serveur (${res.status})`);
  // Notifier les hooks admin de se rafraîchir après chaque mutation
  try { window.dispatchEvent(new Event('admin-data-changed')); } catch {}
  return data;
}

// ── Fetch admin data via API (Admin SDK — bypass règles Firestore) ─────────────
async function adminGet(path: string): Promise<any> {
  const res = await fetch(path, { headers: { 'x-admin-secret': ADMIN_SECRET } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Helper for resumable uploads with progress ────────────────────────────────
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
      (error) => { console.error("Upload error:", error); reject(error); },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};

// ── Navigation Buttons Services ───────────────────────────────────────────────
export const useNavButtons = () => {
  const [buttons, setButtons] = useState<NavButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('admin-data-changed', handler);
    return () => window.removeEventListener('admin-data-changed', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = query(collection(db, 'nav_buttons'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (cancelled) return;
      setButtons(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as NavButton[]);
      setLoading(false);
    }, async (_err) => {
      if (cancelled) return;
      try {
        const data = await adminGet('/api/admin/nav-buttons-list');
        if (!cancelled) setButtons(data.buttons || []);
      } catch {}
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [refreshKey]);

  return { buttons, loading };
};

export const saveNavButton = async (buttonData: Partial<NavButton>, id?: string) => {
  await adminApi('POST', '/api/admin/nav-button', { ...buttonData, ...(id && { id }) });
};

export const deleteNavButton = async (id: string) => {
  await adminApi('DELETE', `/api/admin/nav-button/${id}`);
};

// ── Card Topup Services ───────────────────────────────────────────────────────
const DEFAULT_CARDS: CardTopup[] = [
  {
    id: 'default-visa-prepaid',
    name: 'Visa Prépayée',
    image: 'https://picsum.photos/seed/visa-prepaid/400/300',
    description: 'Carte Visa prépayée rechargeable, acceptée partout',
    price: '2 500 HTG',
    presets: [25, 50, 100],
    createdAt: null,
  },
  {
    id: 'default-mastercard',
    name: 'Mastercard Prépayée',
    image: 'https://picsum.photos/seed/mastercard/400/300',
    description: 'Carte Mastercard prépayée internationale',
    price: '3 000 HTG',
    presets: [50, 100, 200],
    createdAt: null,
  },
  {
    id: 'default-visa-virtual',
    name: 'Visa Virtuelle',
    image: 'https://picsum.photos/seed/visa-virtual/400/300',
    description: 'Carte Visa virtuelle pour achats en ligne',
    price: '1 500 HTG',
    presets: [10, 25, 50],
    createdAt: null,
  },
  {
    id: 'default-amazon-gift',
    name: 'Amazon Gift Card',
    image: 'https://picsum.photos/seed/amazon-gift/400/300',
    description: 'Carte cadeau Amazon — shopping international',
    price: '1 800 HTG',
    presets: [10, 25, 50, 100],
    createdAt: null,
  },
  {
    id: 'default-apple-gift',
    name: 'Apple Gift Card',
    image: 'https://picsum.photos/seed/apple-gift/400/300',
    description: 'Carte cadeau Apple — App Store & iTunes',
    price: '2 000 HTG',
    presets: [15, 25, 50],
    createdAt: null,
  },
  {
    id: 'default-google-play',
    name: 'Google Play',
    image: 'https://picsum.photos/seed/google-play/400/300',
    description: 'Carte cadeau Google Play — apps & jeux Android',
    price: '1 600 HTG',
    presets: [10, 25, 50],
    createdAt: null,
  },
];

export const useCardTopups = () => {
  const [cards, setCards] = useState<CardTopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('admin-data-changed', handler);
    return () => window.removeEventListener('admin-data-changed', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = query(collection(db, 'card_topups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (cancelled) return;
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as CardTopup[];
      setCards(fetched);
      setLoading(false);
    }, async (_err) => {
      if (cancelled) return;
      try {
        const data = await adminGet('/api/admin/card-topups');
        if (!cancelled && data.cards) setCards(data.cards);
      } catch {}
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [refreshKey]);

  return { cards, loading };
};

export const saveCardTopup = async (cardData: Partial<CardTopup>, id?: string) => {
  await adminApi('POST', '/api/admin/card-topup', { ...cardData, ...(id && { id }) });
};

export const deleteCardTopup = async (id: string) => {
  await adminApi('DELETE', `/api/admin/card-topup/${id}`);
};

// ── Parcel Services ───────────────────────────────────────────────────────────
export const useParcels = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('admin-data-changed', handler);
    return () => window.removeEventListener('admin-data-changed', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = query(collection(db, 'parcels'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (cancelled) return;
      setParcels(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Parcel[]);
      setLoading(false);
    }, async (_err) => {
      if (cancelled) return;
      try {
        const data = await adminGet('/api/admin/parcels');
        if (!cancelled) setParcels(data.parcels || []);
      } catch {}
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [refreshKey]);

  return { parcels, loading };
};

export const searchParcel = async (trackingNumber: string): Promise<Parcel | null> => {
  // Try API first (works regardless of Firestore client rules)
  try {
    const res = await fetch(`/api/track/${encodeURIComponent(trackingNumber)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.parcel) return data.parcel as Parcel;
    }
  } catch {}
  // Fallback to client SDK
  try {
    const snap = await getDocs(query(collection(db, 'parcels'), where('trackingNumber', '==', trackingNumber)));
    if (snap.empty) return null;
    const docData = snap.docs[0];
    return { id: docData.id, ...docData.data() } as Parcel;
  } catch {
    return null;
  }
};

export const saveParcel = async (parcelData: Partial<Parcel>, id?: string) => {
  await adminApi('POST', '/api/admin/parcel', { ...parcelData, ...(id && { id }) });
};

export const deleteParcel = async (id: string) => {
  await adminApi('DELETE', `/api/admin/parcel/${id}`);
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

// ── Product Services ──────────────────────────────────────────────────────────
export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('admin-data-changed', handler);
    return () => window.removeEventListener('admin-data-changed', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (cancelled) return;
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]);
      setLoading(false);
    }, async (_err) => {
      if (cancelled) return;
      try {
        const data = await adminGet('/api/admin/products');
        if (!cancelled) setProducts(data.products || []);
      } catch {}
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [refreshKey]);

  return { products, loading };
};

export const saveProduct = async (productData: Partial<Product>, id?: string) => {
  await adminApi('POST', '/api/admin/product', { ...productData, ...(id && { id }) });
};

export const deleteProduct = async (id: string) => {
  await adminApi('DELETE', `/api/admin/product/${id}`);
};

// ── Game Services ─────────────────────────────────────────────────────────────
export const useGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('admin-data-changed', handler);
    return () => window.removeEventListener('admin-data-changed', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = query(collection(db, 'games'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (cancelled) return;
      setGames(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Game[]);
      setLoading(false);
    }, async (_err) => {
      if (cancelled) return;
      try {
        const data = await adminGet('/api/admin/games');
        if (!cancelled) setGames(data.games || []);
      } catch {}
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [refreshKey]);

  return { games, loading };
};

export const saveGame = async (gameData: Partial<Game>, id?: string) => {
  await adminApi('POST', '/api/admin/game', { ...gameData, ...(id && { id }) });
};

export const deleteGame = async (id: string) => {
  await adminApi('DELETE', `/api/admin/game/${id}`);
};

// ── Settings Singleton (one Firestore listener shared across all components) ───
let _settingsValue: AppSettings | null = null;
let _settingsLoading = true;
let _settingsSubscribers = new Set<() => void>();
let _settingsUnsubscribe: (() => void) | null = null;

function _notifySettings() {
  _settingsSubscribers.forEach(fn => fn());
}

function _startSettingsListener() {
  if (_settingsUnsubscribe) return;
  const docRef = doc(db, 'settings', 'global');
  _settingsUnsubscribe = onSnapshot(docRef, (snap) => {
    if (snap.exists()) _settingsValue = snap.data() as AppSettings;
    _settingsLoading = false;
    _notifySettings();
  }, async (err) => {
    try {
      const data = await adminGet('/api/admin/settings-data');
      if (data.settings) _settingsValue = data.settings as AppSettings;
    } catch {
      try { handleFirestoreError(err as any, 'get', 'settings/global', auth); } catch {}
    }
    _settingsLoading = false;
    _notifySettings();
  });
}

function _resetSettingsListener() {
  if (_settingsUnsubscribe) { _settingsUnsubscribe(); _settingsUnsubscribe = null; }
  _settingsLoading = true;
  _startSettingsListener();
}

export const useSettings = () => {
  const [, rerender] = useState(0);
  useEffect(() => {
    const update = () => rerender(n => n + 1);
    _settingsSubscribers.add(update);
    _startSettingsListener();
    const onAdminChange = () => { _resetSettingsListener(); update(); };
    window.addEventListener('admin-data-changed', onAdminChange);
    return () => {
      _settingsSubscribers.delete(update);
      window.removeEventListener('admin-data-changed', onAdminChange);
    };
  }, []);
  return { settings: _settingsValue, loading: _settingsLoading };
};

export const updateSettings = async (settingsData: Partial<AppSettings>) => {
  await adminApi('POST', '/api/admin/settings', settingsData);
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

// ── Slider Images Services ────────────────────────────────────────────────────
export const useSliderImages = () => {
  const [sliderImages, setSliderImages] = useState<{ id: string, url: string, title?: string, description?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('admin-data-changed', handler);
    return () => window.removeEventListener('admin-data-changed', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Use the server-side API (Admin SDK) — avoids the wrong-database issue
    // that occurs when using the client-side Firestore SDK with a named DB.
    fetch('/api/slider-images')
      .then(r => r.json())
      .then(data => { if (!cancelled) setSliderImages(data.images || []); })
      .catch(() => { if (!cancelled) setSliderImages([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  return { sliderImages, loading };
};

export const saveSliderImage = async (url: string, title?: string, description?: string) => {
  await adminApi('POST', '/api/admin/slider-image', { url, title: title || '', description: description || '' });
};

export const updateSliderImage = async (id: string, updates: { url?: string, title?: string, description?: string }) => {
  await adminApi('PUT', `/api/admin/slider-image/${id}`, updates);
};

export const deleteSliderImage = async (id: string) => {
  await adminApi('DELETE', `/api/admin/slider-image/${id}`);
};

// ── Shipping Services ─────────────────────────────────────────────────────────
export const useShippingConfigs = () => {
  const [configs, setConfigs] = useState<ShippingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('admin-data-changed', handler);
    return () => window.removeEventListener('admin-data-changed', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = collection(db, 'shipping_configs');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (cancelled) return;
      setConfigs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ShippingConfig[]);
      setLoading(false);
    }, async (_err) => {
      if (cancelled) return;
      try {
        const data = await adminGet('/api/admin/shipping-configs-list');
        if (!cancelled) setConfigs(data.configs || []);
      } catch {}
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [refreshKey]);

  return { configs, loading };
};

export const saveShippingConfig = async (configData: Partial<ShippingConfig>) => {
  await adminApi('POST', '/api/admin/shipping-config', configData);
};

export const deleteShippingConfig = async (id: string) => {
  await adminApi('DELETE', `/api/admin/shipping-config/${id}`);
};

// ── Online Sub-Services ────────────────────────────────────────────────────────
export const useOnlineServices = () => {
  const [services, setServices] = useState<OnlineSubService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('admin-data-changed', handler);
    return () => window.removeEventListener('admin-data-changed', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/online-sub-services')
      .then(r => r.json())
      .then(data => { if (!cancelled) { setServices(data.services || []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const forceRefresh = () => setRefreshKey(r => r + 1);
  return { services, loading, refresh: forceRefresh };
};

export const saveOnlineSubService = async (data: Partial<OnlineSubService>, id?: string) => {
  const payload = id ? { ...data, id } : data;
  const res = await fetch('/api/admin/online-sub-services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Erreur sauvegarde service'); }
  try { window.dispatchEvent(new Event('admin-data-changed')); } catch {}
};

export const deleteOnlineSubService = async (id: string) => {
  const res = await fetch(`/api/admin/online-sub-services/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-secret': ADMIN_SECRET },
  });
  if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Erreur suppression service'); }
  try { window.dispatchEvent(new Event('admin-data-changed')); } catch {}
};

// ── Formations (Admin CRUD via API) ───────────────────────────────────────────
export const useAdminFormations = () => {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('admin-data-changed', handler);
    return () => window.removeEventListener('admin-data-changed', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/admin/formations', { headers: { 'x-admin-secret': ADMIN_SECRET } })
      .then(r => r.json())
      .then(data => { if (!cancelled) { setFormations(data.formations || []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);
  return { formations, loading, refresh };
};

export const saveAdminFormation = async (data: Partial<Formation>, id?: string): Promise<void> => {
  const url = id ? `/api/admin/formations/${id}` : '/api/admin/formations';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || 'Erreur lors de la sauvegarde.');
  }
  try { window.dispatchEvent(new Event('admin-data-changed')); } catch {}
};

export const deleteAdminFormation = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/formations/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-secret': ADMIN_SECRET }
  });
  if (!res.ok) throw new Error('Erreur lors de la suppression.');
  try { window.dispatchEvent(new Event('admin-data-changed')); } catch {}
};
