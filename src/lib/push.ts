import { supabase } from '@/integrations/supabase/client';

let cachedVapidKey: string | null = import.meta.env.VITE_VAPID_PUBLIC_KEY || null;

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      return reg;
    } catch (e) {
      console.warn('SW register failed', e);
      throw e;
    }
  }
  throw new Error('Service workers not supported');
}

async function getVapidPublicKey(): Promise<string> {
  if (cachedVapidKey) return cachedVapidKey;
  try {
    // Use a configurable backend base URL when the frontend is deployed to Pages
    const apiBase = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
    const url = apiBase ? `${apiBase}/api/vapid-public` : '/api/vapid-public';
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Could not fetch VAPID key');

    // Some hosts may return HTML (index.html) for unknown routes — detect that
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (json?.publicKey) {
        cachedVapidKey = json.publicKey;
        return cachedVapidKey;
      }
      throw new Error('Invalid VAPID response');
    } catch (parseErr) {
      // Fallback: use env-provided public key if available
      const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
      if (envKey) {
        cachedVapidKey = envKey;
        return cachedVapidKey;
      }
      console.warn('getVapidPublicKey received non-JSON response:', text?.slice?.(0,200));
      throw new Error('VAPID endpoint returned unexpected content');
    }
  } catch (e) {
    console.warn('getVapidPublicKey failed', e);
    throw e;
  }
}

export async function subscribeToPush(driverId?: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push not supported in this browser');
  }

  // Check existing permission
  const current = Notification.permission;
  if (current === 'denied') {
    throw new Error(
      'Notificações estão bloqueadas para este site.\n\n' +
      'Para habilitar:\n' +
      '1. Toque no ícone de cadeado (URL) no topo do navegador\n' +
      '2. Vá em "Site settings" ou "Configurações do site"\n' +
      '3. Procure por "Notifications" (Notificações)\n' +
      '4. Mude para "Allow" (Permitir)\n' +
      '5. Volte e tente novamente'
    );
  }

  // Ensure SW ready
  const reg = await navigator.serviceWorker.ready;

  // Only request permission on user gesture; caller should ensure this function is called after click.
  let permission = current;
  if (current === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    throw new Error('Permission not granted');
  }

  // Obtain VAPID key (from env or server)
  const vapid = await getVapidPublicKey();
  if (!vapid) throw new Error('VAPID public key not available');

  // Convert and subscribe
  const applicationServerKey = urlBase64ToUint8Array(vapid);
  let subscription: PushSubscription | null = null;
  try {
    subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
  } catch (e) {
    console.error('subscribe failed', e);
    throw e;
  }

  // Save subscription to DB (Supabase) - requires authentication context (driver)
  const payload = {
    driver_id: driverId || null,
    subscription: subscription.toJSON(),
    enabled: true
  } as any;

  try {
    await supabase.from('push_subscriptions').upsert(payload, { onConflict: ['driver_id'] });
  } catch (e) {
    console.warn('Could not upsert subscription to Supabase', e);
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId, subscription: subscription.toJSON() })
      });
    } catch (err) {
      console.warn('fallback subscribe POST failed', err);
    }
  }

  return subscription;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function unsubscribePush(driverId?: string) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    if (driverId) {
      await supabase.from('push_subscriptions').delete().eq('driver_id', driverId);
    }
  } catch (e) {
    console.warn('unsubscribe error', e);
  }
}

export default { registerServiceWorker, subscribeToPush, unsubscribePush };
