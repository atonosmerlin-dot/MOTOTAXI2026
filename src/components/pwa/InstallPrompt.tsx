import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

const InstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Check if already installed preference is set? No, just show.
            // Maybe wait a few seconds or show only on specific pages.
            // For now, show immediately if not installed.
            setShow(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShow(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom border border-slate-700 bg-slate-900/95 backdrop-blur shadow-2xl rounded-xl p-4 text-white">
            <button onClick={() => setShow(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white">
                <X size={16} />
            </button>
            <div className="flex gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shrink-0">
                    <Download className="text-black" size={24} />
                </div>
                <div className="space-y-1">
                    <h4 className="font-semibold text-sm">Instalar MotoPoint</h4>
                    <p className="text-xs text-slate-400 leading-tight">
                        Adicione à tela inicial para acesso rápido e melhor performance.
                    </p>
                    <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2 h-8 text-xs bg-yellow-400 text-black hover:bg-yellow-500 w-full"
                        onClick={handleInstall}
                    >
                        Instalar Agora
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
