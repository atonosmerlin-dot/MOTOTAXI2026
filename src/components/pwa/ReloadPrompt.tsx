import React from 'react';
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const ReloadPrompt: React.FC = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: any) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error: any) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (needRefresh) {
        return (
            <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center p-4">
                <div className="bg-slate-900 border border-slate-700 text-white p-4 rounded-lg shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom">
                    <div className="space-y-1">
                        <h4 className="font-medium text-sm">Nova versão disponível</h4>
                        <p className="text-xs text-slate-400">Clique para atualizar e ver as novidades.</p>
                    </div>
                    <Button size="sm" onClick={() => updateServiceWorker(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
                        <RefreshCw size={14} /> Atualizar
                    </Button>
                </div>
            </div>
        );
    }

    return null;
};

export default ReloadPrompt;
