import React, { useState } from 'react';
import { QrCode } from 'lucide-react';
import QRScanner from '@/components/QRScanner';

const ClientHome: React.FC = () => {
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
      <main className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            Escaneie o QR Code de um ponto para chamar um mototáxi
          </p>
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

