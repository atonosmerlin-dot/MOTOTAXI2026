import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import BannerCarousel from '@/components/BannerCarousel';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { showInstallPrompt, handleInstallClick } = usePWAInstall();
  const [bannersCount, setBannersCount] = useState<number | null>(null);
  const [bannersError, setBannersError] = useState<string | null>(null);
  const [bannersList, setBannersList] = useState<any[]>([]);
  const [heroImage, setHeroImage] = useState('https://via.placeholder.com/600x400?text=MotoPoint');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Fetch hero image from config
    const fetchHeroImage = async () => {
      try {
        const { data } = await supabase
          .from('site_config')
          .select('value')
          .eq('key', 'hero_image_url')
          .maybeSingle();
        
        if (data?.value) {
          setHeroImage(data.value);
        }
      } catch (e) {
        console.warn('Could not fetch hero image:', e);
      }
    };

    fetchHeroImage();
    
    // Debug: fetch banners directly (aggressive debug)
    (async () => {
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true);
        
        if (error) {
          console.error('Banners fetch error:', error);
          setBannersError(`Error: ${error.message}`);
          setBannersCount(0);
        } else {
          const count = (data || []).length;
          setBannersCount(count);
          setBannersList(data || []);
          console.info('Debug: fetched banners count', count);
          if (count > 0) {
            console.info('Banners:', data);
          }
        }
      } catch (e: any) {
        console.error('Exception fetching banners:', e);
        setBannersError(`Exception: ${e?.message || String(e)}`);
        setBannersCount(0);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-slate-900">
                M
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">MotoPoint</h1>
                <p className="text-xs text-slate-400">Mototáxi rápido e seguro</p>
              </div>
            </div>
            
            {showInstallPrompt && (
              <button
                onClick={handleInstallClick}
                className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm"
              >
                <Download size={18} />
                Instalar app
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-4 pt-12 pb-8">
        <div className="w-full max-w-2xl">
          {/* Hero area with illustration + QR card */}
          <div className="w-full">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-20 py-6">
              {/* Illustration */}
              <div className="w-full md:w-1/2 flex items-center justify-center">
                <img
                  src="/aqui.png"
                  alt="Ilustração MotoPoint"
                  className="w-full max-w-sm md:max-w-lg object-contain mt-4 md:mt-0"
                  onError={(e: any) => { e.currentTarget.onerror = null; e.currentTarget.src = '/aqui-fallback.svg'; }}
                />
              </div>

              {/* QR Card (right) */}
              <div className="w-full md:w-1/2 px-4">
                <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 md:p-8 shadow-lg">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex-1 flex items-start gap-4">
                      <div className="bg-yellow-600/30 p-4 rounded-2xl flex-shrink-0">
                        <QrCode className="text-yellow-400" size={32} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-1">
                          Escaneie o QR<br />Code
                        </h2>
                        <p className="text-slate-400 text-sm">Ou selecione um ponto abaixo</p>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate('/scan')}
                      className="flex-shrink-0 bg-slate-900 hover:bg-slate-700 text-white font-bold py-4 px-6 rounded-2xl transition-colors text-center whitespace-nowrap h-fit"
                    >
                      <div className="text-sm">Escanear QR</div>
                      <div className="text-sm">Code</div>
                    </button>
                  </div>

                  <p className="text-center text-slate-400 text-sm md:text-base mt-6">Escaneie o QR Code de um ponto para chamar um mototáxi</p>
                </div>
              </div>
            </div>
            </div>

            {/* Banner Carousel */}
            <div className="w-full px-4 mt-12 mb-8">
              <div className="bg-red-900/30 border-2 border-red-600 p-4 rounded-lg mb-6">
                <div className="text-sm text-white font-bold">
                  🔴 DEBUG BANNER CAROUSEL:
                </div>
                <div className="text-xs text-slate-200 mt-2">
                  <p>Banners found: {bannersCount === null ? 'loading...' : bannersCount}</p>
                  {bannersError && <p className="text-red-300 mt-1">❌ Error: {bannersError}</p>}
                  {bannersList.length > 0 && (
                    <div className="mt-2 space-y-1 text-slate-300">
                      <p className="font-bold">Data:</p>
                      {bannersList.map((b, i) => (
                        <div key={b.id} className="ml-2">
                          {i + 1}. Title: {b.title} | Active: {b.is_active}
                          <div className="text-xs text-slate-400 ml-4">URL: {b.image_url}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <BannerCarousel className="w-full" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-slate-500 text-sm">
          <p>MotoPoint © 2026</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
