import { useEffect } from 'react';

/**
 * Hook para adicionar um manifest específico para PWA
 * Cada página pode chamar isso para registrar seu próprio manifest
 */
export function useManifest(manifestPath: string) {
  useEffect(() => {
    // Remove o manifest antigo se houver
    const existing = document.querySelector('link[rel="manifest"]');
    if (existing) {
      existing.remove();
    }

    // Cria e adiciona o novo manifest link
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestPath;
    document.head.appendChild(link);

    // Reload the service worker manifest
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Trigger a check for updates
        registration.update();
      });
    }

    return () => {
      // Cleanup: remove the manifest link when component unmounts
      if (link.parentNode === document.head) {
        document.head.removeChild(link);
      }
    };
  }, [manifestPath]);
}
