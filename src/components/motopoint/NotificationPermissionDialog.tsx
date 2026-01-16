import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Smartphone, Settings, CheckCircle, Copy } from 'lucide-react';
import { useState } from 'react';

interface NotificationPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  permissionState: 'denied' | 'default' | 'granted';
  onRetry?: () => void;
}

export function NotificationPermissionDialog({
  isOpen,
  onClose,
  permissionState,
  onRetry
}: NotificationPermissionDialogProps) {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, step: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="text-orange-500" />
            Habilitar Notificações de Corridas
          </DialogTitle>
          <DialogDescription>
            Receba alertas em tempo real quando um cliente solicitar uma corrida
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {permissionState === 'denied' && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <AlertCircle size={18} />
                Notificações Bloqueadas
              </h3>
              <p className="text-red-800 text-sm mb-4">
                As notificações foram bloqueadas para este site. Siga os passos abaixo para reativar:
              </p>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="bg-white p-3 rounded border border-red-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-2">Abra as configurações do site</p>
                      <p className="text-xs text-gray-600 mb-2">
                        Toque no ícone de cadeado 🔒 que aparece antes da URL no navegador.
                      </p>
                      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'%3E%3Crect fill='%23f0f0f0' width='200' height='60' rx='4'/%3E%3Ctext x='10' y='35' font-size='12' fill='%23666'%3E🔒 motopoint.online%3C/text%3E%3C/svg%3E" alt="URL with lock icon" className="w-full max-w-sm rounded border border-gray-300" />
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white p-3 rounded border border-red-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-2">Toque em "Site settings" ou "Configurações do site"</p>
                      <p className="text-xs text-gray-600">
                        Procure pelo texto "Site settings" ou "Configurações do site" no menu que aparece.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white p-3 rounded border border-red-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-2">Procure por "Notifications" ou "Notificações"</p>
                      <p className="text-xs text-gray-600">
                        Role pela lista de permissões até encontrar "Notifications".
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-white p-3 rounded border border-red-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      4
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-2">Mude para "Allow" ou "Permitir"</p>
                      <p className="text-xs text-gray-600 mb-2">
                        Toque na opção que estava "Block" ou "Bloqueado" e mude para "Allow" ou "Permitir".
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="bg-white p-3 rounded border border-red-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      5
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-2">Volte e tente novamente</p>
                      <p className="text-xs text-gray-600">
                        Feche este menu e toque no botão de sino 🔔 novamente para ativar notificações.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded mt-4">
                <p className="text-xs text-blue-900">
                  <strong>Dica:</strong> Se mesmo assim as notificações não funcionarem, tente limpar os dados do site:
                  Chrome → Configurações → Privacidade → Limpar dados do navegador → selecione este site.
                </p>
              </div>
            </div>
          )}

          {permissionState === 'default' && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Smartphone size={18} />
                Pronto para Ativar
              </h3>
              <p className="text-blue-800 text-sm">
                Clique no botão abaixo para ativar notificações. Um diálogo aparecerá pedindo permissão.
              </p>
            </div>
          )}

          {permissionState === 'granted' && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle size={18} />
                Notificações Ativadas
              </h3>
              <p className="text-green-800 text-sm">
                Você receberá alertas quando clientes solicitarem corridas. Mantenha a permissão ativada em suas
                configurações do navegador.
              </p>
            </div>
          )}

          {permissionState === 'denied' && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
              <p className="text-xs text-yellow-900 font-medium mb-2">🔍 Precisa de ajuda para encontrar as configurações?</p>
              <p className="text-xs text-yellow-800 mb-3">
                Abra o Chrome e vá em: <strong>Configurações → Privacidade e segurança → Configurações de site → Notificações</strong>
              </p>
              <p className="text-xs text-yellow-800">
                Procure por <code className="bg-white px-1 rounded text-xs">motopoint.online</code> ou seu domínio e mude de "Bloqueado" para "Permitir".
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {permissionState === 'denied' && (
            <Button onClick={onRetry} className="bg-red-600 hover:bg-red-700">
              Tentar Novamente
            </Button>
          )}
          {permissionState === 'default' && onRetry && (
            <Button onClick={onRetry} className="bg-green-600 hover:bg-green-700">
              Ativar Notificações
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
