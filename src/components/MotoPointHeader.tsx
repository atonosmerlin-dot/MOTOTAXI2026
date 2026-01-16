import React from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface MotoPointHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
}

export const MotoPointHeader: React.FC<MotoPointHeaderProps> = ({
  title,
  subtitle,
  showLogo = true,
}) => {
  const { showInstallPrompt, handleInstallClick } = usePWAInstall();

  return (
    <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {showLogo && (
              <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-slate-900">
                M
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{title}</h1>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>

          {showInstallPrompt && (
            <button
              onClick={handleInstallClick}
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold py-2 px-3 rounded-lg flex items-center gap-2 transition-colors text-sm whitespace-nowrap"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Instalar app</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
