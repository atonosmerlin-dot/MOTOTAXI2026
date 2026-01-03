import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/motopoint/Button';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react';

interface AuthPageProps {
  redirectTo?: string;
  title?: string;
}

const AuthPage: React.FC<AuthPageProps> = ({ redirectTo = '/', title = 'Área Restrita' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirectTo);
    }
  }, [user, authLoading, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success('Login realizado com sucesso!');
    } catch (err) {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-yellow-400 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">M</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{title}</h1>
          <p className="text-muted-foreground">Entre com suas credenciais</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 rounded-2xl shadow-xl">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="email"
                required
                className="w-full p-4 pl-10 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full p-4 pl-10 pr-12 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          <button 
            type="button"
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <ArrowLeft size={16} /> Voltar para início
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
