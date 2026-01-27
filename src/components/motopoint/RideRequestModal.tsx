import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Loader2, CheckCircle, Navigation, ChevronRight, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateRideRequest } from '@/hooks/useRideRequests';
import { motion, AnimatePresence } from 'framer-motion';

interface RideRequestModalProps {
  open: boolean;
  onClose: () => void;
  pointId: string;
  pointName: string;
}

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string | null;
}

const RideRequestModal: React.FC<RideRequestModalProps> = ({
  open,
  onClose,
  pointId,
}) => {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [locationData, setLocationData] = useState<LocationData>({
    latitude: null,
    longitude: null,
    accuracy: null,
    address: null
  });
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'location' | 'confirm'>('form');
  const [clientId] = useState(() => {
    const stored = localStorage.getItem('motopoint_client_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('motopoint_client_id', newId);
    return newId;
  });

  const createRequest = useCreateRideRequest();

  const handleRequestLocation = async () => {
    setIsRequestingLocation(true);
    setLocationError(null);

    // Simulate a "scanning" delay for effect
    await new Promise(r => setTimeout(r, 800));

    if (!navigator.geolocation) {
      setLocationError('Geolocalização não suportada neste navegador');
      setIsRequestingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        setLocationData({
          latitude,
          longitude,
          accuracy,
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        });

        setIsRequestingLocation(false);
        setStep('confirm');

        try {
          // Simple reverse geocoding attempt
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (response.ok) {
            const data = await response.json();
            const address = data.address?.road || data.address?.city;
            if (address) {
              setLocationData(prev => ({ ...prev, address }));
            }
          }
        } catch (e) {
          // Ignore bg error
        }
      },
      (error) => {
        let errorMsg = 'Erro ao obter localização';
        if (error.code === error.PERMISSION_DENIED) errorMsg = 'Permissão negada. Ative o GPS.';
        setLocationError(errorMsg);
        setIsRequestingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmitRequest = async () => {
    if (!clientName.trim() || !destinationAddress.trim()) return;

    try {
      const mockDist = Math.random() * 4 + 1;
      const estPrice = Math.max(6, 5 + (mockDist * 2));

      await createRequest.mutateAsync({
        pointId: '550e8400-e29b-41d4-a716-446655440000',
        pointName: "Chamada Direta",
        clientId,
        clientName: clientName.trim(),
        destinationAddress: destinationAddress.trim(),
        clientWhatsapp: clientWhatsapp.trim() || null,
        clientLatitude: locationData.latitude!,
        clientLongitude: locationData.longitude!,
        clientAccuracy: locationData.accuracy,
        clientLocationAddress: locationData.address
      });

      toast.success(`Chamada enviada! Aprox. R$ ${estPrice.toFixed(2)}`);
      handleCancel();
      navigate('/point/direct');
    } catch (error) {
      toast.error('Erro ao chamar mototáxi. Tente novamente.');
    }
  };

  const handleCancel = () => {
    setClientName('');
    setDestinationAddress('');
    setClientWhatsapp('');
    setLocationData({ latitude: null, longitude: null, accuracy: null, address: null });
    setStep('form');
    setLocationError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="relative p-6 pb-2 z-10">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-white tracking-tight">Chamar Mototáxi</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-slate-400">Preencha os dados e confirme sua localização.</p>
            </div>

            {/* Steps Content */}
            <div className="p-6 pt-4 flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {step === 'form' && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <User size={12} /> Seu Nome
                      </label>
                      <input
                        type="text"
                        placeholder="Como devemos te chamar?"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <MapPin size={12} /> Destino
                      </label>
                      <input
                        type="text"
                        placeholder="Para onde você vai?"
                        value={destinationAddress}
                        onChange={e => setDestinationAddress(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Phone size={12} /> WhatsApp <span className="text-slate-600 normal-case tracking-normal">(Opcional)</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={clientWhatsapp}
                        onChange={e => setClientWhatsapp(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
                      />
                    </div>

                    <button
                      onClick={() => setStep('location')}
                      disabled={!clientName.trim() || !destinationAddress.trim()}
                      className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                      Continuar <ChevronRight size={18} />
                    </button>
                  </motion.div>
                )}

                {step === 'location' && (
                  <motion.div
                    key="location"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col items-center justify-center py-8 text-center space-y-6"
                  >
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center animate-pulse">
                        <div className="w-16 h-16 rounded-full bg-indigo-500/30 flex items-center justify-center">
                          <Navigation size={32} className="text-indigo-400" />
                        </div>
                      </div>
                      {isRequestingLocation && (
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/50 animate-ping" />
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white">Localização Atual</h3>
                      <p className="text-sm text-slate-400 max-w-[200px] mx-auto mt-1">
                        Precisamos saber onde você está para enviar o motorista.
                      </p>
                    </div>

                    {locationError && (
                      <p className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                        {locationError}
                      </p>
                    )}

                    <button
                      onClick={handleRequestLocation}
                      disabled={isRequestingLocation}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      {isRequestingLocation ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Obtendo GPS...
                        </>
                      ) : (
                        <>
                          <MapPin size={20} />
                          Compartilhar Localização
                        </>
                      )}
                    </button>

                    <button onClick={() => setStep('form')} className="text-sm text-slate-500 hover:text-white transition-colors">
                      Voltar e editar dados
                    </button>
                  </motion.div>
                )}

                {step === 'confirm' && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle size={20} />
                      </div>
                      <div>
                        <p className="text-emerald-400 font-bold text-sm">Localização Confirmada</p>
                        <p className="text-emerald-500/70 text-xs">Precisão de {Number(locationData.accuracy).toFixed(0)} metros</p>
                      </div>
                    </div>

                    <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-4">
                      <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-semibold">Passageiro</p>
                          <p className="text-white font-medium">{clientName}</p>
                        </div>
                        <User size={16} className="text-slate-600" />
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-semibold">Destino</p>
                          <p className="text-white font-medium">{destinationAddress}</p>
                        </div>
                        <MapPin size={16} className="text-slate-600" />
                      </div>
                    </div>

                    <button
                      onClick={handleSubmitRequest}
                      disabled={createRequest.isPending}
                      className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      {createRequest.isPending ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <>
                          Confirmar e Chamar
                          <ChevronRight size={20} />
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RideRequestModal;
