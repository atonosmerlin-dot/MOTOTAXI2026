import React, { useState, useEffect } from 'react';
import { QrCode } from 'lucide-react';
import QRScanner from '@/components/QRScanner';
import { useManifest } from '@/hooks/useManifest';
import siteConfig from '@/lib/siteConfig';
import InstallButton from '@/components/motopoint/InstallButton';

const ClientHome: React.FC = () => {
  useManifest('/manifest-client.json');
  const [showScanner, setShowScanner] = useState(false);

  const [heroImage, setHeroImage] = useState<string>('');
  const [appName, setAppName] = useState('MotoPoint');
  const [appSlogan, setAppSlogan] = useState('Mototáxi rápido e seguro');
  const [descriptionText, setDescriptionText] = useState('Escaneie o QR Code de um ponto para chamar um mototáxi');
  const [mainButtonText, setMainButtonText] = useState('Escanear QR Code');
  const [footerText, setFooterText] = useState('MotoPoint © 2026');

  const [heroWidthPct, setHeroWidthPct] = useState(80);
  const [heroHeightPx, setHeroHeightPx] = useState(320);
  const [heroObjectFit, setHeroObjectFit] = useState<'contain'|'cover'|'auto'>('contain');
  const [heroAlignment, setHeroAlignment] = useState<'center'|'top'|'bottom'>('center');
  const [heroBorderRadius, setHeroBorderRadius] = useState(24);

  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState(48);

  const [homeBg, setHomeBg] = useState('#071029');
  const [heroColorStart, setHeroColorStart] = useState('#081826');
  const [heroColorEnd, setHeroColorEnd] = useState('#071029');

  useEffect(() => {
    const load = async () => {
      const cfg = await siteConfig.getSiteConfigs();
      if (cfg.hero_image_url) setHeroImage(cfg.hero_image_url);
      if (cfg.app_name) setAppName(cfg.app_name);
      if (cfg.app_slogan) setAppSlogan(cfg.app_slogan);
      if (cfg.description_text) setDescriptionText(cfg.description_text);
      if (cfg.main_button_text) setMainButtonText(cfg.main_button_text);
      if (cfg.footer_text) setFooterText(cfg.footer_text);
      if (cfg.hero_width_pct) setHeroWidthPct(parseInt(cfg.hero_width_pct, 10) || 80);
      if (cfg.hero_height_px) setHeroHeightPx(parseInt(cfg.hero_height_px, 10) || 320);
      if (cfg.hero_object_fit) setHeroObjectFit(cfg.hero_object_fit as any);
      if (cfg.hero_alignment) setHeroAlignment(cfg.hero_alignment as any);
      if (cfg.hero_border_radius) setHeroBorderRadius(parseInt(cfg.hero_border_radius, 10) || 24);
      if (cfg.logo_url) setLogoUrl(cfg.logo_url);
      if (cfg.logo_size) setLogoSize(parseInt(cfg.logo_size, 10) || 48);
      if (cfg.home_bg) setHomeBg(cfg.home_bg);
      if (cfg.hero_color_start) setHeroColorStart(cfg.hero_color_start);
      if (cfg.hero_color_end) setHeroColorEnd(cfg.hero_color_end);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto" style={{ background: homeBg }}>
      {/* Header (compact) */}
      <header className="text-primary-foreground px-6 py-6 rounded-b-3xl shadow-lg" style={{ background: `linear-gradient(180deg, ${heroColorStart} 0%, ${heroColorEnd} 100%)` }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">M</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-2xl font-bold">{appName}</h1>
                <p className="text-sm text-muted-foreground">{appSlogan}</p>
              </div>
              <div className="ml-2 hidden sm:block">
                <InstallButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      <QRScanner open={showScanner} onClose={() => setShowScanner(false)} />

      {/* Content */}
      <main className="flex-1 px-4 py-6">
        {/* Hero / visual area */}
        <div className="flex items-center justify-center w-full">
          <div className="w-full max-w-lg h-64 sm:h-80 md:h-96 flex items-center justify-center rounded-3xl overflow-hidden shadow-inner" style={{ background: 'linear-gradient(180deg,#081826 0%, #071029 100%)' }}>
            <div className="text-center px-4 w-full">
              {/* Configurable illustration/logo */}
                <div className="mx-auto w-full flex items-center justify-center" style={{ maxWidth: `${heroWidthPct}%` }}>
                  <div style={{ width: '100%', height: `${heroHeightPx}px`, display: 'flex', alignItems: heroAlignment === 'top' ? 'flex-start' : heroAlignment === 'bottom' ? 'flex-end' : 'center', justifyContent: 'center', borderRadius: heroBorderRadius }}>
                    {heroImage ? (
                      <img src={heroImage} alt="Hero" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: heroObjectFit as any }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-yellow-300 text-4xl">🏍️</div>
                      </div>
                    )}
                  </div>
                </div>
            </div>
          </div>
        </div>

        {/* Action card: placed below the hero with spacing */}
        <div className="mx-auto mt-6 max-w-md px-2">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 flex items-center gap-4 shadow-lg">
            <div className="w-14 h-14 bg-yellow-400/20 rounded-xl flex items-center justify-center">
              <QrCode size={28} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Escaneie o QR Code</h2>
              <p className="text-sm text-muted-foreground">Leia o QR code de um ponto</p>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setShowScanner(true)}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-md"
              >
                Escanear QR Code
              </button>
            </div>
          </div>

          <div className="pt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Escaneie o QR Code de um ponto para chamar um mototáxi
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-4 text-center text-xs text-muted-foreground border-t border-border">
        <p>MotoPoint © 2026</p>
      </footer>
    </div>
  );
};

export default ClientHome;

