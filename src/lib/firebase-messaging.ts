import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import app from './firebase';

let _messaging: Messaging | null = null;

function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  if (_messaging) return _messaging;
  try {
    _messaging = getMessaging(app);
    return _messaging;
  } catch (e) {
    console.warn('[FCM] Firebase Messaging indisponible:', e);
    return null;
  }
}

export async function getFCMToken(): Promise<string | null> {
  const vapidKey = process.env.FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn('[FCM] FIREBASE_VAPID_KEY non configuré — notifications FCM désactivées.');
    return null;
  }
  const m = getFirebaseMessaging();
  if (!m) return null;
  try {
    if (!('Notification' in window)) return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const reg = await navigator.serviceWorker.ready;
    const token = await getToken(m, { vapidKey, serviceWorkerRegistration: reg });
    return token || null;
  } catch (e) {
    console.warn('[FCM] getToken échoué:', e);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void): () => void {
  const m = getFirebaseMessaging();
  if (!m) return () => {};
  return onMessage(m, callback);
}
