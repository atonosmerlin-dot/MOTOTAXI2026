import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const [heroImage, setHeroImage] = useState('https://via.placeholder.com/600x400?text=MotoPoint');
  const [imageError, setImageError] = useState(false);
  const [showSecondImage, setShowSecondImage] = useState(true);

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
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Side - Hero Images */}
            <div className="flex flex-col items-center justify-center space-y-6">
              {/* Main Hero Image */}
              <div className="relative w-full h-80 flex items-center justify-center">
                {imageError ? (
                  <div className="w-full h-80 bg-slate-800 rounded-3xl flex items-center justify-center">
                    <p className="text-slate-500">Imagem não disponível</p>
                  </div>
                ) : (
                  <img
                    src={heroImage}
                    alt="MotoPoint"
                    className="w-full h-full object-contain drop-shadow-2xl"
                    onError={() => setImageError(true)}
                  />
                )}
              </div>

              {/* Secondary Driver Image */}
              {showSecondImage && (
                <div className="relative w-full h-64 flex items-center justify-center">
                  <img
                    src="/aqui.png"
                    alt="Motorista MotoPoint"
                    className="w-full h-full object-contain drop-shadow-2xl"
                    onError={() => setShowSecondImage(false)}
                  />
                </div>
              )}
            </div>

            {/* Right Side - Content */}
            <div className="space-y-8">
              {/* Title */}
              <div>
                <h2 className="text-4xl lg:text-5xl font-bold text-white mb-2">
                  Escaneia o QR<br />Code
                </h2>
                <p className="text-slate-400 text-lg">
                  Ou selecione um ponto abaixo
                </p>
              </div>

              {/* QR Card */}
              <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-3xl p-8">
                <div className="flex items-center gap-6">
                  {/* Icon */}
                  <div className="bg-yellow-600/30 p-6 rounded-2xl flex-shrink-0">
                    <QrCode className="text-yellow-400" size={48} />
                  </div>
                  
                  {/* Text and Button */}
                  <div className="flex-1">
                    <p className="text-slate-300 text-sm mb-2">Código QR</p>
                    <button
                      onClick={() => navigate('/scan')}
                      className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold py-3 px-8 rounded-xl transition-colors w-full"
                    >
                      Escanear QR Code
                    </button>
                  </div>
                </div>
              </div>

              {/* Info Text */}
              <p className="text-slate-400 text-center lg:text-left text-sm">
                Escaneia o QR Code de um ponto para chamar um mototáxi
              </p>
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
};

export default Index;
