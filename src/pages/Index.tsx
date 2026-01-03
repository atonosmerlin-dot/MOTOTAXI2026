import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Index: React.FC = () => {
  const navigate = useNavigate();
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
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-slate-900">
              M
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MotoPoint</h1>
              <p className="text-xs text-slate-400">Mototáxi rápido e seguro</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl space-y-12">
          {/* Hero Image - Large and Centered */}
          <div className="relative w-full h-80 md:h-96 flex items-center justify-center">
            {imageError ? (
              <div className="w-full h-full bg-slate-800 rounded-3xl flex items-center justify-center">
                <p className="text-slate-500">Imagem não disponível</p>
              </div>
            ) : (
              <img
                src={heroImage}
                alt="MotoPoint"
                className="w-full h-full object-contain"
                onError={() => setImageError(true)}
              />
            )}
          </div>

          {/* QR Card */}
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between gap-6">
              {/* Left Side - Text and Icon */}
              <div className="flex-1 flex items-start gap-4">
                <div className="bg-yellow-600/30 p-4 rounded-2xl flex-shrink-0">
                  <QrCode className="text-yellow-400" size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    Escaneia o QR<br />Code
                  </h2>
                  <p className="text-slate-400 text-sm">
                    Ou selecione um ponto abaixo
                  </p>
                </div>
              </div>

              {/* Right Side - Button */}
              <button
                onClick={() => navigate('/scan')}
                className="flex-shrink-0 bg-slate-900 hover:bg-slate-700 text-white font-bold py-4 px-6 rounded-2xl transition-colors text-center whitespace-nowrap h-fit"
              >
                <div className="text-sm">Escanear QR</div>
                <div className="text-sm">Code</div>
              </button>
            </div>
          </div>

          {/* Info Text */}
          <p className="text-center text-slate-400 text-sm md:text-base">
            Escaneia o QR Code de um ponto para chamar um mototáxi
          </p>
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
};

export default Index;
