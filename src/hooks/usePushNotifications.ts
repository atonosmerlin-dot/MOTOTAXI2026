import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(driverId?: string) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      if (driverId) {
        checkExistingSubscription(driverId);
      }
    }
  }, [driverId]);

  const checkExistingSubscription = async (id: string) => {
    try {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('driver_id', id)
        .eq('enabled', true)
        .single();
      setIsSubscribed(!!data);
    } catch (error) {
      console.warn('[PUSH] Error checking subscription:', error);
    }
  };

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;
    return registration;
  };

  const subscribe = useCallback(async () => {
    console.log('[PUSH] Subscribe called - driverId:', driverId, 'isSupported:', isSupported);
    
    if (!isSupported) {
      console.error('[PUSH] Push not supported');
      toast.error('Seu navegador não suporta notificações push');
      return false;
    }

    if (!driverId) {
      console.error('[PUSH] Missing driverId:', driverId);
      toast.error('ID do motorista não encontrado');
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission
      console.log('[PUSH] Requesting notification permission...');
      const perm = await Notification.requestPermission();
      console.log('[PUSH] Permission result:', perm);
      setPermission(perm);

      if (perm !== 'granted') {
        console.warn('[PUSH] Permission not granted:', perm);
        toast.error('Permissão de notificação negada');
        return false;
      }

      // Register service worker
      console.log('[PUSH] Registering service worker...');
      const registration = await registerServiceWorker();
      console.log('[PUSH] Service worker registered:', registration);

      if (!VAPID_PUBLIC_KEY) {
        throw new Error('VAPID public key não configurada');
      }

      // Subscribe to push
      console.log('[PUSH] Creating push subscription...');
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });
      console.log('[PUSH] Push subscription created:', subscription);

      // Save subscription to database
      const subscriptionJson = subscription.toJSON();
      
      console.log('[PUSH] Saving to database - driverId:', driverId);
      console.log('[PUSH] Subscription JSON:', subscriptionJson);
      
      // Use UPSERT to atomically update or insert (avoids race condition)
      console.log('[PUSH] Upserting subscription...');
      const { data, error: dbError } = await supabase
        .from('push_subscriptions')
        .upsert({
          driver_id: driverId,
          subscription: subscriptionJson,
          enabled: true
        }, {
          onConflict: 'driver_id'
        });

      console.log('[PUSH] Upsert response - data:', data, 'error:', dbError);

      if (dbError) {
        console.error('[PUSH] Database error:', dbError);
        throw dbError;
      }
      
      console.log('[PUSH] ✅ Subscription saved successfully');
      setIsSubscribed(true);
      toast.success('✅ Notificações ativadas!');
      return true;
    } catch (error) {
      console.error('[PUSH] Error subscribing:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao ativar notificações');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, driverId]);

  const unsubscribe = useCallback(async () => {
    if (!driverId) {
      toast.error('ID do motorista não encontrado');
      return false;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Disable in database instead of deleting
      await supabase
        .from('push_subscriptions')
        .update({ enabled: false })
        .eq('driver_id', driverId);

      setIsSubscribed(false);
      toast.success('Notificações desativadas');
      return true;
    } catch (error) {
      console.error('[PUSH] Error unsubscribing:', error);
      toast.error('Erro ao desativar notificações');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [driverId]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe
  };
}
