import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="bg-card px-4 py-3 shadow-sm z-10 flex justify-between items-center sticky top-0">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-primary">
            M
          </div>
          <h1 className="font-bold text-xl tracking-tight">{title || 'MotoPoint'}</h1>
        </div>
        
        {user && (
          <button 
            onClick={async () => {
              if (confirm('Sair do aplicativo?')) {
                await signOut();
                navigate('/');
              }
            }}
            className="p-2 text-muted-foreground hover:bg-muted rounded-full"
          >
            <LogOut size={20} />
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {children}
      </main>
    </div>
  );
};

export default Layout;
