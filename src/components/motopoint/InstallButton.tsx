import React, { useEffect, useState } from 'react';

const InstallButton: React.FC = () => {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const handler = () => setAvailable(true);
    window.addEventListener('pwa-available', handler as any);
    // If prompt already saved
    // @ts-ignore
    if (window.__deferredPwaPrompt) setAvailable(true);
    return () => window.removeEventListener('pwa-available', handler as any);
  }, []);

  const handleInstall = async () => {
    try {
      // @ts-ignore
      const promptEvent = window.__deferredPwaPrompt;
      if (!promptEvent) return;
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        console.log('PWA installed');
      }
      // clear
      // @ts-ignore
      window.__deferredPwaPrompt = null;
      setAvailable(false);
    } catch (e) {
      console.warn('install error', e);
    }
  };

  if (!available) return null;
  return (
    <button onClick={handleInstall} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg">
      Instalar aplicativo
    </button>
  );
};

export default InstallButton;
