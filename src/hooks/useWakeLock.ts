import { useEffect, useRef } from 'react';

/**
 * Hook to request a screen wake lock while `enabled` is true.
 * Uses the Screen Wake Lock API when available and re-requests on
 * visibilitychange. No external deps. Returns nothing.
 */
export function useWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const isSupported = 'wakeLock' in navigator;

    async function requestWakeLock() {
      if (!mounted) return;
      if (!isSupported) return;
      try {
        // @ts-ignore
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        // Re-request if released unexpectedly
        wakeLockRef.current.addEventListener?.('release', () => {
          // If still enabled, try to re-request on next visibilitychange
          console.debug('WakeLock released');
        });
        console.debug('WakeLock acquired');
      } catch (err) {
        console.warn('WakeLock request failed', err);
        wakeLockRef.current = null;
      }
    }

    function releaseWakeLock() {
      try {
        if (wakeLockRef.current && wakeLockRef.current.release) {
          wakeLockRef.current.release();
        }
      } catch (e) {
        // ignore
      } finally {
        wakeLockRef.current = null;
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible' && enabled) {
        // re-request when tab/window becomes visible
        requestWakeLock();
      }
    }

    if (enabled) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      releaseWakeLock();
    };
  }, [enabled]);
}

export default useWakeLock;
