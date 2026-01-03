import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/motopoint/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useFixedPoints, useCreatePoint, useDeletePoint } from '@/hooks/useFixedPoints';
import { useDrivers } from '@/hooks/useDrivers';
import Button from '@/components/motopoint/Button';
import { Trash2, QrCode, Plus, Loader2, UserPlus, Users, MapPin, Settings, Edit2, Upload } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getServerOrigin } from '@/lib/utils';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  // ALWAYS call hooks unconditionally, in same order
  const { data: points = [], isLoading: pointsLoading } = useFixedPoints();
  const { data: drivers = [], refetch: refetchDrivers } = useDrivers();
  const createPoint = useCreatePoint();
  const deletePoint = useDeletePoint();
  
  // Guard: check auth after hooks
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login');
    } else if (!authLoading && user && !isAdmin) {
      toast.error('Acesso negado. Apenas admins podem acessar.');
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Show loading while auth is checking
  if (authLoading) {
    return (
      <Layout title="Painel Admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </Layout>
    );
  }

  // If not authenticated or not admin, redirect (useEffect above handles it)
  // Don't render anything, but keep hooks running
  if (!user || !isAdmin) {
    return null;
  }
  
  const [activeTab, setActiveTab] = useState<'points' | 'drivers' | 'settings'>('points');
  const [showAddPointModal, setShowAddPointModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showHeroImageModal, setShowHeroImageModal] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState('');
  const [savingHeroImage, setSavingHeroImage] = useState(false);
  const qrRef = useRef<HTMLDivElement | null>(null);
  
  // Driver form
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [driverName, setDriverName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [motoBrand, setMotoBrand] = useState('');
  const [motoModel, setMotoModel] = useState('');
  const [motoColor, setMotoColor] = useState('');
  const [motoPlate, setMotoPlate] = useState('');
  const [creatingDriver, setCreatingDriver] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);

  if (pointsLoading) {
    return (
      <Layout title="Painel Admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </Layout>
    );
  }

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
    if (!driverName) return;
    if (!editingDriverId && (!driverEmail || !driverPassword)) return;
    
    setCreatingDriver(true);
    try {
      if (editingDriverId) {
        // Update existing driver
        console.log('Updating driver:', { driverName, photoUrl: photoUrl?.substring(0, 50) });
        
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: driverName,
            photo_url: photoUrl && photoUrl.trim() ? photoUrl : null
          })
          .eq('id', editingDriverId);
        if (profileError) throw profileError;

        const { error: driverError } = await supabase
          .from('drivers')
          .update({
            moto_brand: motoBrand || null,
            moto_model: motoModel || null,
            moto_color: motoColor || null,
            moto_plate: motoPlate || null
          })
          .eq('user_id', editingDriverId);
        if (driverError) throw driverError;

        // Verify the update was successful by refetching
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('photo_url')
          .eq('id', editingDriverId)
          .maybeSingle();
        
        console.log('Verification - Saved photo_url:', updatedProfile?.photo_url?.substring(0, 50));

        toast.success(`Motorista ${driverName} atualizado com sucesso!`);
      } else {
        // Create new driver via Edge Function
        const baseFn = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || (import.meta.env.DEV ? getServerOrigin() : '');
        const resp = await fetch(baseFn + '/create-driver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: driverEmail, 
            password: driverPassword, 
            name: driverName,
            photo_url: photoUrl || null,
            moto_brand: motoBrand || null,
            moto_model: motoModel || null,
            moto_color: motoColor || null,
            moto_plate: motoPlate || null
          })
        });

        const result = await resp.json();
        if (!resp.ok) throw new Error(result?.error || 'Erro ao criar usuário');

        toast.success(`Motorista ${driverName} cadastrado com sucesso!`);
      }

      setDriverEmail('');
      setDriverPassword('');
      setDriverName('');
      setPhotoUrl('');
      setMotoBrand('');
      setMotoModel('');
      setMotoColor('');
      setMotoPlate('');
      setEditingDriverId(null);
      setShowAddDriverModal(false);
      refetchDrivers();
    } catch (error: any) {
      console.error('Error:', error);
      if (error.message?.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error(editingDriverId ? 'Erro ao atualizar motorista' : 'Erro ao cadastrar motorista');
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

  const handleEditDriver = (driver: any) => {
    setEditingDriverId(driver.user_id);
    setDriverName(driver.profile?.name || '');
    setPhotoUrl((driver.profile?.photo_url || '').trim());
    setMotoBrand(driver.moto_brand || '');
    setMotoModel(driver.moto_model || '');
    setMotoColor(driver.moto_color || '');
    setMotoPlate(driver.moto_plate || '');
    setDriverEmail('');
    setDriverPassword('');
    setShowAddDriverModal(true);
  };

  const handleCloseDriverModal = () => {
    setShowAddDriverModal(false);
    setEditingDriverId(null);
    setDriverEmail('');
    setDriverPassword('');
    setDriverName('');
    setPhotoUrl('');
    setMotoBrand('');
    setMotoModel('');
    setMotoColor('');
    setMotoPlate('');
  };

  const getPointUrl = (id: string) => {
    return `${window.location.origin}/point/${id}`;
  };

  const onlineDrivers = drivers.filter(d => d.is_online);

  // Load hero image on mount
  useEffect(() => {
    const loadHeroImage = async () => {
      const { data } = await supabase
        .from('site_config')
        .select('value')
        .eq('key', 'hero_image_url')
        .maybeSingle();
      
      if (data?.value) {
        setHeroImageUrl(data.value);
        setHeroImagePreview(data.value);
      }
    };
    loadHeroImage();
  }, []);

  const handleHeroImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast.error('Apenas JPEG, PNG e GIF são aceitos');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo deve ser menor que 5MB');
        return;
      }

      setHeroImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeroImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveHeroImage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!heroImageUrl && !heroImageFile) {
      toast.error('Forneça uma URL ou selecione um arquivo');
      return;
    }

    setSavingHeroImage(true);
    try {
      let imageUrl = heroImageUrl;

      if (heroImageFile) {
        // Upload file to Supabase Storage
        const fileName = `hero-${Date.now()}.${heroImageFile.type.split('/')[1]}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('site-config')
          .upload(fileName, heroImageFile, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: publicData } = supabase.storage
          .from('site-config')
          .getPublicUrl(fileName);
        
        imageUrl = publicData.publicUrl;
      }

      // Update site_config
      const { error } = await supabase
        .from('site_config')
        .upsert(
          { key: 'hero_image_url', value: imageUrl },
          { onConflict: 'key' }
        );

      if (error) throw error;

      toast.success('Imagem do hero atualizada com sucesso!');
      setHeroImageFile(null);
      setShowHeroImageModal(false);
      
      // Reset file input
      const fileInput = document.getElementById('heroImageFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar imagem');
    } finally {
      setSavingHeroImage(false);
    }
  };

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
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'settings' ? 'bg-card shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <Settings size={18} /> Configurações
          </button>
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
                onClick={() => {
                  handleCloseDriverModal();
                  setShowAddDriverModal(true);
                }}
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
                        src={driver.profile?.photo_url || `https://via.placeholder.com/100?text=${encodeURIComponent(driver.profile?.name?.charAt(0) || 'M')}`} 
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
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditDriver(driver)}
                        className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        title="Editar motorista"
                      >
                        <svg size={18} className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteDriver(driver.id, driver.user_id)}
                        className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                        title="Deletar motorista"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in my-8">
            <h3 className="text-xl font-bold mb-4">{editingDriverId ? 'Editar Motorista' : 'Cadastrar Motorista'}</h3>
            <form onSubmit={handleCreateDriver} className="space-y-3 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: João Silva"
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                />
              </div>
              
              {!editingDriverId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
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
                    <label className="block text-sm font-medium text-foreground mb-1">Senha *</label>
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
                </>
              )}
              
              <div className="border-t border-border pt-3 mt-3">
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Dados do Motorista (Opcionais)</h4>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Foto de Perfil (URL)</label>
                <input 
                  type="text" 
                  placeholder="https://exemplo.com/foto.jpg"
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">⚠️ Nota: URLs do Instagram podem não funcionar por restrições CORS. Use URLs de hospedagem própria (imgur, cloudinary, etc)</p>
              </div>

              <div className="border-t border-border pt-3 mt-3">
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Dados da Moto (Opcionais)</h4>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Marca</label>
                <input 
                  type="text" 
                  placeholder="Ex: Honda, Yamaha"
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={motoBrand}
                  onChange={e => setMotoBrand(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Modelo</label>
                <input 
                  type="text" 
                  placeholder="Ex: CB 500, YZF-R3"
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={motoModel}
                  onChange={e => setMotoModel(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Cor</label>
                <input 
                  type="text" 
                  placeholder="Ex: Vermelho, Preto"
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={motoColor}
                  onChange={e => setMotoColor(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Placa</label>
                <input 
                  type="text" 
                  placeholder="Ex: ABC-1234"
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                  value={motoPlate}
                  onChange={e => setMotoPlate(e.target.value.toUpperCase())}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" fullWidth onClick={handleCloseDriverModal}>Cancelar</Button>
                <Button type="submit" fullWidth disabled={creatingDriver}>
                  {creatingDriver ? (editingDriverId ? 'Atualizando...' : 'Cadastrando...') : (editingDriverId ? 'Atualizar' : 'Cadastrar')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Imagem do Hero</h2>
                  <p className="text-sm text-muted-foreground mt-1">Configure a imagem exibida na página inicial</p>
                </div>
                <Button 
                  variant="primary"
                  onClick={() => setShowHeroImageModal(true)}
                  className="py-2 px-4"
                >
                  <Edit2 size={16} /> Editar
                </Button>
              </div>

              {heroImagePreview && (
                <div className="rounded-xl overflow-hidden border border-border">
                  <img 
                    src={heroImagePreview} 
                    alt="Hero Preview" 
                    className="w-full h-64 object-cover"
                    onError={() => setHeroImagePreview('')}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hero Image Modal */}
        {showHeroImageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl p-6 max-w-lg w-full border border-border">
              <h2 className="text-xl font-bold mb-4">Configurar Imagem do Hero</h2>
              
              <form onSubmit={handleSaveHeroImage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">URL da Imagem</label>
                  <input 
                    type="text"
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    value={heroImageUrl}
                    onChange={e => {
                      setHeroImageUrl(e.target.value);
                      setHeroImagePreview(e.target.value);
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Insira uma URL completa de uma imagem (JPEG, PNG ou GIF)</p>
                </div>

                <div className="relative">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 border-t border-border"></div>
                    <span className="text-xs text-muted-foreground">OU</span>
                    <div className="flex-1 border-t border-border"></div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Enviar Arquivo</label>
                  <label className="flex items-center justify-center w-full p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition">
                    <div className="text-center">
                      <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Clique para selecionar ou arraste aqui</p>
                      <p className="text-xs text-muted-foreground mt-1">JPEG, PNG ou GIF (máx 5MB)</p>
                    </div>
                    <input 
                      id="heroImageFileInput"
                      type="file" 
                      accept="image/jpeg,image/png,image/gif"
                      className="hidden"
                      onChange={handleHeroImageFileChange}
                    />
                  </label>
                </div>

                {heroImagePreview && heroImageFile && (
                  <div>
                    <p className="text-sm font-medium mb-2 text-foreground">Prévia:</p>
                    <div className="rounded-lg overflow-hidden border border-border">
                      <img 
                        src={heroImagePreview} 
                        alt="Preview" 
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t border-border">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowHeroImageModal(false);
                      setHeroImageFile(null);
                      const fileInput = document.getElementById('heroImageFileInput') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                    disabled={savingHeroImage}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="primary"
                    type="submit"
                    disabled={savingHeroImage || (!heroImageUrl && !heroImageFile)}
                  >
                    {savingHeroImage ? 'Salvando...' : 'Salvar'}
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
