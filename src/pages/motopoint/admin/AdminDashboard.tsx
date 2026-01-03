import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/motopoint/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useFixedPoints, useCreatePoint, useDeletePoint } from '@/hooks/useFixedPoints';
import { useDrivers } from '@/hooks/useDrivers';
import Button from '@/components/motopoint/Button';
import { Trash2, QrCode, Plus, Loader2, UserPlus, Users, MapPin } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getServerOrigin } from '@/lib/utils';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { data: points = [], isLoading: pointsLoading } = useFixedPoints();
  const { data: drivers = [], refetch: refetchDrivers } = useDrivers();
  const createPoint = useCreatePoint();
  const deletePoint = useDeletePoint();
  
  const [activeTab, setActiveTab] = useState<'points' | 'drivers'>('points');
  const [showAddPointModal, setShowAddPointModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);
  const qrRef = useRef<HTMLDivElement | null>(null);
  
  // Driver form
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [driverName, setDriverName] = useState('');
  const [creatingDriver, setCreatingDriver] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login');
    } else if (!authLoading && user && !isAdmin) {
      toast.error('Acesso negado. Apenas admins podem acessar.');
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  if (authLoading || pointsLoading) {
    return (
      <Layout title="Painel Admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  const handleCreatePoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newAddress) {
      try {
        // If coords not captured, ask confirmation to create without coords
        if (newLat == null || newLng == null) {
          const proceed = window.confirm('Nenhuma coordenada foi capturada. Deseja criar o ponto sem latitude/longitude?');
          if (!proceed) {
            toast.error('Capture a localização com o botão "Usar localização atual" antes de salvar.');
            return;
          }
        }
        await createPoint.mutateAsync({ name: newName, address: newAddress, latitude: newLat, longitude: newLng });
        setNewName('');
        setNewAddress('');
        setNewLat(null);
        setNewLng(null);
        setShowAddPointModal(false);
        toast.success('Ponto criado com sucesso!');
      } catch (error) {
        toast.error('Erro ao criar ponto');
      }
    }
  };

  const handleUseLocation = async () => {
    try {
      if (!('geolocation' in navigator)) throw new Error('Geolocalização não suportada');
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 });
      });
      setNewLat(pos.coords.latitude);
      setNewLng(pos.coords.longitude);
      toast.success('Localização capturada com sucesso');
    } catch (e:any) {
      console.error(e);
      toast.error('Erro ao capturar localização: ' + (e?.message || e));
    }
  };

  const downloadSvg = (id: string) => {
    const node = qrRef.current?.querySelector('svg');
    if (!node) return toast.error('SVG não encontrado');
    const svg = new XMLSerializer().serializeToString(node);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qrcode_${id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = async (id: string) => {
    const node = qrRef.current?.querySelector('svg') as SVGElement | null;
    if (!node) return toast.error('SVG não encontrado');
    const svg = new XMLSerializer().serializeToString(node);
    const img = new Image();
    const svg64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    img.src = svg64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 1024;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return toast.error('Erro ao criar canvas');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0,0,size,size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob(blob => {
        if (!blob) return toast.error('Erro ao gerar PNG');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qrcode_${id}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    };
  };

  const togglePointActive = async (pointId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('fixed_points')
        .update({ is_active: !current })
        .eq('id', pointId);
      if (error) throw error;
      toast.success('Ponto atualizado');
    } catch (e) {
      toast.error('Erro ao atualizar ponto');
    }
  };

  const handleDeletePoint = async (id: string) => {
    try {
      await deletePoint.mutateAsync(id);
      toast.success('Ponto removido!');
    } catch (error) {
      toast.error('Erro ao remover ponto');
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverEmail || !driverPassword || !driverName) return;
    
    setCreatingDriver(true);
    try {
      // Create driver via Edge Function or local server (uses service role key securely)
      const baseFn = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || (import.meta.env.DEV ? getServerOrigin() : '');
      const resp = await fetch(baseFn + '/create-driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: driverEmail, password: driverPassword, name: driverName })
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result?.error || 'Erro ao criar usuário');

      toast.success(`Motorista ${driverName} cadastrado com sucesso!`);
      setDriverEmail('');
      setDriverPassword('');
      setDriverName('');
      setShowAddDriverModal(false);
      refetchDrivers();
    } catch (error: any) {
      console.error('Error creating driver:', error);
      if (error.message?.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Erro ao cadastrar motorista');
      }
    } finally {
      setCreatingDriver(false);
    }
  };

  const handleDeleteDriver = async (driverId: string, userId: string) => {
    try {
      // Deletar driver (o user permanece mas sem acesso de motorista)
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', driverId);
      
      if (error) throw error;
      
      toast.success('Motorista removido!');
      refetchDrivers();
    } catch (error) {
      toast.error('Erro ao remover motorista');
    }
  };

  const getPointUrl = (id: string) => {
    return `${window.location.origin}/point/${id}`;
  };

  const onlineDrivers = drivers.filter(d => d.is_online);

  return (
    <Layout title="Painel Admin">
      <div className="space-y-6">
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card p-3 rounded-2xl shadow-sm border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase font-bold">Pontos</p>
            <p className="text-2xl font-bold">{points.length}</p>
          </div>
          <div className="bg-card p-3 rounded-2xl shadow-sm border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase font-bold">Motoristas</p>
            <p className="text-2xl font-bold">{drivers.length}</p>
          </div>
          <div className="bg-card p-3 rounded-2xl shadow-sm border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase font-bold">Online</p>
            <p className="text-2xl font-bold text-green-600">{onlineDrivers.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-muted p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('points')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'points' ? 'bg-card shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <MapPin size={18} /> Pontos
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'drivers' ? 'bg-card shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <Users size={18} /> Motoristas
          </button>
          {/* Zonas feature removed */}
        </div>

        {/* Points Tab */}
        {activeTab === 'points' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Pontos Fixos</h2>
              <Button 
                variant="primary" 
                className="py-2 px-4 text-sm"
                onClick={() => setShowAddPointModal(true)}
              >
                <Plus size={16} /> Novo
              </Button>
            </div>

            <div className="space-y-3">
              {points.map(point => (
                <div key={point.id} className="bg-card p-4 rounded-xl border border-border shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{point.name}</h3>
                      <p className="text-sm text-muted-foreground">{point.address}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedPointId(selectedPointId === point.id ? null : point.id)}
                        className={`p-2 rounded-lg transition-colors ${selectedPointId === point.id ? 'bg-yellow-100 text-yellow-700' : 'bg-muted text-muted-foreground'}`}
                      >
                        <QrCode size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeletePoint(point.id)}
                        disabled={deletePoint.isPending}
                        className="p-2 bg-destructive/10 text-destructive rounded-lg disabled:opacity-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {selectedPointId === point.id && (
                    <div className="mt-4 pt-4 border-t border-border flex flex-col items-center">
                      <div className="bg-card p-2 rounded-lg border-2 border-primary mb-2" ref={qrRef}>
                        <QRCode value={getPointUrl(point.id)} size={150} />
                      </div>
                      <p className="text-xs text-muted-foreground font-mono text-center break-all">{getPointUrl(point.id)}</p>
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" onClick={() => downloadSvg(point.id)}>Download SVG</Button>
                        <Button variant="outline" onClick={() => downloadPng(point.id)}>Download PNG</Button>
                        <Button variant="ghost" onClick={() => togglePointActive(point.id, !!point.is_active)}>
                          {point.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {points.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  Nenhum ponto criado ainda.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Drivers Tab */}
        {activeTab === 'drivers' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Motoristas</h2>
              <Button 
                variant="primary" 
                className="py-2 px-4 text-sm"
                onClick={() => setShowAddDriverModal(true)}
              >
                <UserPlus size={16} /> Novo
              </Button>
            </div>

            <div className="space-y-3">
              {drivers.map(driver => (
                <div key={driver.id} className="bg-card p-4 rounded-xl border border-border shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img 
                        src={driver.profile?.photo_url || `https://picsum.photos/seed/${driver.id}/100/100`} 
                        alt={driver.profile?.name || 'Motorista'} 
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-card rounded-full ${driver.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{driver.profile?.name || 'Motorista'}</h3>
                      <p className={`text-sm ${driver.is_online ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {driver.is_online ? 'Online' : 'Offline'} • {driver.status === 'busy' ? 'Em corrida' : 'Disponível'}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDeleteDriver(driver.id, driver.user_id)}
                      className="p-2 bg-destructive/10 text-destructive rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              
              {drivers.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  Nenhum motorista cadastrado ainda.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Point Modal */}
      {showAddPointModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in">
            <h3 className="text-xl font-bold mb-4">Criar Ponto Fixo</h3>
            <form onSubmit={handleCreatePoint} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome do Ponto</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Estação Central"
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Endereço</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Rua Principal, 123"
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Coordenadas (opcionais)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input 
                      type="number" 
                      placeholder="Latitude"
                      step="0.000001"
                      className="w-full p-2 text-sm rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                      value={newLat != null ? newLat : ''}
                      onChange={e => setNewLat(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                  <div>
                    <input 
                      type="number" 
                      placeholder="Longitude"
                      step="0.000001"
                      className="w-full p-2 text-sm rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                      value={newLng != null ? newLng : ''}
                      onChange={e => setNewLng(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                </div>
              </div>
              <Button type="button" variant="secondary" fullWidth onClick={handleUseLocation}>
                Capturar localização atual
              </Button>
              {newLat != null && newLng != null && (
                <p className="text-xs text-green-600 mt-1">✓ Coordenadas capturadas: {newLat.toFixed(6)}, {newLng.toFixed(6)}</p>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" fullWidth onClick={() => setShowAddPointModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" fullWidth disabled={createPoint.isPending}>
                  {createPoint.isPending ? 'Criando...' : 'Criar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddDriverModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in">
            <h3 className="text-xl font-bold mb-4">Cadastrar Motorista</h3>
            <form onSubmit={handleCreateDriver} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: João Silva"
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  placeholder="motorista@email.com"
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={driverEmail}
                  onChange={e => setDriverEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={driverPassword}
                  onChange={e => setDriverPassword(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" fullWidth onClick={() => setShowAddDriverModal(false)}>Cancelar</Button>
                <Button type="submit" fullWidth disabled={creatingDriver}>
                  {creatingDriver ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;
