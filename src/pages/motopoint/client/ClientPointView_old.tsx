import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/motopoint/Layout';
import { useFixedPoint } from '@/hooks/useFixedPoints';
import { useOnlineDrivers } from '@/hooks/useDrivers';
import { useClientActiveRequest, useCreateRideRequest } from '@/hooks/useRideRequests';
import Button from '@/components/motopoint/Button';
import { MapPin, Clock, Star, Phone, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Driver } from '@/hooks/useDrivers';

const ClientPointView: React.FC = () => {
  const { pointId } = useParams<{ pointId: string }>();
  const navigate = useNavigate();
  
  const { data: point, isLoading: pointLoading } = useFixedPoint(pointId);
  const [showClientForm, setShowClientForm] = useState(false);
  
  // Estados do formulário
  const [clientName, setClientName] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  
  // Gerar ID de cliente anônimo
  const [clientId] = useState(() => {
    const stored = localStorage.getItem('motopoint_client_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('motopoint_client_id', newId);
    return newId;
  });

  const { data: activeRequest, isLoading: requestLoading } = useClientActiveRequest(clientId, pointId);
  const createRequest = useCreateRideRequest();

  if (pointLoading || requestLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </Layout>
    );
  }

  if (!point) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <MapPin className="text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Ponto não encontrado</h2>
          <p className="text-muted-foreground mb-6">Este QR code parece inválido ou o ponto foi removido.</p>
          <Button onClick={() => navigate('/client')}>Tentar Novamente</Button>
        </div>
      </Layout>
    );
  }

  const handleRequestRide = async (driverId?: string) => {
    if (!clientName.trim() || !destinationAddress.trim()) {
      toast.error('Por favor, preencha nome e endereço de destino');
      return;
    }

    try {
      const data: any = { 
        pointId: point.id, 
        clientId,
        clientName: clientName.trim(),
        destinationAddress: destinationAddress.trim(),
        clientWhatsapp: clientWhatsapp.trim() || null
      };
      await createRequest.mutateAsync(data);
      toast.success('Mototáxi chamado! Aguarde confirmação.');
      setShowClientForm(false);
      setClientName('');
      setDestinationAddress('');
      setClientWhatsapp('');
    } catch (error) {
      console.error('Erro ao chamar mototáxi:', error);
      toast.error('Erro ao chamar mototáxi');
    }
  };

  const renderRequestStatus = () => {
    if (!activeRequest) return null;

    if (activeRequest.status === 'pending') {
      return (
        <div className="bg-card rounded-2xl p-6 shadow-xl border border-yellow-100 animate-pulse">
          <div className="text-center">
            <div className="inline-block p-3 bg-yellow-100 rounded-full mb-3 text-yellow-600">
              <Clock size={32} className="animate-spin" />
            </div>
            <h3 className="text-xl font-bold mb-1">Procurando motoristas...</h3>
            <p className="text-muted-foreground">Aguarde em {point.name}</p>
          </div>
        </div>
      );
    }

    if (activeRequest.status === 'accepted') {
      const driver = activeRequest.driver;
      return (
        <div className="bg-green-50 rounded-2xl p-6 shadow-xl border border-green-100">
          <div className="text-center mb-4">
            <div className="inline-block p-2 bg-green-100 rounded-full text-green-700 mb-2">
              <Star size={24} fill="currentColor" />
            </div>
            <h3 className="text-xl font-bold text-green-800">Motorista a caminho!</h3>
          </div>
          
          {driver && (
            <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-green-100">
              <img 
                src={driver.profile?.photo_url || `https://picsum.photos/seed/${driver.id}/100/100`} 
                alt={driver.profile?.name || 'Motorista'} 
                className="w-16 h-16 rounded-full object-cover" 
              />
              <div className="flex-1">
                <h4 className="font-bold text-lg">{driver.profile?.name || 'Motorista'}</h4>
                <div className="flex items-center text-sm text-muted-foreground gap-1">
                  <Star size={14} className="text-yellow-400" fill="currentColor" />
                  <span>4.9</span>
                </div>
              </div>
              <a href="tel:123456789" className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center">
                <Phone size={20} />
              </a>
            </div>
          )}
          <div className="mt-4 text-center">
            <p className="text-sm text-green-700 font-medium">Encontre-o em: {point.name}</p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Layout title={point.name}>
      {/* Status Area */}
      <div className="mb-6">
        {activeRequest ? (
          renderRequestStatus()
        ) : (
          <div className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-1">Precisa de uma corrida?</h2>
              <p className="text-muted-foreground mb-4">Chamar um mototáxi</p>
              <Button 
                variant="secondary" 
                fullWidth 
                onClick={() => setShowClientForm(true)}
                disabled={createRequest.isPending}
              >
                {createRequest.isPending 
                  ? 'Chamando...' 
                  : 'Chamar Mototáxi'
                }
              </Button>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-secondary/20 rounded-full opacity-50" />
          </div>
        )}
      </div>

      {/* Available Drivers */}
      <div className="space-y-4">
        <h3 className="font-bold">Motoristas Disponíveis</h3>
        <div className="space-y-3">
          {availableDrivers.map(driver => (
            <div 
              key={driver.id} 
              onClick={() => setSelectedDriver(driver)}
              className="flex items-center gap-4 bg-card p-4 rounded-xl shadow-sm border border-border cursor-pointer hover:border-primary transition-colors"
            >
              <div className="relative">
                <img 
                  src={driver.profile?.photo_url || `https://picsum.photos/seed/${driver.id}/100/100`} 
                  alt={driver.profile?.name || 'Motorista'} 
                  className="w-12 h-12 rounded-full object-cover" 
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold">{driver.profile?.name || 'Motorista'}</h4>
                <p className="text-xs text-green-600 font-medium">Online • ~2 min</p>
              </div>
            </div>
          ))}
          
          {availableDrivers.length === 0 && (
            <div className="text-center py-8 bg-card rounded-xl border border-dashed border-border">
              <p className="text-muted-foreground">Nenhum motorista online no momento.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Formulário de Cliente */}
      {selectedDriver && !showClientForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="w-full bg-card rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">Chamar Motorista</h2>
              <button 
                onClick={() => setSelectedDriver(null)}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            {/* Motorista Info */}
            <div className="flex gap-4 mb-6 pb-6 border-b">
              <img 
                src={selectedDriver.profile?.photo_url || `https://picsum.photos/seed/${selectedDriver.id}/100/100`} 
                alt={selectedDriver.profile?.name || 'Motorista'} 
                className="w-20 h-20 rounded-full object-cover" 
              />
              <div className="flex-1">
                <h3 className="text-xl font-bold">{selectedDriver.profile?.name || 'Motorista'}</h3>
                <div className="flex items-center text-sm text-muted-foreground gap-2 mb-2">
                  <Star size={14} className="text-yellow-400" fill="currentColor" />
                  <span>4.9 • 120+ corridas</span>
                </div>
                <p className="text-xs text-green-600 font-medium">Online agora</p>
              </div>
            </div>

            {/* Ponto Info */}
            <div className="mb-6 pb-6 border-b">
              <p className="text-sm text-muted-foreground mb-2">Ponto de partida</p>
              <div className="flex gap-2">
                <MapPin size={20} className="text-primary flex-shrink-0" />
                <div>
                  <p className="font-bold">{point.name}</p>
                  <p className="text-sm text-muted-foreground">{point.address}</p>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <Button 
                variant="outline"
                fullWidth
                onClick={() => setSelectedDriver(null)}
              >
                Cancelar
              </Button>
              <Button 
                fullWidth
                onClick={() => setShowClientForm(true)}
              >
                Continuar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Formulário de Informações */}
      {selectedDriver && showClientForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="w-full bg-card rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">Suas Informações</h2>
              <button 
                onClick={() => {
                  setShowClientForm(false);
                  setSelectedDriver(null);
                }}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            {/* Formulário */}
            <div className="space-y-4 mb-6">
              {/* Nome */}
              <div>
                <label className="text-sm font-medium mb-2 block">Nome *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* Endereço de Destino */}
              <div>
                <label className="text-sm font-medium mb-2 block">Endereço de Destino *</label>
                <input
                  type="text"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="Rua, número, cidade..."
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="text-sm font-medium mb-2 block">WhatsApp (opcional)</label>
                <input
                  type="tel"
                  value={clientWhatsapp}
                  onChange={(e) => setClientWhatsapp(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Resumo */}
            <div className="mb-6 pb-6 border-t">
              <p className="text-sm text-muted-foreground mb-2">Resumo da corrida</p>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Motorista:</span> {selectedDriver.profile?.name}</p>
                <p><span className="font-medium">De:</span> {point.name}</p>
                <p><span className="font-medium">Para:</span> {destinationAddress || 'Não informado'}</p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <Button 
                variant="outline"
                fullWidth
                onClick={() => setShowClientForm(false)}
              >
                Voltar
              </Button>
              <Button 
                fullWidth
                onClick={() => handleRequestRide(selectedDriver.id)}
                disabled={createRequest.isPending}
              >
                {createRequest.isPending ? 'Chamando...' : 'Confirmar Chamada'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Formulário para Chamar Aleatório (sem motorista selecionado) */}
      {!selectedDriver && showClientForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="w-full bg-card rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">Solicitar Mototáxi</h2>
              <button 
                onClick={() => {
                  setShowClientForm(false);
                  setClientName('');
                  setDestinationAddress('');
                  setClientWhatsapp('');
                }}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            {/* Info */}
            <div className="mb-6 pb-6 border-b">
              <p className="text-sm text-muted-foreground">O primeiro motorista disponível que aceitar a sua solicitação fará a corrida</p>
            </div>

            {/* Formulário */}
            <div className="space-y-4 mb-6">
              {/* Nome */}
              <div>
                <label className="text-sm font-medium mb-2 block">Nome *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* Endereço de Destino */}
              <div>
                <label className="text-sm font-medium mb-2 block">Endereço de Destino *</label>
                <input
                  type="text"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="Rua, número, cidade..."
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="text-sm font-medium mb-2 block">WhatsApp (opcional)</label>
                <input
                  type="tel"
                  value={clientWhatsapp}
                  onChange={(e) => setClientWhatsapp(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Resumo */}
            <div className="mb-6 pb-6 border-t">
              <p className="text-sm text-muted-foreground mb-2">Resumo da corrida</p>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">De:</span> {point.name}</p>
                <p><span className="font-medium">Para:</span> {destinationAddress || 'Não informado'}</p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <Button 
                variant="outline"
                fullWidth
                onClick={() => {
                  setShowClientForm(false);
                  setClientName('');
                  setDestinationAddress('');
                  setClientWhatsapp('');
                }}
              >
                Cancelar
              </Button>
              <Button 
                fullWidth
                onClick={() => handleRequestRide()}
                disabled={createRequest.isPending}
              >
                {createRequest.isPending ? 'Chamando...' : 'Chamar Mototáxi'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ClientPointView;
