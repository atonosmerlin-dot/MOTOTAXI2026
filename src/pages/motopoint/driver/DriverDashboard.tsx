import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/motopoint/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useManifest } from '@/hooks/useManifest';
import { useMyDriver, useToggleDriverStatus } from '@/hooks/useDrivers';
import { usePendingRequests, useMyActiveRequest, useAcceptRideRequest, useCompleteRideRequest, useRejectRideRequest, useProposePrice } from '@/hooks/useRideRequests';
import Button from '@/components/motopoint/Button';
import { Power, MapPin, Navigation, CheckCircle, Loader2, Bell } from 'lucide-react';
import useWakeLock from '@/hooks/useWakeLock';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import PushDebugPanel from '@/components/PushDebugPanel';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const DriverDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isDriver, loading: authLoading } = useAuth();
  
  useManifest('/manifest-driver.json');
  
  const { data: myDriver, isLoading: driverLoading } = useMyDriver(user?.id);
  const { data: pendingRequests = [], refetch: refetchPending } = usePendingRequests(myDriver?.id);
  const { data: myActiveRequest, refetch: refetchActive } = useMyActiveRequest(myDriver?.id);
  
  const toggleStatus = useToggleDriverStatus();
  const acceptRequest = useAcceptRideRequest();
  const proposePrice = useProposePrice();
  const completeRequest = useCompleteRideRequest();
  const rejectRequest = useRejectRideRequest();

  const isOnline = myDriver?.is_online;

  // Keep screen awake while driver is online (if supported)
  useWakeLock(!!isOnline);

  const [driverCoords, setDriverCoords] = useState<{lat:number;lng:number} | null>(null);

  // Use the new push notifications hook
  const { subscribe: requestPushPermission, isLoading: isPushLoading, permission } = usePushNotifications(myDriver?.id);

  // Debug: Log when myDriver changes
  useEffect(() => {
    console.log('[DRIVER-DASH] myDriver updated:', myDriver?.id);
  }, [myDriver?.id]);

  // Auto-request notification permission on page load (like GPS)
  useEffect(() => {
    if (!myDriver?.id || permission !== 'default') return;
    
    const timer = setTimeout(() => {
      console.log('[PUSH-AUTO] Auto-requesting notification permission...');
      requestPushPermission();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [myDriver?.id, permission, requestPushPermission]);

  useEffect(() => {
    let watchId: number | null = null;
    if (!isOnline) return;
    // try to get current position once and optionally watch updates
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(pos => {
        setDriverCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {}, { enableHighAccuracy: true });
      try {
        watchId = navigator.geolocation.watchPosition(pos => {
          setDriverCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }, () => {}, { enableHighAccuracy: true, maximumAge: 15000 });
      } catch (e) {}
    }
    return () => {
      if (watchId != null && 'geolocation' in navigator) navigator.geolocation.clearWatch(watchId);
    };
  }, [isOnline]);

  // Desligar motorista quando sair da página
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (myDriver?.id && isOnline) {
        console.log('[DRIVER] Desligando motorista ao sair...');
        try {
          await supabase
            .from('drivers')
            .update({ is_online: false })
            .eq('id', myDriver.id);
        } catch (e) {
          console.warn('[DRIVER] Erro ao desligar:', e);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Também chamar ao desmontar
      handleBeforeUnload();
    };
  }, [myDriver?.id, isOnline]);

  // Validação de autenticação
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/driver/login');
    }
  }, [user, authLoading, navigate]);

  // Validação de registro de motorista
  useEffect(() => {
    if (!authLoading && !driverLoading && user && !isDriver) {
      toast.error('Você não está cadastrado como motorista.');
      navigate('/');
    }
  }, [user, isDriver, authLoading, driverLoading, navigate]);

  // Realtime listener para novas corridas
  useEffect(() => {
    if (!myDriver?.id || !myDriver.is_online) return;

    const channel = supabase
      .channel('ride_requests_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_requests',
          filter: `status=eq.pending`
        },
        (payload: any) => {
          const newRequest = payload.new;
          
          // Se a corrida foi direcionada para este motorista, notificar
          if (newRequest.driver_id === myDriver.id) {
            if (navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
            toast.success(`🎯 Novo chamado em ${newRequest.point_id}!`, {
              duration: 5000,
            });
            
            // Disparar notificação simples do browser
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🚨 Nova Corrida!', {
                body: 'Você recebeu uma nova solicitação de corrida',
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'ride-notification',
                requireInteraction: true,
                vibrate: [100, 50, 100]
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `status=eq.accepted`
        },
        (payload: any) => {
          console.log('🚗 Corrida foi aceita:', payload);
          const acceptedRequest = payload.new;
          
          // Mostrar para todos os motoristas que uma corrida foi aceita
          if (acceptedRequest.driver_id && acceptedRequest.driver_id !== myDriver.id) {
            toast.info(`ℹ️ Uma solicitação foi aceita por outro motorista`, {
              duration: 3000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myDriver?.id, myDriver?.is_online]);

  // Retornar loader se ainda carregando
  if (authLoading || driverLoading) {
    return (
      <Layout title="Motorista">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </Layout>
    );
  }

  if (!user || !myDriver) return null;
  const haversine = (lat1:number, lon1:number, lat2:number, lon2:number) => {
    const toRad = (v:number) => v * Math.PI / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleToggleOnline = async () => {
    try {
      await toggleStatus.mutateAsync({ driverId: myDriver.id, isOnline: !isOnline });
      
      // Se o motorista está FICANDO ONLINE, inscrever para notificações push
      if (!isOnline) {
        console.log('[DRIVER] Motorista ficou online, inscrevendo para push...');
        try {
          await requestPushPermission();
        } catch (pushError) {
          console.warn('[DRIVER] Falha ao inscrever para push:', pushError);
          // Não falha - apenas avisa
        }
      }
      
      toast.success(isOnline ? 'Você está offline' : 'Você está online!');
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleEnablePush = async () => {
    if (permission === 'granted') {
      toast.info('Notificações já estão ativadas ✅');
      return;
    }
    if (permission === 'denied') {
      toast.error('Notificações bloqueadas nas configurações do navegador');
      return;
    }
    await requestPushPermission();
  };

  const handleAccept = async (reqId: string) => {
    try {
      const input = window.prompt('Informe o valor proposto para a corrida (ex: 12.50)');
      if (!input) return;
      const price = Number(input.replace(',', '.'));
      if (isNaN(price) || price <= 0) return toast.error('Valor inválido');
      await proposePrice.mutateAsync({ requestId: reqId, driverId: myDriver.id, price });
      if (navigator.vibrate) navigator.vibrate(200);
      toast.success('Proposta enviada ao usuário');
    } catch (error) {
      console.error('Erro ao propor preço:', error);
      toast.error('Erro ao propor preço');
    }
  };

  const handleComplete = async () => {
    if (!myActiveRequest) return;
    try {
      await completeRequest.mutateAsync({ requestId: myActiveRequest.id, driverId: myDriver.id });
      await refetchActive();
      await refetchPending();
      toast.success('Corrida finalizada!');
    } catch (error) {
      toast.error('Erro ao finalizar corrida');
    }
  };

  const handleReject = async () => {
    if (!myActiveRequest) return;
    try {
      await rejectRequest.mutateAsync({ requestId: myActiveRequest.id, driverId: myDriver.id });
      await refetchActive();
      await refetchPending();
      toast.success('Corrida rejeitada');
    } catch (error) {
      toast.error('Erro ao rejeitar corrida');
    }
  };

  return (
    <Layout title={`Olá, ${profile?.name || 'Motorista'}`}>
      <PushDebugPanel />
      
      {/* Online/Offline Toggle */}
      <div className="mb-8">
        <div 
          onClick={handleToggleOnline}
          className={`
            relative overflow-hidden rounded-2xl p-6 flex items-center justify-between cursor-pointer transition-all duration-300 shadow-lg
            ${isOnline ? 'bg-green-500 text-white' : 'bg-primary text-muted-foreground'}
          `}
        >
          <div>
            <h2 className="text-2xl font-bold">{isOnline ? 'Você está ONLINE' : 'Você está OFFLINE'}</h2>
            <p className={`text-sm ${isOnline ? 'text-green-100' : 'text-muted-foreground'}`}>
              {isOnline ? 'Recebendo chamadas' : 'Fique online para trabalhar'}
            </p>
          </div>
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center transition-all
            ${isOnline ? 'bg-white/20' : 'bg-black/20'}
          `}>
            <Power size={32} color={isOnline ? 'white' : 'gray'} />
          </div>
        </div>
      </div>

        <div className="flex justify-end mb-6">
          <button
            onClick={handleEnablePush}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            title="Ativar notificações"
          >
            <Bell size={18} />
          </button>
        </div>

      {/* Active Job View */}
      {isOnline && myActiveRequest && (
        <div className="bg-card rounded-2xl p-6 shadow-xl border-l-4 border-blue-500 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded mb-2 inline-block">CORRIDA ATUAL</span>
              <h3 className="text-2xl font-bold">{myActiveRequest.point?.name || 'Ponto'}</h3>
              <p className="text-muted-foreground text-sm">Ponto de Embarque</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
              <Navigation size={24} />
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-foreground">
              <MapPin className="text-muted-foreground" />
              <div>
                <div className="font-medium">{myActiveRequest.point?.name}</div>
                <div className="text-sm text-muted-foreground">{myActiveRequest.point?.address}</div>
                {/* zone/price removed - only show point info */}
              </div>
            </div>
            {myActiveRequest.point?.latitude != null && myActiveRequest.point?.longitude != null && (
              <div className="flex items-center gap-3">
                <button
                  className="px-3 py-2 rounded-lg bg-primary/10"
                  onClick={() => {
                    const lat = myActiveRequest.point!.latitude;
                    const lng = myActiveRequest.point!.longitude;
                    const url = `https://www.google.com/maps?q=${lat},${lng}`;
                    window.open(url, '_blank');
                  }}
                >Abrir no mapa</button>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline"
              fullWidth 
              onClick={handleReject} 
              disabled={rejectRequest.isPending}
            >
              {rejectRequest.isPending ? 'Rejeitando...' : 'Rejeitar'}
            </Button>
            <Button 
              fullWidth 
              onClick={handleComplete} 
              disabled={completeRequest.isPending}
            >
              <CheckCircle size={20} /> {completeRequest.isPending ? 'Finalizando...' : 'Finalizar'}
            </Button>
          </div>
        </div>
      )}

      {/* Request List */}
      {isOnline && !myActiveRequest && (
        <div>
          <h3 className="font-bold text-muted-foreground mb-4 text-sm uppercase tracking-wider">Chamadas Disponíveis</h3>
          
          <div className="space-y-4">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-card p-5 rounded-2xl shadow-sm border border-border relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
                
                {/* Ponto */}
                <div className="flex justify-between items-start mb-4 pl-2">
                  <div>
                    <h4 className="font-bold text-lg">{req.point?.name || 'Ponto'}</h4>
                    <p className="text-sm text-muted-foreground">{req.point?.address}</p>
                    <div className="text-xs text-muted-foreground mt-1">Ponto fixo</div>
                    {driverCoords && req.point?.latitude != null && req.point?.longitude != null && (
                      <div className="text-xs text-muted-foreground mt-1">{Math.round(haversine(driverCoords.lat, driverCoords.lng, req.point.latitude, req.point.longitude))} m de você</div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-xl">—</span>
                  </div>
                </div>

                {/* Informações do Cliente */}
                <div className="space-y-2 mb-4 pl-2 pb-4 border-b text-sm">
                  {req.client_name && (
                    <p><span className="font-medium">👤 Cliente:</span> {req.client_name}</p>
                  )}
                  {req.destination_address && (
                    <p><span className="font-medium">📍 Destino:</span> {req.destination_address}</p>
                  )}
                  {req.client_whatsapp && (
                    <a 
                      href={`https://wa.me/55${req.client_whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline text-sm"
                    >
                      <span className="font-medium">💬 WhatsApp:</span> {req.client_whatsapp}
                    </a>
                  )}
                </div>

                <div className="pl-2">
                  <div className="flex gap-3">
                    {req.point?.latitude != null && req.point?.longitude != null && (
                      <button
                        onClick={() => {
                          const lat = req.point!.latitude;
                          const lng = req.point!.longitude;
                          const google = `https://www.google.com/maps?q=${lat},${lng}`;
                          const waze = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
                          // open choice: prefer Google in web, but open Waze if user wants
                          window.open(google, '_blank');
                        }}
                        className="py-2 px-3 rounded-lg border border-border text-sm bg-white/50"
                      >Ver no mapa</button>
                    )}
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={async () => {
                        try {
                          await rejectRequest.mutateAsync({ requestId: req.id, driverId: myDriver!.id });
                          await refetchPending();
                          toast.success('Corrida rejeitada');
                        } catch (e) {
                          toast.error('Erro ao rejeitar');
                        }
                      }}
                      disabled={rejectRequest.isPending}
                    >
                      {rejectRequest.isPending ? 'Rejeitando...' : 'Rejeitar'}
                    </Button>
                    <Button 
                      fullWidth 
                      onClick={() => handleAccept(req.id)}
                      disabled={acceptRequest.isPending}
                    >
                      {acceptRequest.isPending ? 'Aceitando...' : 'Aceitar Corrida'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {pendingRequests.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <MapPin className="text-muted-foreground" size={32} />
                </div>
                <p className="text-muted-foreground">Procurando corridas...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default DriverDashboard;
