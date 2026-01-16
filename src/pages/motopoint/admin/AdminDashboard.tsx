import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/motopoint/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useFixedPoints, useCreatePoint, useDeletePoint } from '@/hooks/useFixedPoints';
import { useDrivers } from '@/hooks/useDrivers';
import { useAllBanners, useCreateBanner, useUpdateBanner, useDeleteBanner, useToggleBannerStatus } from '@/hooks/useBanners';
import Button from '@/components/motopoint/Button';
import siteConfig from '@/lib/siteConfig';
import { Trash2, QrCode, Plus, Loader2, UserPlus, Users, MapPin, Settings, Edit2, Upload, Image } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getServerOrigin } from '@/lib/utils';

// ============================================================================
// MAIN COMPONENT - Admin Dashboard
// ============================================================================
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();

  // Guard redirect for non-authenticated/non-admin users
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login');
    } else if (!authLoading && user && !isAdmin) {
      toast.error('Acesso negado. Apenas admins podem acessar.');
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Show loading state during auth check
  if (authLoading) {
    return (
      <Layout title="Painel Admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </Layout>
    );
  }

  // If not auth'd/admin, don't render (guard above redirects)
  if (!user || !isAdmin) return null;

  // Render content only for authenticated admins
  return <AdminDashboardContent />;
};

