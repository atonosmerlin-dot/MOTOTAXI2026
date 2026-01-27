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
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    
    console.log('[PUSH-INIT] Support check:', {
      'serviceWorker': 'serviceWorker' in navigator,
      'PushManager': 'PushManager' in window,
      'Notification': 'Notification' in window,
      supported
    });
    
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      console.log('[PUSH-INIT] Current notification permission:', Notification.permission);
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
      console.log('[PUSH] Subscription check - exists:', !!data);
    } catch (error) {
      console.warn('[PUSH] Error checking subscription:', error);
    }
  };

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    console.log('[PUSH] Attempting to register SW at /sw.js');
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('[PUSH] SW registered - scope:', registration.scope);
    
    // Listener para mensagens do SW
    navigator.serviceWorker.onmessage = (event) => {
      console.log('[PUSH-MESSAGE] Received from SW:', event.data);
      if (event.data.type === 'PUSH_SHOWN') {
        console.log('[PUSH-MESSAGE] ✅ Push notification shown:', event.data);
      } else if (event.data.type === 'PUSH_ERROR') {
        console.error('[PUSH-MESSAGE] ❌ Push notification error:', event.data);
      }
    };
    
    await navigator.serviceWorker.ready;
    setSwRegistration(registration);
    return registration;
  };

  const subscribe = useCallback(async () => {
    console.log('[PUSH] ============ SUBSCRIBE INICIADO ============');
    console.log('[PUSH] driverId:', driverId, 'isSupported:', isSupported);

    if (!isSupported) {
      console.error('[PUSH] ❌ Push not supported on this browser');
      toast.error('Seu navegador não suporta notificações push');
      return false;
    }

    if (!driverId) {
      console.error('[PUSH] ❌ Missing driverId');
      toast.error('ID do motorista não encontrado');
      return false;
    }

    setIsLoading(true);

    try {
      // Step 1: Request permission
      console.log('[PUSH] Step 1️⃣: Requesting notification permission...');
      const perm = await Notification.requestPermission();
      console.log('[PUSH] Permission result:', perm);
      setPermission(perm);

      if (perm !== 'granted') {
        console.warn('[PUSH] ❌ Permission not granted:', perm);
        toast.error('Permissão de notificação negada. Verifique as configurações do navegador.');
        return false;
      }
      console.log('[PUSH] ✅ Permission granted');

      // Step 2: Register service worker
      console.log('[PUSH] Step 2️⃣: Registering service worker...');
      const registration = await registerServiceWorker();
      console.log('[PUSH] ✅ Service worker registered');

      if (!VAPID_PUBLIC_KEY) {
        throw new Error('VAPID public key não configurada no .env');
      }
      console.log('[PUSH] ✅ VAPID key configured');

      // Step 3: Create push subscription
      console.log('[PUSH] Step 3️⃣: Creating push subscription...');
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      // Try to clear existing subscription if it exists
      try {
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          console.log('[PUSH] ⚠️ Clearing old subscription...');
          await existingSub.unsubscribe();
          console.log('[PUSH] ✅ Old subscription cleared');
        }
      } catch (e) {
        console.warn('[PUSH] Warning clearing old sub:', e);
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
      
      console.log('[PUSH] ✅ Push subscription created');
      console.log('[PUSH] Subscription endpoint:', subscription.endpoint?.substring(0, 80) + '...');
      console.log('[PUSH] Subscription keys:', {
        p256dh: subscription.getKey('p256dh') ? 'present' : 'missing',
        auth: subscription.getKey('auth') ? 'present' : 'missing'
      });

      // Step 4: Save to database
      console.log('[PUSH] Step 4️⃣: Saving subscription to database...');
      const { data: existing, error: fetchError } = await supabase
        .from('push_subscriptions' as any)
        .select('*')
        .eq('driver_id', driverId)
        .maybeSingle();

      if (fetchError) {
        console.error('[PUSH] ❌ Fetch error:', fetchError);
        throw fetchError;
      }

      if (existing) {
        console.log('[PUSH] 📝 Updating existing subscription in DB...');
        const { error: updateError } = await supabase
          .from('push_subscriptions' as any)
          .update({
            subscription: JSON.stringify(subscription),
            enabled: true,
            updated_at: new Date().toISOString()
          })
          .eq('driver_id', driverId);

        if (updateError) {
          console.error('[PUSH] ❌ Database update error:', updateError);
          throw updateError;
        }
        console.log('[PUSH] ✅ Subscription updated in DB');
      } else {
        console.log('[PUSH] 🆕 Saving new subscription to DB...');
        const { error: insertError } = await supabase
          .from('push_subscriptions' as any)
          .insert({
            driver_id: driverId,
            subscription: JSON.stringify(subscription),
            enabled: true
          });

        if (insertError) {
          console.error('[PUSH] ❌ Database insert error:', insertError);
          throw insertError;
        }
        console.log('[PUSH] ✅ New subscription saved to DB');
      }

      console.log('[PUSH] ============ ✅ SUBSCRIBE COMPLETO ============');
      setIsSubscribed(true);
      toast.success('✅ Notificações push ativadas com sucesso!');
      return true;
    } catch (error) {
      console.error('[PUSH] ============ ❌ SUBSCRIBE FALHOU ============');
      console.error('[PUSH] Error details:', error);
      
      const errorMsg = error instanceof Error ? error.message : 'Erro ao ativar notificações';
      toast.error(errorMsg);
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
