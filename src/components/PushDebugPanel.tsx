import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, XCircle, RefreshCw, Bell } from 'lucide-react';
import { toast } from 'sonner';

export const PushDebugPanel: React.FC = () => {
  const [status, setStatus] = useState<any>({
    swRegistered: false,
    swUrl: '',
    permissionGranted: false,
    subscriptionExists: false,
    subscriptionEndpoint: '',
    error: null,
  });
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const newStatus: any = {
        error: null,
      };

      // 1. Check Service Worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration('/');
          newStatus.swRegistered = !!registration;
          if (registration) {
            newStatus.swUrl = registration.scope;
          }
        } catch (e) {
          newStatus.swRegistered = false;
          console.error('[DEBUG] Erro ao buscar SW:', e);
        }
      } else {
        newStatus.error = 'Service Worker não suportado';
      }

      // 2. Check Permission
      if ('Notification' in window) {
        newStatus.permissionGranted = Notification.permission === 'granted';
      }

      // 3. Check Subscription
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          newStatus.subscriptionExists = !!subscription;
          if (subscription) {
            const json = subscription.toJSON();
            newStatus.subscriptionEndpoint = json.endpoint?.substring(0, 50) + '...';
          }
        } catch (e) {
          console.error('[DEBUG] Erro ao buscar subscription:', e);
        }
      }

      setStatus(newStatus);
    } finally {
      setLoading(false);
    }
  };

  // Check status on mount
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Atualiza a cada 5s
    return () => clearInterval(interval);
  }, []);

  const sendTestNotification = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;

      // Simula um push notification
      await registration.showNotification('🧪 Teste de Notificação!', {
        body: 'Esta é uma notificação de teste. Se viu isso, notificações estão funcionando!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test-notification',
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300, 100, 300],
        actions: [
          { action: 'dismiss', title: '✓ Fechar' }
        ]
      });

      toast.success('✓ Notificação de teste enviada!');
      console.log('[DEBUG] Notificação de teste enviada');
    } catch (error) {
      toast.error('Erro ao enviar notificação de teste: ' + (error as any).message);
      console.error('[DEBUG] Erro ao enviar teste:', error);
    }
  };

  const StatusRow = ({ label, value, ok }: any) => (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-600">{value}</span>
        {ok === true && <CheckCircle2 size={16} className="text-green-600" />}
        {ok === false && <XCircle size={16} className="text-red-600" />}
        {ok === null && <AlertCircle size={16} className="text-yellow-600" />}
      </div>
    </div>
  );

  return (
    <>
      {/* Botão Flutuante para Abrir Debug */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="fixed bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
        title="Debug Panel"
      >
        <Bell size={20} />
      </button>

      {/* Panel */}
      {showPanel && (
        <div className="fixed bottom-20 right-4 w-80 bg-white rounded-lg shadow-2xl border border-slate-300 z-50 p-4">
          <h3 className="text-lg font-bold mb-4 text-slate-900">🔧 Push Debug Panel</h3>

          {/* Status */}
          <div className="space-y-2 mb-4">
            <StatusRow
              label="Service Worker"
              value={status.swRegistered ? '✓ Ativo' : '✗ Inativo'}
              ok={status.swRegistered}
            />
            <StatusRow
              label="Permissão"
              value={status.permissionGranted ? '✓ Concedida' : '✗ Negada'}
              ok={status.permissionGranted}
            />
            <StatusRow
              label="Subscription"
              value={status.subscriptionExists ? '✓ Salva' : '✗ Não salva'}
              ok={status.subscriptionExists}
            />
            {status.subscriptionEndpoint && (
              <div className="p-2 bg-slate-100 rounded text-xs text-slate-600 break-all">
                {status.subscriptionEndpoint}
              </div>
            )}
            {status.error && (
              <div className="p-2 bg-red-100 text-red-700 rounded text-xs">
                ⚠️ {status.error}
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="space-y-2">
            <button
              onClick={checkStatus}
              disabled={loading}
              className="w-full px-3 py-2 bg-slate-600 text-white text-sm rounded hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Atualizar Status
            </button>

            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const registration = await navigator.serviceWorker.ready;
                  const sub = await registration.pushManager.getSubscription();
                  if (sub) await sub.unsubscribe();
                  toast.info('Antiga inscrição removida. Teste agora "Ficar Online".');
                  await checkStatus();
                } catch (e) {
                  toast.error('Erro ao limpar: ' + (e as any).message);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              🔄 Forçar Re-inscrição
            </button>

            <button
              onClick={sendTestNotification}
              disabled={!status.permissionGranted || !status.subscriptionExists}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🧪 Notificação de Teste
            </button>

            <button
              onClick={() => setShowPanel(false)}
              className="w-full px-3 py-2 bg-slate-400 text-white text-sm rounded hover:bg-slate-500"
            >
              Fechar
            </button>
          </div>

          {/* Instruções */}
          <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-900 border border-blue-200">
            <p className="font-bold mb-2">📝 Checklist:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Service Worker deve estar ✓ Ativo</li>
              <li className={status.permissionGranted ? '' : 'text-red-600 font-bold'}>
                Permissão deve estar ✓ Concedida
              </li>
              <li>Subscription deve estar ✓ Salva</li>
            </ul>

            {!status.permissionGranted && (
              <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-red-800 animate-pulse">
                <p className="font-bold mb-1">⚠️ Como Resetar Permissão:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Clique no 🔒 (cadeado) ou ⚙️ ao lado da URL</li>
                  <li>Mude "Notificações" de Bloquear para **Permitir**</li>
                  <li>Recarregue a página (F5)</li>
                </ol>
              </div>
            )}

            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-blue-900">
              <p className="font-bold text-sm mb-1">🦊 Dica Firefox Android:</p>
              <p className="text-xs mb-2">Para receber com a tela desligada:</p>
              <ol className="list-decimal list-inside text-xs space-y-1">
                <li>Configurações do Celular &gt; Aplicativos &gt; Firefox</li>
                <li>**Bateria** &gt; Mude para **"Sem Restrições"**</li>
                <li>Permissões &gt; Remova "Pausar se não usado"</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PushDebugPanel;
