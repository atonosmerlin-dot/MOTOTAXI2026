import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useManifest } from '@/hooks/useManifest';
import { useMyDriver, useToggleDriverStatus } from '@/hooks/useDrivers';
import { usePendingRequests, useMyActiveRequest, useAcceptRideRequest, useCompleteRideRequest, useRejectRideRequest, useProposePrice, useUpdateRidePrice, RideRequest } from '@/hooks/useRideRequests';
import { useDriverStats } from '@/hooks/useDriverStats';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LogOut, MapPin, Navigation, CheckCircle, Loader2, X, ChevronRight, DollarSign, Wallet, User, Map, Power, MessageCircle, QrCode, Copy } from 'lucide-react';
import RideChat from '@/components/motopoint/RideChat';
import useWakeLock from '@/hooks/useWakeLock';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from "react-qr-code";
import { Pix } from '@/lib/pix';

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const DriverDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  useManifest('/manifest-driver.json');

  const { data: myDriver, isLoading: driverLoading, refetch: refetchDriver } = useMyDriver(user?.id);
  const { data: stats } = useDriverStats(myDriver?.id);
  const { data: pendingRequests = [], refetch: refetchPending } = usePendingRequests(myDriver?.id);
  const { data: myActiveRequest, refetch: refetchActive } = useMyActiveRequest(myDriver?.id);

  const toggleStatus = useToggleDriverStatus();
  const proposePrice = useProposePrice();
  const updatePrice = useUpdateRidePrice();
  const completeRequest = useCompleteRideRequest();
  const rejectRequest = useRejectRideRequest();

  const isOnline = myDriver?.is_online;
  useWakeLock(!!isOnline);

  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [proposalPrice, setProposalPrice] = useState('');

  // UI State
  const [showWallet, setShowWallet] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Pix Config State
  const [pixKey, setPixKey] = useState('');
  const [pixType, setPixType] = useState('cpf');
  const [savingPix, setSavingPix] = useState(false);

  // Pix Payment State
  const [pixPayload, setPixPayload] = useState('');
  const [manualPrice, setManualPrice] = useState('');

  // Load Pix settings
  useEffect(() => {
    if (myDriver) {
      if (myDriver.pix_key) setPixKey(myDriver.pix_key);
      if (myDriver.pix_key_type) setPixType(myDriver.pix_key_type as string);
    }
  }, [myDriver]);

  // Push Notifications
  const { subscribe: requestPushPermission, permission } = usePushNotifications(myDriver?.id);

  useEffect(() => {
    if (myDriver?.id && permission === 'default' && isOnline) {
      requestPushPermission();
    }
  }, [myDriver?.id, permission, isOnline]);

  // Geolocation Sync
  useEffect(() => {
    let watchId: number | null = null;
    let lastUpdate = 0;

    if (!isOnline || !myDriver?.id) return;

    const updateLocation = async (lat: number, lng: number) => {
      const now = Date.now();
      if (now - lastUpdate < 10000) return;
      lastUpdate = now;

      try {
        await supabase.from('drivers').update({
          current_latitude: lat,
          current_longitude: lng,
          last_location_update: new Date().toISOString()
        }).eq('id', myDriver.id);
      } catch (e) {
        console.error('Error syncing location', e);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude } = pos.coords;
        setDriverCoords({ lat: latitude, lng: longitude });
        updateLocation(latitude, longitude);
      }, () => { }, { enableHighAccuracy: true });

      watchId = navigator.geolocation.watchPosition(pos => {
        const { latitude, longitude } = pos.coords;
        setDriverCoords({ lat: latitude, lng: longitude });
        updateLocation(latitude, longitude);
      }, () => { }, { enableHighAccuracy: true, maximumAge: 15000 });
    }
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [isOnline, myDriver?.id]);

  // Realtime Listener
  useEffect(() => {
    if (!myDriver?.id || !myDriver.is_online) return;
    const channel = supabase.channel('ride_requests_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ride_requests', filter: `status=eq.pending` },
        (payload: any) => {
          const newRequest = payload.new;
          if (newRequest.status === 'pending') {
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            toast.success(`🎯 Nova corrida!`, { description: newRequest.point_name });
            refetchPending();
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [myDriver?.id, isOnline]);

  // Listen for unread messages (Driver)
  useEffect(() => {
    if (!myActiveRequest) return;
    if (showChat) setUnreadCount(0);

    const channel = supabase.channel(`chat-notify-driver-${myActiveRequest.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_messages',
        filter: `ride_id=eq.${myActiveRequest.id}`
      },
        (payload: any) => {
          if (payload.new.sender_role === 'client' && !showChat) {
            setUnreadCount(prev => prev + 1);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            toast.info('Nova mensagem do Passageiro', { position: 'top-center' });
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myActiveRequest?.id, showChat]);

  // Generate Pix Payload when Payment Dialog opens
  useEffect(() => {
    if (showPayment && myActiveRequest && myDriver?.pix_key) {
      const amount = Number(myActiveRequest.price || 0);
      if (amount > 0) {
        try {
          // Use lib to generate payload
          const payload = Pix.payload(
            myDriver.pix_key,
            profile?.name || 'Motorista',
            'Brasil', // City hardcoded or ideally from profile 
            amount,
            `RIDE${myActiveRequest.id.substring(0, 8)}`
          );
          setPixPayload(payload);
        } catch (e) {
          console.error('Pix gen error', e);
        }
      }
    }
  }, [showPayment, myActiveRequest, myDriver]);

  const handleToggleOnline = async () => {
    try {
      await toggleStatus.mutateAsync({ driverId: myDriver.id, isOnline: !isOnline });
      if (!isOnline) requestPushPermission();
      toast(isOnline ? 'Você está offline' : 'Você está online!', {
        description: isOnline ? 'Desconectado do sistema' : 'Pronto para receber corridas',
        duration: 2000,
        className: isOnline ? 'bg-red-900 border-red-800 text-white' : 'bg-green-900 border-green-800 text-white'
      });
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleSendProposal = async (reqId: string) => {
    const price = Number(proposalPrice.replace(',', '.'));
    if (isNaN(price) || price <= 0) return toast.error('Valor inválido');
    try {
      await proposePrice.mutateAsync({ requestId: reqId, driverId: myDriver.id, price });
      toast.success('Proposta enviada!');
      setExpandedRequestId(null);
      setProposalPrice('');
    } catch (error) {
      toast.error('Erro ao enviar proposta');
    }
  };

  const handleComplete = async () => {
    if (!myActiveRequest) return;
    if (!confirm('Finalizar esta corrida e receber pagamento?')) return;
    await completeRequest.mutateAsync({ requestId: myActiveRequest.id, driverId: myDriver.id });
    await refetchActive();
    toast.success('Corrida finalizada!');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/driver/login');
  };

  const handleSavePix = async () => {
    if (!pixKey.trim()) return toast.error('Informe a chave Pix');
    setSavingPix(true);
    try {
      const { error } = await supabase.from('drivers').update({
        pix_key: pixKey,
        pix_key_type: pixType
      }).eq('id', myDriver.id);

      if (error) throw error;
      toast.success('Chave Pix salva!');
      refetchDriver(); // Update local data
    } catch (e) {
      toast.error('Erro ao salvar chave Pix');
      console.error(e);
    } finally {
      setSavingPix(false);
    }
  };

  const openMaps = (lat?: number | null, lng?: number | null) => {
    if (lat && lng) window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  if (authLoading || driverLoading) return <div className="flex bg-slate-900 h-screen items-center justify-center"><Loader2 className="animate-spin text-yellow-400 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-yellow-500/30 text-slate-100 flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 py-3 px-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-300 font-bold overflow-hidden">
            {profile?.photo_url ? <img src={profile.photo_url} className="w-full h-full object-cover" /> : (profile?.name?.charAt(0) || 'D')}
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">
              {profile?.name?.split(' ')[0] || 'Motorista'}
            </h1>
            <div className="flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500 shadow-[0_0_5px_currentColor]" : "bg-slate-500")} />
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="bg-slate-800/50 hover:bg-slate-800 text-yellow-400 border border-yellow-400/20 rounded-full px-3 gap-2 h-9"
            onClick={() => setShowWallet(true)}
          >
            <Wallet size={16} />
            <span className="font-bold">Carteira</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 space-y-6 max-w-md mx-auto w-full">
        {/* Toggle Online */}
        {!myActiveRequest && (
          <motion.div layout className="flex justify-center">
            <button
              // ... same button ...
              onClick={handleToggleOnline}
              className={cn(
                "group relative flex items-center gap-4 px-6 py-3 rounded-full border transition-all duration-300 shadow-lg active:scale-95 w-full max-w-xs justify-center",
                isOnline
                  ? "bg-gradient-to-r from-emerald-900/60 to-emerald-800/60 border-emerald-500/50 shadow-emerald-500/10"
                  : "bg-slate-900 border-slate-700 hover:border-slate-700"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                isOnline
                  ? "bg-emerald-500 border-white/20 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                  : "bg-slate-800 border-slate-600 text-slate-500"
              )}>
                <Power size={20} />
              </div>
              <div className="text-left">
                <h2 className={cn("text-lg font-bold leading-none mb-0.5", isOnline ? "text-white" : "text-slate-400")}>
                  {isOnline ? 'ESTOU ONLINE' : 'FICAR ONLINE'}
                </h2>
                <p className={cn("text-xs", isOnline ? "text-emerald-400" : "text-slate-600")}>
                  {isOnline ? 'Recebendo chamadas...' : 'Toque para iniciar'}
                </p>
              </div>
            </button>
          </motion.div>
        )}

        {/* --- ACTIVE RIDE --- */}
        <AnimatePresence>
          {isOnline && myActiveRequest && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.1)] overflow-hidden"
            >
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Navigation size={18} className="animate-bounce" />
                  <span className="font-bold tracking-wide text-sm">EM ANDAMENTO</span>
                </div>
                <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg">
                  <span className="text-[10px] text-indigo-200 uppercase font-bold mr-1">Valor</span>
                  <span className="font-bold text-white">R$ {Number(myActiveRequest.price || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Locations: Same as before */}
                <div className="space-y-6 relative pl-2">
                  <div className="absolute left-5 top-2 bottom-6 w-0.5 bg-slate-800" />
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-slate-800 border-4 border-slate-900 flex items-center justify-center z-10">
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Origem</p>
                        <h3 className="text-sm font-bold text-white">{myActiveRequest.point?.name}</h3>
                      </div>
                      <button
                        onClick={() => openMaps(myActiveRequest.client_latitude, myActiveRequest.client_longitude)}
                        className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors border border-slate-700"
                      >
                        <Map size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-indigo-500 border-4 border-slate-900 flex items-center justify-center z-10">
                      <MapPin size={10} className="text-white" />
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider mb-0.5">Destino</p>
                        <h3 className="text-sm font-bold text-white">{myActiveRequest.destination_address || 'A combinar'}</h3>
                      </div>
                      <button
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(myActiveRequest.destination_address || '')}`, '_blank')}
                        className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors border border-slate-700"
                      >
                        <MapPin size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/50 rounded-xl p-3 flex items-center justify-between gap-3 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{myActiveRequest.client_name}</p>
                      <p className="text-xs text-slate-500">Passageiro</p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    className={cn(
                      "rounded-full transition-all relative w-11 h-11",
                      unreadCount > 0
                        ? "bg-indigo-600 text-white animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
                    )}
                    onClick={() => setShowChat(true)}
                  >
                    <MessageCircle size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900 animate-bounce" />
                    )}
                  </Button>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    onClick={() => setShowPayment(true)}
                    className="h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2"
                  >
                    <QrCode size={18} />
                    Cobrar Pix
                  </Button>
                  <Button
                    onClick={handleComplete}
                    className="h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl"
                  >
                    Finalizar
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => rejectRequest.mutate({ requestId: myActiveRequest.id, driverId: myDriver.id })}
                  className="w-full text-red-400 hover:bg-red-500/10 rounded-xl h-10"
                >
                  Cancelar Corrida
                </Button>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending Requests List logic (omitted logic change, just render) */}
        {isOnline && !myActiveRequest && pendingRequests.length > 0 && (
          <div className="space-y-4">
            {/* Same Pending Request Mapping */}
            {pendingRequests.map((req: RideRequest) => (
              // ... (Previous Code for Pending Requests)
              <motion.div key={req.id} layoutId={req.id} onClick={() => setExpandedRequestId(expandedRequestId === req.id ? null : req.id)} className={cn("relative bg-slate-900 border transition-all duration-300 overflow-hidden cursor-pointer", expandedRequestId === req.id ? "rounded-3xl border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.1)] my-4" : "rounded-xl border-slate-800 hover:border-slate-700 hover:bg-slate-800/40")}>
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3 w-full">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-yellow-400 shrink-0 border border-slate-700">
                        <User size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-white text-base truncate">{req.client_name || 'Cliente'}</h4>
                            <div className="flex items-center gap-1 text-xs text-yellow-500 font-bold mt-0.5">
                              {driverCoords && req.client_latitude && req.client_longitude && (
                                <span>
                                  {getDistanceFromLatLonInKm(
                                    driverCoords.lat,
                                    driverCoords.lng,
                                    req.client_latitude,
                                    req.client_longitude
                                  ).toFixed(1)} km até ele
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="bg-slate-800 px-2 py-1 rounded text-[10px] text-slate-400 font-mono uppercase">
                            #{req.id.substring(0, 4)}
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 shadow-[0_0_5px_currentColor]" />
                            <div className="flex-1">
                              <p className="text-[10px] uppercase text-slate-500 font-bold leading-none mb-0.5">Origem</p>
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-slate-300 leading-tight">
                                  {req.client_location_address || req.point?.name || 'Localização do cliente'}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openMaps(req.client_latitude, req.client_longitude);
                                  }}
                                  className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors border border-slate-700 shrink-0"
                                  title="Ver no mapa"
                                >
                                  <Map size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 shadow-[0_0_5px_currentColor]" />
                            <div>
                              <p className="text-[10px] uppercase text-slate-500 font-bold leading-none mb-0.5">Destino</p>
                              <p className="text-sm text-slate-300 leading-tight">{req.destination_address || 'A combinar'}</p>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                  {/* Expanded Content */}
                  <AnimatePresence>
                    {expandedRequestId === req.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="mt-4 pt-4 border-t border-slate-800 space-y-4">
                        <div className="flex gap-2">
                          <input type="number" inputMode="decimal" placeholder="0.00" className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-3 text-center text-white font-bold h-12" value={proposalPrice} onChange={e => setProposalPrice(e.target.value)} onClick={e => e.stopPropagation()} />
                          <Button className="flex-1 bg-yellow-400 text-slate-900 font-bold rounded-xl h-12" onClick={(e) => { e.stopPropagation(); handleSendProposal(req.id); }}>Enviar Proposta</Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {isOnline && !myActiveRequest && pendingRequests.length === 0 && (
          <div className="mt-20 text-center opacity-40">
            <Loader2 size={32} className="mx-auto text-slate-500 animate-spin mb-3" />
            <p className="text-slate-400 text-sm">Aguardando chamadas...</p>
          </div>
        )}

      </main>

      {/* Wallet Dialog */}
      <Dialog open={showWallet} onOpenChange={setShowWallet}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[90%] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Minha Carteira</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            {/* Stats Only */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <p className="text-3xl font-bold text-white">{stats?.todayRides || 0}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Corridas Hoje</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <p className="text-3xl font-bold text-yellow-400">4.9</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Avaliação</p>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-6">
              <h3 className="text-left text-sm font-bold text-white mb-4 flex items-center gap-2">
                <QrCode size={16} className="text-emerald-400" />
                Configurar Recebimento Pix
              </h3>
              <div className="space-y-3">
                <div className="text-left space-y-1">
                  <label className="text-xs text-slate-400">Tipo de Chave</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none appearance-none"
                    value={pixType}
                    onChange={(e) => setPixType(e.target.value)}
                  >
                    <option value="cpf">CPF</option>
                    <option value="phone">Celular</option>
                    <option value="email">E-mail</option>
                    <option value="random">Chave Aleatória</option>
                  </select>
                </div>
                <div className="text-left space-y-1">
                  <label className="text-xs text-slate-400">Chave Pix</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none placeholder:text-slate-600"
                    placeholder={pixType === 'cpf' ? '000.000.000-00' : 'Sua chave pix'}
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleSavePix}
                  disabled={savingPix}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl h-11 mt-2"
                >
                  {savingPix ? <Loader2 className="animate-spin" /> : 'Salvar Chave Pix'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog (Pix) */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[90%] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode size={20} className="text-indigo-400" />
              Receber com Pix
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Mostre o QR Code para o passageiro
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center py-4 space-y-6">
            {!myDriver?.pix_key ? (
              <div className="text-center py-4">
                <p className="text-red-400 mb-2 font-medium">Chave Pix não cadastrada</p>
                <Button onClick={() => { setShowPayment(false); setShowWallet(true); }} variant="outline" className="border-slate-700 text-white">
                  Cadastrar agora
                </Button>
              </div>
            ) : (
              <>
                {pixPayload ? (
                  <div className="bg-white p-4 rounded-xl shadow-lg shadow-indigo-500/10">
                    <QRCode value={pixPayload} size={200} />
                  </div>
                ) : (
                  <div className="w-[232px] h-[232px] bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-700">
                    {Number(myActiveRequest?.price || 0) === 0 ? 'Informe o valor' : 'Gerando QR Code...'}
                  </div>
                )}

                <div className="text-center w-full max-w-[200px]">
                  <p className="text-sm text-slate-400 mb-1">Valor a receber</p>
                  {Number(myActiveRequest?.price || 0) > 0 ? (
                    <p className="text-3xl font-bold text-white">R$ {Number(myActiveRequest?.price || 0).toFixed(2)}</p>
                  ) : (
                    <div className="relative flex gap-2 w-full">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">R$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xl font-bold text-white focus:border-indigo-500 focus:outline-none text-center"
                          value={manualPrice}
                          onChange={(e) => setManualPrice(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={async () => {
                          const p = Number(manualPrice.replace(',', '.'));
                          if (p > 0) {
                            try {
                              await updatePrice.mutateAsync({ requestId: myActiveRequest?.id || '', driverId: myDriver?.id || '', price: p });
                              toast.success('Valor salvo!');
                              refetchActive();
                            } catch (e) { toast.error('Erro ao salvar valor'); }
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl aspect-square p-0 w-12 h-12 flex items-center justify-center shrink-0"
                      >
                        <CheckCircle size={20} />
                      </Button>
                    </div>
                  )}
                </div>

                {pixPayload && (
                  <div className="w-full relative">
                    <input
                      readOnly
                      value={pixPayload}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-12 py-3 text-xs text-slate-400 font-mono truncate"
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(pixPayload); toast.success('Código Pix copiado!'); }}
                      className="absolute right-2 top-2 bottom-2 px-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[95%] max-w-md rounded-2xl p-0 overflow-hidden h-[70vh] flex flex-col">
          <DialogHeader className="p-4 bg-slate-900 border-b border-slate-800">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <MessageCircle size={16} />
              </div>
              Chat com Passageiro
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {myActiveRequest && (
              <RideChat rideId={myActiveRequest.id} currentUserRole="driver" className="h-full" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default DriverDashboard;
