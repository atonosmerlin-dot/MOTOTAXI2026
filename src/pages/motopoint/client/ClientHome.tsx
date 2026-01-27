import React, { useState, useEffect } from 'react';
import { QrCode, Phone, MapPin, ChevronRight, Zap, Shield } from 'lucide-react';
import QRScanner from '@/components/QRScanner';
import RideRequestModal from '@/components/motopoint/RideRequestModal';
import { BannerCarousel } from '@/components/BannerCarousel';
import { useManifest } from '@/hooks/useManifest';
import siteConfig from '@/lib/siteConfig';
import InstallButton from '@/components/motopoint/InstallButton';
import { motion, AnimatePresence } from 'framer-motion';

const ClientHome: React.FC = () => {
  useManifest('/manifest-client.json');
  const [showScanner, setShowScanner] = useState(false);
  const [showRideModal, setShowRideModal] = useState(false);

  const [heroImage, setHeroImage] = useState<string>('');
  const [appName, setAppName] = useState('MotoPoint');
  const [appSlogan, setAppSlogan] = useState('Mototáxi rápido e seguro');
  const [footerText, setFooterText] = useState('MotoPoint © 2026');

  // Visual Configs
  const [heroWidthPct, setHeroWidthPct] = useState(80);
  const [heroHeightPx, setHeroHeightPx] = useState(320);
  const [heroObjectFit, setHeroObjectFit] = useState<'contain' | 'cover' | 'auto'>('contain');
  const [heroAlignment, setHeroAlignment] = useState<'center' | 'top' | 'bottom'>('center');
  const [logoUrl, setLogoUrl] = useState('');

  // Theme
  const [homeBg, setHomeBg] = useState('#0f172a');
  const [heroColorStart, setHeroColorStart] = useState('#0f172a');
  const [heroColorEnd, setHeroColorEnd] = useState('#1e293b');

  useEffect(() => {
    const load = async () => {
      try {
        const cfg = await siteConfig.getSiteConfigs();
        if (cfg.hero_image_url) setHeroImage(cfg.hero_image_url);
        if (cfg.app_name) setAppName(cfg.app_name);
        if (cfg.app_slogan) setAppSlogan(cfg.app_slogan);
        if (cfg.footer_text) setFooterText(cfg.footer_text);
        if (cfg.hero_width_pct) setHeroWidthPct(parseInt(cfg.hero_width_pct, 10) || 80);
        if (cfg.hero_height_px) setHeroHeightPx(parseInt(cfg.hero_height_px, 10) || 320);
        if (cfg.hero_object_fit) setHeroObjectFit(cfg.hero_object_fit as any);
        if (cfg.hero_alignment) setHeroAlignment(cfg.hero_alignment as any);
        if (cfg.logo_url) setLogoUrl(cfg.logo_url);
        if (cfg.home_bg) setHomeBg(cfg.home_bg);
        if (cfg.hero_color_start) setHeroColorStart(cfg.hero_color_start);
        if (cfg.hero_color_end) setHeroColorEnd(cfg.hero_color_end);
      } catch (error) {
        console.warn('Failed to load site config', error);
      }
    };
    load();
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col font-sans relative overflow-x-hidden selection:bg-yellow-500/30"
      style={{
        background: `linear-gradient(to bottom, ${homeBg} 0%, ${homeBg} 80%, #000000 100%)`,
        color: '#f8fafc'
      }}
    >
      {/* Background Grid & Ambient Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-600/10 via-purple-600/5 to-transparent blur-3xl" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-yellow-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl border-b border-white/5 bg-slate-900/60 shadow-xl">
        <div className="max-w-md mx-auto px-5 py-3.5 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3.5"
          >
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition duration-500" />
              <div className="relative w-11 h-11 bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} className="w-7 h-7 object-contain" alt="Logo" />
                ) : (
                  <span className="text-xl font-black text-yellow-500">M</span>
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white tracking-tight leading-tight">{appName}</h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-[0.15em] uppercase mt-0.5 opacity-80">{appSlogan}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <InstallButton />
          </motion.div>
        </div>
      </header>

      {/* Main Scrollable Area */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 pt-8 pb-20 relative z-10 space-y-6">

        {/* Hero Section */}
        <section className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 rounded-[2.5rem] overflow-hidden bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md group"
          >
            {/* Spotlight Effect Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-white/5 pointer-events-none" />

            <div className="w-full flex items-center justify-center p-8 h-[240px]" style={{ minHeight: `${Math.max(240, heroHeightPx)}px` }}>
              <div
                style={{
                  width: `${heroWidthPct}%`,
                  height: '100%',
                  display: 'flex',
                  alignItems: heroAlignment === 'top' ? 'flex-start' : heroAlignment === 'bottom' ? 'flex-end' : 'center',
                  justifyContent: 'center'
                }}
              >
                {heroImage ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.7 }}
                    className="relative"
                  >
                    <img
                      src={heroImage}
                      alt="Destaque"
                      className="drop-shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative z-10 max-h-full max-w-full"
                      style={{ objectFit: heroObjectFit as any }}
                    />
                    {/* Inner highlight */}
                    <div className="absolute -inset-4 bg-yellow-500/5 blur-3xl -z-10 rounded-full" />
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-white/5">
                      <Zap size={32} className="text-yellow-500 animate-pulse" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-50">Pronto para rodar</p>
                  </div>
                )}
              </div>
            </div>

            {/* Shine Sweep Animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1500 ease-in-out pointer-events-none" />
          </motion.div>

          {/* Glowing Aura behind hero */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-4/5 h-20 bg-blue-500/20 blur-3xl -z-10 opacity-50" />
        </section>

        {/* Primary Actions */}
        <section className="grid grid-cols-1 gap-4.5">
          {/* Scan Button */}
          <motion.button
            whileHover={{ scale: 1.02, translateY: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowScanner(true)}
            className="relative overflow-hidden group rounded-3xl p-px bg-gradient-to-br from-yellow-400/50 via-amber-500/30 to-transparent"
          >
            <div className="bg-slate-900/90 hover:bg-slate-900/40 backdrop-blur-3xl rounded-[1.7rem] p-6 flex items-center justify-between transition-all duration-300">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-600/10 flex items-center justify-center text-yellow-400 border border-yellow-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <QrCode size={28} />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black text-white group-hover:text-yellow-400 transition-colors tracking-tight">Escanear QR</h3>
                  <p className="text-xs text-slate-400 font-medium opacity-80">Conectar a um ponto fixo</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-slate-950 group-hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all duration-300">
                <ChevronRight size={20} />
              </div>
            </div>
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </motion.button>

          {/* Direct Call Button */}
          <motion.button
            whileHover={{ scale: 1.02, translateY: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowRideModal(true)}
            className="relative overflow-hidden group rounded-3xl p-px bg-gradient-to-br from-emerald-500/50 via-teal-600/30 to-transparent"
          >
            <div className="bg-slate-900/90 hover:bg-slate-900/40 backdrop-blur-3xl rounded-[1.7rem] p-6 flex items-center justify-between transition-all duration-300">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Phone size={28} />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors tracking-tight">Chamar Agora</h3>
                  <p className="text-xs text-slate-400 font-medium opacity-80">Usar minha localização atual</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-300">
                <MapPin size={20} />
              </div>
            </div>
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </motion.button>
        </section>

        {/* Features / Banners */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-yellow-500/60" />
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Destaques VIP</span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="rounded-3xl overflow-hidden shadow-2xl border border-white/5 bg-slate-900/20"
          >
            <BannerCarousel />
          </motion.div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-6 text-center relative z-10 border-t border-white/5 bg-slate-950/30 backdrop-blur-md">
        <p className="text-[10px] text-slate-500 font-medium tracking-wide">
          {footerText}
        </p>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
          >
            <QRScanner open={showScanner} onClose={() => setShowScanner(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <RideRequestModal
        open={showRideModal}
        onClose={() => setShowRideModal(false)}
        pointId="direct"
        pointName="Minha Localização"
      />
    </div>
  );
};

export default ClientHome;