// ============================================================================
// CONTENT COMPONENT - Actual dashboard UI (only renders when authed)
// ============================================================================
const AdminDashboardContent: React.FC = () => {
  // Auth
  const { user } = useAuth();

  // Data hooks
  const { data: points = [], isLoading: pointsLoading } = useFixedPoints();
  const { data: drivers = [], refetch: refetchDrivers } = useDrivers();
  const createPoint = useCreatePoint();
  const deletePoint = useDeletePoint();

  // State: tabs and modals
  const [activeTab, setActiveTab] = useState<'points' | 'drivers' | 'settings' | 'banners'>('points');
  const [showAddPointModal, setShowAddPointModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showHeroImageModal, setShowHeroImageModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [passwordTargetUserId, setPasswordTargetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // State: point form
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);

  // State: driver form
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

  // State: hero image
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState('');
  const [savingHeroImage, setSavingHeroImage] = useState(false);

  // Site config states
  const [appName, setAppName] = useState('MotoPoint');
  const [appSlogan, setAppSlogan] = useState('Mototáxi rápido e seguro');
  const [descriptionText, setDescriptionText] = useState('Escaneie o QR Code de um ponto para chamar um mototáxi');
  const [mainButtonText, setMainButtonText] = useState('Escanear QR Code');
  const [footerText, setFooterText] = useState('MotoPoint © 2026');

  // Hero visual controls
  const [heroWidthPct, setHeroWidthPct] = useState(80);
  const [heroHeightPx, setHeroHeightPx] = useState(320);
  const [heroObjectFit, setHeroObjectFit] = useState<'contain'|'cover'|'auto'>('contain');
  const [heroAlignment, setHeroAlignment] = useState<'center'|'top'|'bottom'>('center');
  const [heroBorderRadius, setHeroBorderRadius] = useState(24);

  // Logo
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState(48);
  const [logoInHero, setLogoInHero] = useState(false);

  const [enablePwa, setEnablePwa] = useState(true);
  const [enablePushNotifications, setEnablePushNotifications] = useState(true);

  // Banners: hooks and UI state
  const { data: banners = [], refetch: refetchBanners } = useAllBanners();
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();
  const toggleBannerStatus = useToggleBannerStatus();

  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerLinkDestination, setBannerLinkDestination] = useState('');
  const [bannerTransitionSpeed, setBannerTransitionSpeed] = useState(5000);
  const [bannerIsAuto, setBannerIsAuto] = useState(true);
  const [savingBanner, setSavingBanner] = useState(false);

  // Colors
  const [homeBg, setHomeBg] = useState('#071029');
  const [heroColorStart, setHeroColorStart] = useState('#081826');
  const [heroColorEnd, setHeroColorEnd] = useState('#071029');
  const [cardColor, setCardColor] = useState('#0f1724');
  const [buttonColor, setButtonColor] = useState('#111827');
  const [textColor, setTextColor] = useState('#ffffff');

  const qrRef = useRef<HTMLDivElement | null>(null);

  // Load site configs on mount
  useEffect(() => {
    const load = async () => {
      try {
        const cfg = await siteConfig.getSiteConfigs();
        if (cfg.hero_image_url) {
          setHeroImageUrl(cfg.hero_image_url);
          setHeroImagePreview(cfg.hero_image_url);
        }
        if (cfg.app_name) setAppName(cfg.app_name);
        if (cfg.app_slogan) setAppSlogan(cfg.app_slogan);
        if (cfg.description_text) setDescriptionText(cfg.description_text);
        if (cfg.main_button_text) setMainButtonText(cfg.main_button_text);
        if (cfg.footer_text) setFooterText(cfg.footer_text);
        if (cfg.logo_url) setLogoUrl(cfg.logo_url);
        if (cfg.logo_size) setLogoSize(parseInt(cfg.logo_size, 10) || 48);
        if (cfg.logo_in_hero) setLogoInHero(cfg.logo_in_hero === 'true');
        if (cfg.hero_width_pct) setHeroWidthPct(parseInt(cfg.hero_width_pct, 10) || 80);
        if (cfg.hero_height_px) setHeroHeightPx(parseInt(cfg.hero_height_px, 10) || 320);
        if (cfg.hero_object_fit) setHeroObjectFit(cfg.hero_object_fit as any);
        if (cfg.hero_alignment) setHeroAlignment(cfg.hero_alignment as any);
        if (cfg.hero_border_radius) setHeroBorderRadius(parseInt(cfg.hero_border_radius, 10) || 24);
        if (cfg.home_bg) setHomeBg(cfg.home_bg);
        if (cfg.hero_color_start) setHeroColorStart(cfg.hero_color_start);
        if (cfg.hero_color_end) setHeroColorEnd(cfg.hero_color_end);
        if (cfg.card_color) setCardColor(cfg.card_color);
        if (cfg.button_color) setButtonColor(cfg.button_color);
        if (cfg.text_color) setTextColor(cfg.text_color);
        if (cfg.enable_pwa) setEnablePwa(cfg.enable_pwa === 'true');
        if (cfg.enable_push_notifications) setEnablePushNotifications(cfg.enable_push_notifications === 'true');
      } catch (e) {
        console.warn('Could not load site configs', e);
      }
    };
    load();
  }, []);

  // Helpers
  const handleCreatePoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newAddress) return;

    try {
      if (newLat == null || newLng == null) {
        const proceed = window.confirm(
          'Nenhuma coordenada foi capturada. Deseja criar o ponto sem latitude/longitude?'
        );
        if (!proceed) {
          toast.error('Capture a localização antes de salvar.');
          return;
        }
      }

      await createPoint.mutateAsync({
        name: newName,
        address: newAddress,
        latitude: newLat,
        longitude: newLng,
      });

      setNewName('');
      setNewAddress('');
      setNewLat(null);
      setNewLng(null);
      setShowAddPointModal(false);
      toast.success('Ponto criado com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar ponto');
    }
  };

  const handleUseLocation = async () => {
    try {
      if (!('geolocation' in navigator)) {
        throw new Error('Geolocalização não suportada');
      }

      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 300000,
        });
      });

      setNewLat(pos.coords.latitude);
      setNewLng(pos.coords.longitude);
      toast.success('Localização capturada com sucesso');
    } catch (error: any) {
      toast.error('Erro ao capturar localização: ' + (error?.message || error));
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

  const togglePointActive = async (pointId: string, current: boolean) => {
    try {
      const { error } = await (supabase
        .from('fixed_points')
        .update({ is_active: !current } as any)
        .eq('id', pointId)) as any;
      if (error) throw error;
      toast.success('Ponto atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar ponto');
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
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
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

  const getPointUrl = (id: string) => {
    return `${window.location.origin}/point/${id}`;
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName) return;
    if (!editingDriverId && (!driverEmail || !driverPassword)) return;

    setCreatingDriver(true);
    try {
      if (editingDriverId) {
        // Update existing driver via server-side function using service role
        const isDev = import.meta.env.DEV;
        const baseFn = isDev ? getServerOrigin() : '';
        const updateUrl = isDev ? `${baseFn}/create-driver` : '/api/create-driver';

        const resp = await fetch(updateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: editingDriverId,
            name: driverName,
            photo_url: photoUrl || null,
            moto_brand: motoBrand || null,
            moto_model: motoModel || null,
            moto_color: motoColor || null,
            moto_plate: motoPlate || null,
          }),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(text || `HTTP ${resp.status}`);
        }
        toast.success(`Motorista ${driverName} atualizado!`);
      } else {
        // Create new driver
        const isDev = import.meta.env.DEV;
        const baseFn = isDev ? getServerOrigin() : '';
        const createDriverUrl = isDev
          ? `${baseFn}/create-driver`
          : '/api/create-driver';
        let resp = await fetch(createDriverUrl, {
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
            moto_plate: motoPlate || null,
          }),
        });

        // If failed, try a couple of fallbacks and surface server message for debugging
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          console.error('create-driver initial failed', createDriverUrl, resp.status, text);

          // try fallback paths commonly used
          const fallbacks = ['/_/functions/api/create-driver', '/create-driver'];
          for (const fb of fallbacks) {
            try {
              const r2 = await fetch(fb, {
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
                  moto_plate: motoPlate || null,
                }),
              });
              const t = await r2.text().catch(() => '');
              console.error('create-driver fallback', fb, r2.status, t);
              if (r2.ok) {
                resp = r2;
                break;
              }
            } catch (e) {
              console.error('create-driver fallback error', fb, e);
            }
          }
        }

        const resultText = await resp.text().catch(() => '');
        let result: any = {};
        try { result = JSON.parse(resultText); } catch { result = { message: resultText }; }
        if (!resp.ok) {
          throw new Error(result?.error || result?.message || `HTTP ${resp.status}`);
        }

        toast.success(`Motorista ${driverName} cadastrado!`);
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
      console.error('handleCreateDriver error', error);
      const msg = error?.message || (editingDriverId ? 'Erro ao atualizar motorista' : 'Erro ao cadastrar motorista');
      toast.error(msg);
    } finally {
      setCreatingDriver(false);
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

  const handleOpenChangeDriverPassword = (userId: string) => {
    setPasswordTargetUserId(userId);
    setNewPassword('');
    setConfirmPassword('');
    setShowChangePasswordModal(true);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Senhas não coincidem');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    setChangingPassword(true);
    try {
      const isDev = import.meta.env.DEV;
      const baseFn = isDev ? getServerOrigin() : '';
      const changePasswordUrl = isDev ? `${baseFn}/api/change-password` : '/api/change-password';

      const resp = await fetch(changePasswordUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: passwordTargetUserId,
          new_password: newPassword,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || `HTTP ${resp.status}`);
      }

      toast.success('Senha alterada com sucesso!');
      setShowChangePasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordTargetUserId(null);
    } catch (error: any) {
      console.error('Change password error', error);
      toast.error(error?.message || 'Erro ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleOpenAdminChangePassword = () => {
    setPasswordTargetUserId(user?.id || null);
    setNewPassword('');
    setConfirmPassword('');
    setShowAdminPasswordModal(true);
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

  const handleDeleteDriver = async (driverId: string, userId: string) => {
    try {
      const { error } = await supabase.from('drivers').delete().eq('id', driverId);
      if (error) throw error;
      toast.success('Motorista removido!');
      refetchDrivers();
    } catch (error) {
      toast.error('Erro ao remover motorista');
    }
  };

  const handleHeroImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Apenas JPEG, PNG e GIF são aceitos');
      return;
    }

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
        const fileName = `hero-${Date.now()}.${heroImageFile.type.split('/')[1]}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('site-config')
          .upload(fileName, heroImageFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage.from('site-config').getPublicUrl(fileName);
        imageUrl = publicData.publicUrl;
      }

        // Save to site_config as primary source
      await siteConfig.upsertSiteConfig('hero_image_url', imageUrl);

      // Save to localStorage as backup
      localStorage.setItem('hero_image_url', imageUrl);

      toast.success('Imagem atualizada!');
      setHeroImageFile(null);
      setShowHeroImageModal(false);

      const fileInput = document.getElementById('heroImageFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar imagem');
    } finally {
      setSavingHeroImage(false);
    }
  };

  const handleSaveSiteConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    const pairs: Record<string, string> = {
      app_name: appName,
      app_slogan: appSlogan,
      description_text: descriptionText,
      main_button_text: mainButtonText,
      footer_text: footerText,
      logo_url: logoUrl,
      logo_size: String(logoSize),
      logo_in_hero: logoInHero ? 'true' : 'false',
      hero_width_pct: String(heroWidthPct),
      hero_height_px: String(heroHeightPx),
      hero_object_fit: heroObjectFit,
      hero_alignment: heroAlignment,
      hero_border_radius: String(heroBorderRadius),
      home_bg: homeBg,
      hero_color_start: heroColorStart,
      hero_color_end: heroColorEnd,
      card_color: cardColor,
      button_color: buttonColor,
      text_color: textColor,
      enable_pwa: enablePwa ? 'true' : 'false',
      enable_push_notifications: enablePushNotifications ? 'true' : 'false',
    };

    try {
      const ok = await siteConfig.upsertManySiteConfigs(pairs);
      if (ok) toast.success('Configurações salvas!');
      else toast.error('Erro ao salvar configurações');
    } catch (e) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const onlineDrivers = drivers.filter((d) => d.is_online);

  if (pointsLoading) {
    return (
      <Layout title="Painel Admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </Layout>
    );
  }

  // Banner handlers
  const handleEditBanner = (banner: any) => {
    setBannerTitle(banner.title);
    setBannerImageUrl(banner.image_url);
    setBannerLinkDestination(banner.link_destination || '');
    setBannerTransitionSpeed(banner.transition_speed);
    setBannerIsAuto(banner.is_auto);
    setEditingBannerId(banner.id);
    setShowAddBannerModal(true);
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('Tem certeza que deseja remover este banner?')) return;
    setSavingBanner(true);
    try {
      await deleteBanner.mutateAsync(bannerId);
    } finally {
      setSavingBanner(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerImageUrl.trim()) {
      toast.error('URL da imagem é obrigatória');
      return;
    }

    setSavingBanner(true);
    try {
      if (editingBannerId) {
        // Update
        await updateBanner.mutateAsync({
          id: editingBannerId,
          title: bannerTitle,
          image_url: bannerImageUrl,
          link_destination: bannerLinkDestination || null,
          is_active: true,
          transition_speed: bannerTransitionSpeed,
          is_auto: bannerIsAuto,
          display_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        // Create
        await createBanner.mutateAsync({
          title: bannerTitle,
          image_url: bannerImageUrl,
          link_destination: bannerLinkDestination || null,
          is_active: true,
          transition_speed: bannerTransitionSpeed,
          is_auto: bannerIsAuto,
          display_order: 0,
        });
      }
      setShowAddBannerModal(false);
      setBannerTitle('');
      setBannerImageUrl('');
      setBannerLinkDestination('');
      setEditingBannerId(null);
      refetchBanners();
    } finally {
      setSavingBanner(false);
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
            onClick={() => setActiveTab('banners')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'banners' ? 'bg-card shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <Image size={18} /> Banners
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
              <Button variant="primary" className="py-2 px-4 text-sm" onClick={() => setShowAddPointModal(true)}>
                <Plus size={16} /> Novo
              </Button>
            </div>

            <div className="space-y-3">
              {points.map((point) => (
                <div key={point.id} className="bg-card p-4 rounded-xl border border-border shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{point.name}</h3>
                      <p className="text-sm text-muted-foreground">{point.address}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedPointId(selectedPointId === point.id ? null : point.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          selectedPointId === point.id ? 'bg-yellow-100 text-yellow-700' : 'bg-muted text-muted-foreground'
                        }`}
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
                      <p className="text-xs text-muted-foreground font-mono text-center break-all">
                        {getPointUrl(point.id)}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" onClick={() => downloadSvg(point.id)}>
                          Download SVG
                        </Button>
                        <Button variant="outline" onClick={() => downloadPng(point.id)}>
                          Download PNG
                        </Button>
                        <Button variant="secondary" onClick={() => togglePointActive(point.id, !!point.is_active)}>
                          {point.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {points.length === 0 && <div className="text-center py-10 text-muted-foreground">Nenhum ponto criado.</div>}
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
              {drivers.map((driver) => (
                <div key={driver.id} className="bg-card p-4 rounded-xl border border-border shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={
                          driver.profile?.photo_url ||
                          `https://via.placeholder.com/100?text=${encodeURIComponent(
                            driver.profile?.name?.charAt(0) || 'M'
                          )}`
                        }
                        alt={driver.profile?.name || 'Motorista'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div
                        className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-card rounded-full ${
                          driver.is_online ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      ></div>
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
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleOpenChangeDriverPassword(driver.user_id)}
                        className="p-2 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/20 transition-colors"
                        title="Alterar Senha"
                      >
                        🔐
                      </button>
                      <button
                        onClick={() => handleDeleteDriver(driver.id, driver.user_id)}
                        className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {drivers.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">Nenhum motorista cadastrado.</div>
              )}
            </div>
          </div>
        )}

        {/* Banners Tab */}
        {activeTab === 'banners' && (
          <div className="space-y-4">
            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Carrossel de Banners</h2>
                  <p className="text-sm text-muted-foreground mt-1">Gerencie os banners da página inicial</p>
                </div>
                <Button variant="primary" onClick={() => {
                  setBannerTitle('');
                  setBannerImageUrl('');
                  setBannerLinkDestination('');
                  setBannerTransitionSpeed(5000);
                  setBannerIsAuto(true);
                  setEditingBannerId(null);
                  setShowAddBannerModal(true);
                }} className="py-2 px-4">
                  <Plus size={16} /> Novo Banner
                </Button>
              </div>

              {/* Banners List */}
              <div className="space-y-3">
                {banners.map((banner) => (
                  <div key={banner.id} className="border border-border rounded-lg p-4 flex items-start gap-4 hover:bg-muted/50 transition-colors">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                      onError={(e: any) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"%3E%3Crect fill="%23334155" width="80" height="80"/%3E%3C/svg%3E';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm">{banner.title || '(sem título)'}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{banner.image_url}</p>
                      {banner.link_destination && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{banner.link_destination}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{banner.transition_speed / 1000}s</span>
                        <span>•</span>
                        <span>{banner.is_auto ? 'Automático' : 'Manual'}</span>
                        <span>•</span>
                        <span className={banner.is_active ? 'text-green-400' : 'text-gray-400'}>
                          {banner.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleBannerStatus.mutate({ bannerId: banner.id, isActive: !banner.is_active })}
                        className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                          banner.is_active
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                        }`}
                      >
                        {banner.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => handleEditBanner(banner)}
                        className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded font-medium transition-colors"
                      >
                        <Edit2 size={14} className="inline mr-1" /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="px-3 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded font-medium transition-colors"
                      >
                        <Trash2 size={14} className="inline mr-1" /> Remover
                      </button>
                    </div>
                  </div>
                ))}

                {banners.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    Nenhum banner criado. Clique em "Novo Banner" para começar.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Segurança</h2>
                  <p className="text-sm text-muted-foreground mt-1">Altere sua senha de admin</p>
                </div>
                <Button variant="primary" onClick={handleOpenAdminChangePassword} className="py-2 px-4">
                  Alterar Senha
                </Button>
              </div>
            </div>

            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Imagem do Hero</h2>
                  <p className="text-sm text-muted-foreground mt-1">Configure a imagem da página inicial</p>
                </div>
                <Button variant="primary" onClick={() => setShowHeroImageModal(true)} className="py-2 px-4">
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
              
              <form onSubmit={handleSaveSiteConfigs} className="mt-6 space-y-4">
                <h3 className="text-md font-semibold">Textos da Página Inicial</h3>
                <div className="grid grid-cols-1 gap-2">
                  <input type="text" maxLength={50} value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Nome do app" className="w-full p-2 rounded-lg bg-muted border border-border" />
                  <input type="text" maxLength={80} value={appSlogan} onChange={(e) => setAppSlogan(e.target.value)} placeholder="Slogan" className="w-full p-2 rounded-lg bg-muted border border-border" />
                  <input type="text" maxLength={160} value={descriptionText} onChange={(e) => setDescriptionText(e.target.value)} placeholder="Texto explicativo" className="w-full p-2 rounded-lg bg-muted border border-border" />
                  <input type="text" maxLength={30} value={mainButtonText} onChange={(e) => setMainButtonText(e.target.value)} placeholder="Texto do botão principal" className="w-full p-2 rounded-lg bg-muted border border-border" />
                  <input type="text" maxLength={60} value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Texto do rodapé" className="w-full p-2 rounded-lg bg-muted border border-border" />
                </div>

                <h3 className="text-md font-semibold pt-4">Logo do Aplicativo</h3>
                <div className="grid grid-cols-1 gap-2">
                  <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="URL do logo" className="w-full p-2 rounded-lg bg-muted border border-border" />
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Tamanho</label>
                    <input type="range" min={24} max={128} value={logoSize} onChange={(e) => setLogoSize(parseInt(e.target.value, 10))} />
                    <div className="w-12 text-xs text-muted-foreground">{logoSize}px</div>
                    <label className="ml-4 flex items-center gap-2"><input type="checkbox" checked={logoInHero} onChange={(e) => setLogoInHero(e.target.checked)} /> Exibir também no hero</label>
                  </div>
                </div>

                <h3 className="text-md font-semibold pt-4">Controles do Hero</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2"><label className="w-28">Largura</label><input type="range" min={40} max={100} value={heroWidthPct} onChange={(e) => setHeroWidthPct(parseInt(e.target.value, 10))} /><div className="w-12 text-xs text-muted-foreground">{heroWidthPct}%</div></div>
                  <div className="flex items-center gap-2"><label className="w-28">Altura</label><input type="number" value={heroHeightPx} onChange={(e) => setHeroHeightPx(parseInt(e.target.value || '0', 10))} className="w-24 p-2 rounded-lg bg-muted border border-border" /> px</div>
                  <div className="flex items-center gap-2"><label className="w-28">Fit</label><select value={heroObjectFit} onChange={(e) => setHeroObjectFit(e.target.value as any)} className="p-2 rounded-lg bg-muted border border-border"><option value="contain">Contain</option><option value="cover">Cover</option><option value="auto">Auto</option></select></div>
                  <div className="flex items-center gap-2"><label className="w-28">Align</label><select value={heroAlignment} onChange={(e) => setHeroAlignment(e.target.value as any)} className="p-2 rounded-lg bg-muted border border-border"><option value="center">Centro</option><option value="top">Topo</option><option value="bottom">Baixo</option></select></div>
                  <div className="flex items-center gap-2"><label className="w-28">Radius</label><input type="range" min={0} max={72} value={heroBorderRadius} onChange={(e) => setHeroBorderRadius(parseInt(e.target.value, 10))} /><div className="w-12 text-xs text-muted-foreground">{heroBorderRadius}px</div></div>
                </div>

                <h3 className="text-md font-semibold pt-4">Cores e Tema</h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2"><span className="w-28">Fundo</span><input type="color" value={homeBg} onChange={(e) => setHomeBg(e.target.value)} /></label>
                  <label className="flex items-center gap-2"><span className="w-28">Hero Início</span><input type="color" value={heroColorStart} onChange={(e) => setHeroColorStart(e.target.value)} /></label>
                  <label className="flex items-center gap-2"><span className="w-28">Hero Fim</span><input type="color" value={heroColorEnd} onChange={(e) => setHeroColorEnd(e.target.value)} /></label>
                  <label className="flex items-center gap-2"><span className="w-28">Card</span><input type="color" value={cardColor} onChange={(e) => setCardColor(e.target.value)} /></label>
                  <label className="flex items-center gap-2"><span className="w-28">Botão</span><input type="color" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} /></label>
                  <label className="flex items-center gap-2"><span className="w-28">Texto</span><input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} /></label>
                </div>

                <div className="flex justify-end pt-4">
                  <div className="flex items-center gap-4 mr-auto">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={enablePwa} onChange={(e) => setEnablePwa(e.target.checked)} /> Ativar PWA</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={enablePushNotifications} onChange={(e) => setEnablePushNotifications(e.target.checked)} /> Notificações Push</label>
                  </div>
                  <Button variant="outline" onClick={async () => {
                    // restore defaults
                    setAppName('MotoPoint'); setAppSlogan('Mototáxi rápido e seguro'); setDescriptionText('Escaneie o QR Code de um ponto para chamar um mototáxi'); setMainButtonText('Escanear QR Code'); setFooterText('MotoPoint © 2026');
                    setHeroWidthPct(80); setHeroHeightPx(320); setHeroObjectFit('contain'); setHeroAlignment('center'); setHeroBorderRadius(24);
                    setLogoUrl(''); setLogoSize(48); setLogoInHero(false);
                    setHomeBg('#071029'); setHeroColorStart('#081826'); setHeroColorEnd('#071029'); setCardColor('#0f1724'); setButtonColor('#111827'); setTextColor('#ffffff');
                  }}>Restaurar padrão</Button>
                  <Button type="submit" className="ml-2">Salvar configurações</Button>
                </div>
              </form>
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
                  onChange={(e) => setNewName(e.target.value)}
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
                  onChange={(e) => setNewAddress(e.target.value)}
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
                      onChange={(e) => setNewLat(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Longitude"
                      step="0.000001"
                      className="w-full p-2 text-sm rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                      value={newLng != null ? newLng : ''}
                      onChange={(e) => setNewLng(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                </div>
              </div>
              <Button type="button" variant="secondary" fullWidth onClick={handleUseLocation}>
                Capturar localização atual
              </Button>
              {newLat != null && newLng != null && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Coordenadas: {newLat.toFixed(6)}, {newLng.toFixed(6)}
                </p>
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
                  onChange={(e) => setDriverName(e.target.value)}
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
                      onChange={(e) => setDriverEmail(e.target.value)}
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
                      onChange={(e) => setDriverPassword(e.target.value)}
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
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
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
                  onChange={(e) => setMotoBrand(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Modelo</label>
                <input
                  type="text"
                  placeholder="Ex: CB 500, YZF-R3"
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={motoModel}
                  onChange={(e) => setMotoModel(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Cor</label>
                <input
                  type="text"
                  placeholder="Ex: Vermelho, Preto"
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={motoColor}
                  onChange={(e) => setMotoColor(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Placa</label>
                <input
                  type="text"
                  placeholder="Ex: ABC-1234"
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                  value={motoPlate}
                  onChange={(e) => setMotoPlate(e.target.value.toUpperCase())}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" fullWidth onClick={handleCloseDriverModal}>
                  Cancelar
                </Button>
                <Button type="submit" fullWidth disabled={creatingDriver}>
                  {creatingDriver ? (editingDriverId ? 'Atualizando...' : 'Cadastrando...') : editingDriverId ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
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
                  onChange={(e) => {
                    setHeroImageUrl(e.target.value);
                    setHeroImagePreview(e.target.value);
                  }}
                />
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
                    <p className="text-sm font-medium">Clique para selecionar</p>
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
                    <img src={heroImagePreview} alt="Preview" className="w-full h-48 object-cover" />
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
                <Button variant="primary" type="submit" disabled={savingHeroImage || (!heroImageUrl && !heroImageFile)}>
                  {savingHeroImage ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Driver Password */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-6 border border-border">
            <h2 className="text-xl font-bold mb-4">Alterar Senha do Motorista</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full p-3 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirmar Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a senha"
                  className="w-full p-3 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={changingPassword}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                >
                  {changingPassword ? 'Alterando...' : 'Alterar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change Admin Password */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-6 border border-border">
            <h2 className="text-xl font-bold mb-4">Alterar Sua Senha</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full p-3 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirmar Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a senha"
                  className="w-full p-3 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAdminPasswordModal(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={changingPassword}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                >
                  {changingPassword ? 'Alterando...' : 'Alterar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Banner Modal */}
      {showAddBannerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in">
            <h3 className="text-xl font-bold mb-4">
              {editingBannerId ? 'Editar Banner' : 'Novo Banner'}
            </h3>
            <form onSubmit={handleSaveBanner} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Título (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Promoção especial"
                  maxLength={100}
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">URL da Imagem *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={bannerImageUrl}
                  onChange={(e) => setBannerImageUrl(e.target.value)}
                />
                {bannerImageUrl && (
                  <img
                    src={bannerImageUrl}
                    alt="Preview"
                    className="w-full h-24 rounded-lg object-cover mt-2"
                    onError={(e: any) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"%3E%3Crect fill="%23334155" width="400" height="100"/%3E%3C/svg%3E';
                    }}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Link de Destino (opcional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  className="w-full p-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={bannerLinkDestination}
                  onChange={(e) => setBannerLinkDestination(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Velocidade de Transição: {bannerTransitionSpeed / 1000}s
                </label>
                <input
                  type="range"
                  min={1000}
                  max={15000}
                  step={500}
                  className="w-full"
                  value={bannerTransitionSpeed}
                  onChange={(e) => setBannerTransitionSpeed(parseInt(e.target.value, 10))}
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bannerIsAuto}
                  onChange={(e) => setBannerIsAuto(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">Carrossel automático</span>
              </label>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddBannerModal(false);
                    setEditingBannerId(null);
                    setBannerTitle('');
                    setBannerImageUrl('');
                    setBannerLinkDestination('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={savingBanner || !bannerImageUrl.trim()}
                >
                  {savingBanner ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                  {editingBannerId ? 'Atualizar' : 'Criar'}
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
