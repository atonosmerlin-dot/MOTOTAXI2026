import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, MapPin } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
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

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[500px]">
          {/* Text Content */}
          <div className="text-white space-y-6">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-4">
                Sua Corrida de Moto <span className="text-yellow-400">Rápida</span> e <span className="text-yellow-400">Segura</span>
              </h2>
              <p className="text-slate-300 text-lg">
                Conectando motoristas profissionais e passageiros em tempo real. 
                Chegue onde precisa com segurança e rapidez.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => navigate('/scan')}
                className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold py-3 px-8 rounded-xl transition-colors"
              >
                <QrCode size={20} />
                Escanear QR Code
              </button>
              <button
                onClick={() => navigate('/driver/login')}
                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-xl transition-colors border border-slate-600"
              >
                <MapPin size={20} />
                Sou Motorista
              </button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative h-96 lg:h-[500px] flex items-center justify-center">
            {imageError ? (
              <div className="w-full h-full bg-slate-700 rounded-2xl flex items-center justify-center">
                <p className="text-slate-400">Imagem não disponível</p>
              </div>
            ) : (
              <img
                src={heroImage}
                alt="MotoPoint"
                className="w-full h-full object-cover rounded-2xl shadow-2xl"
                onError={() => setImageError(true)}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-slate-400">
          <p>MotoPoint © 2026 - Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
