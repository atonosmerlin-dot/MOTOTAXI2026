import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFixedPoint } from '@/hooks/useFixedPoints';
import { useClientActiveRequest, useCreateRideRequest, useRespondProposal } from '@/hooks/useRideRequests';
import { MapPin, Clock, Star, Phone, Loader2, ArrowLeft, Shield, Navigation, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import RideChat from '@/components/motopoint/RideChat';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// --- Subcomponents ---

const AcceptProposalButton: React.FC<{ proposalId: string }> = ({ proposalId }) => {
  const mutation = useRespondProposal();
  const handle = async () => {
    try {
      await mutation.mutateAsync({ proposalId, response: 'accepted' });
      toast.success('Proposta aceita! Motorista a caminho.');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao aceitar proposta');
    }
  };
  return (
    <button
      onClick={handle}
      disabled={mutation.isPending}
      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
    >
      {mutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : 'Aceitar'}
    </button>
  );
};

const RejectProposalButton: React.FC<{ proposalId: string }> = ({ proposalId }) => {
  const mutation = useRespondProposal();
  const handle = async () => {
    try {
      await mutation.mutateAsync({ proposalId, response: 'rejected' });
      toast.info('Proposta recusada');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao recusar proposta');
    }
  };
  return (
    <button
      onClick={handle}
      disabled={mutation.isPending}
      className="px-4 py-3 bg-slate-800 text-slate-300 hover:text-white font-medium rounded-xl hover:bg-slate-700 transition-colors"
    >
      {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Recusar'}
    </button>
  );
};

// --- Main Component ---

const ClientPointView: React.FC = () => {
  const { pointId } = useParams<{ pointId: string }>();
  const navigate = useNavigate();

  const { data: point, isLoading: pointLoading } = useFixedPoint(pointId);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  // Client ID Management
  const [clientId] = useState(() => {
    const stored = localStorage.getItem('motopoint_client_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('motopoint_client_id', newId);
    return newId;
  });

  const { data: activeRequest, isLoading: requestLoading } = useClientActiveRequest(clientId, pointId || 'direct');
  const [hadActiveRequest, setHadActiveRequest] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Reset unread when chat opens
  useEffect(() => {
    if (showChat) setUnreadCount(0);
  }, [showChat]);

  // Listen for unread messages
  useEffect(() => {
    if (!activeRequest || activeRequest.status !== 'accepted') return;

    const channel = supabase.channel(`chat-notify-${activeRequest.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_messages',
        filter: `ride_id=eq.${activeRequest.id}`
      },
        (payload: any) => {
          // If message is from DRIVER and chat is NOT open
          if (payload.new.sender_role === 'driver' && !showChat) {
            setUnreadCount(prev => prev + 1);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            toast.info('Nova mensagem do motorista', { position: 'top-center' });
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeRequest?.id, showChat]);

  // Handle ride finish - REMOVED RatingModal, just notify and redirect
  useEffect(() => {
    if (activeRequest) {
      setHadActiveRequest(true);
    } else if (hadActiveRequest && !activeRequest) {
      // Finished
      toast.success('Corrida finalizada.');
      const newClientId = crypto.randomUUID();
      localStorage.setItem('motopoint_client_id', newClientId);
      navigate('/motopoint/client');
    }
  }, [activeRequest, hadActiveRequest, navigate]);

  const handleImageError = (id: string) => {
    setBrokenImages(prev => new Set([...prev, id]));
  };

  // Logic
  const isDirectCall = pointId === 'direct';
  const displayPointName = isDirectCall ? 'Chamada Direta' : point?.name;

  if (pointLoading || requestLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-400" size={32} />
      </div>
    );
  }

  // --- Render Functions ---

  const renderStatus = () => {
    // 1. Searching / Pending
    if (activeRequest?.status === 'pending') {
      const proposals = (activeRequest as any)?.proposals || [];

      if (proposals.length > 0) {
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">Propostas Recebidas</h2>
              <p className="text-slate-400">Escolha a melhor oferta para você</p>
            </div>

            <div className="space-y-4">
              {proposals.map((p: any) => (
                <div key={p.id} className="bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl p-5 shadow-xl">
                  {/* Driver Header */}
                  <div className="flex items-center gap-4 mb-4">
                    {brokenImages.has(`proposal-driver-${p.id}`) ? (
                      <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xl">
                        {p.driver?.profile?.name?.charAt(0).toUpperCase() || 'M'}
                      </div>
                    ) : (
                      <img
                        src={p.driver?.profile?.photo_url || `https://via.placeholder.com/100`}
                        alt="Motorista"
                        className="w-14 h-14 rounded-full object-cover border-2 border-slate-600"
                        onError={() => handleImageError(`proposal-driver-${p.id}`)}
                      />
                    )}
                    <div>
                      <h4 className="font-bold text-lg text-white">{p.driver?.profile?.name || 'Motorista'}</h4>
                      <div className="flex items-center text-xs text-slate-400 gap-1">
                        <span>{p.driver?.moto_model || 'Moto'}</span>
                        <span>•</span>
                        <div className="flex items-center text-yellow-400">
                          <Star size={10} fill="currentColor" /> 4.9
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex justify-between items-center mb-5 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 text-sm">Valor da corrida</span>
                    <span className="text-3xl font-bold text-emerald-400">R$ {Number(p.price).toFixed(2)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <RejectProposalButton proposalId={p.id} />
                    <AcceptProposalButton proposalId={p.id} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      }

      // Waiting for proposals
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="relative mb-8">
            <div className="w-32 h-32 bg-yellow-400/10 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-24 h-24 bg-yellow-400/20 rounded-full flex items-center justify-center">
                <Clock size={40} className="text-yellow-400 animate-spin-slow" />
              </div>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-yellow-400/30 animate-ping" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Procurando motoristas...</h2>
          <p className="text-slate-400 text-center max-w-xs mx-auto mb-8">
            Aguarde enquanto notificamos os mototáxis próximos a {displayPointName}.
          </p>

          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50">
            <Shield size={14} className="text-emerald-400" />
            <span className="text-xs text-slate-400">Conexão segura e criptografada</span>
          </div>
        </div>
      );
    }

    // 2. Accepted / On the way
    if (activeRequest?.status === 'accepted') {
      const driver = activeRequest.driver;
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 mb-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-3 text-emerald-400">
              <Navigation size={24} />
            </div>
            <h3 className="text-xl font-bold text-emerald-400">Motorista a Caminho!</h3>
            <p className="text-emerald-500/70 text-sm">Aguarde no local combinado</p>
          </div>

          {driver && (
            <div className="w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              {/* Driver Avatar */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  {brokenImages.has('driver-photo') ? (
                    <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 font-bold text-3xl mb-3">
                      {driver.profile?.name?.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <img
                      src={driver.profile?.photo_url}
                      className="w-24 h-24 rounded-full object-cover border-4 border-slate-600 shadow-xl mb-3"
                      onError={() => handleImageError('driver-photo')}
                    />
                  )}
                  <div className="absolute bottom-3 right-0 bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <Star size={10} fill="currentColor" /> 4.9
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white">{driver.profile?.name}</h2>
                <p className="text-slate-400 text-sm">{driver.moto_brand} {driver.moto_model} • {driver.moto_plate}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowChat(true)}
                  className={cn(
                    "relative py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                    unreadCount > 0
                      ? "bg-indigo-600 text-white animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                      : "bg-slate-700 hover:bg-slate-600 text-white"
                  )}
                >
                  <MessageCircle size={18} />
                  Mensagem
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <a href={`tel:${driver.phone_number || ''}`} className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                  <Phone size={18} /> Ligar
                </a>
              </div>
            </div>
          )}
        </motion.div>
      );
    }

    // 3. No active request (Wait mode or finished)
    return (
      <div className="text-center py-20 px-6">
        <h2 className="text-2xl font-bold text-white mb-2">Nenhuma corrida ativa</h2>
        <p className="text-slate-400 mb-8">Deseja solicitar um novo mototáxi?</p>
        <button
          onClick={() => navigate('/motopoint/client')}
          className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 px-8 py-3 rounded-full font-bold transition-all hover:scale-105"
        >
          Voltar para o Início
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-black text-slate-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/motopoint/client')} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-lg">{displayPointName || 'MotoPoint'}</h1>
        <div className="w-8" />
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {renderStatus()}
        </AnimatePresence>
      </main>

      {/* Chat Dialog */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[95%] max-w-md rounded-2xl p-0 overflow-hidden h-[70vh] flex flex-col">
          <DialogHeader className="p-4 bg-slate-900 border-b border-slate-800">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle size={18} className="text-emerald-400" />
              Chat com Motorista
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {activeRequest && (
              <RideChat rideId={activeRequest.id} currentUserRole="client" className="h-full" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientPointView;
