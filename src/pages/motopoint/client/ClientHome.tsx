import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFixedPoints } from '@/hooks/useFixedPoints';
import { MapPin, QrCode, Loader2 } from 'lucide-react';
import QRScanner from '@/components/QRScanner';

const ClientHome: React.FC = () => {
  const { data: points = [], isLoading } = useFixedPoints();
  const [showScanner, setShowScanner] = useState(false);

  return (
    <div className="min-h-screen bg-muted flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-6 py-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">M</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">MotoPoint</h1>
            <p className="text-sm text-muted-foreground">Mototáxi rápido e seguro</p>
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 bg-yellow-400/20 rounded-xl flex items-center justify-center">
            <QrCode size={28} className="text-yellow-400" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Escaneie o QR Code</h2>
            <p className="text-sm text-muted-foreground">Ou selecione um ponto abaixo</p>
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
      </header>
      <QRScanner open={showScanner} onClose={() => setShowScanner(false)} />

      {/* Content */}
      <main className="flex-1 px-4 py-6">
        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-4">
          Pontos Disponíveis
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <div className="space-y-3">
            {points.map(point => (
              <Link 
                key={point.id} 
                to={`/point/${point.id}`}
                className="flex items-center gap-4 bg-card p-4 rounded-2xl shadow-sm border border-border active:scale-[0.98] transition-all"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <MapPin size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg">{point.name}</h4>
                  <p className="text-sm text-muted-foreground">{point.address}</p>
                </div>
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-muted-foreground">→</span>
                </div>
              </Link>
            ))}
            
            {points.length === 0 && (
              <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
                <MapPin className="mx-auto mb-3 text-muted-foreground" size={40} />
                <p className="text-muted-foreground">Nenhum ponto disponível no momento.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 py-4 text-center text-xs text-muted-foreground border-t border-border">
        <p>MotoPoint © 2026</p>
      </footer>
    </div>
  );
};

export default ClientHome;

