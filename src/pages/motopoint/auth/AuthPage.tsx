import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/motopoint/Button';
import InstallButton from '@/components/motopoint/InstallButton';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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

  // Ensure service worker is registered when login page mounts
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW register failed', e));
    }
  }, []);

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans selection:bg-yellow-500/30">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[20%] w-[60%] h-[60%] bg-indigo-500/10 blur-[100px] rounded-full" />
        <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[80px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.3)] rotate-3"
          >
            <span className="text-4xl font-black text-slate-900 tracking-tighter">M</span>
          </motion.div>

          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{title}</h1>
          <p className="text-slate-400 flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" />
            Ambiente Seguro
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 ml-1 uppercase tracking-wide">Email Corporativo</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-yellow-400 transition-colors" size={20} />
                <input
                  type="email"
                  required
                  className="w-full py-3.5 pl-12 pr-4 rounded-xl bg-slate-950/50 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/50 transition-all font-medium"
                  placeholder="motorista@motoponto.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 ml-1 uppercase tracking-wide">Senha de Acesso</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-yellow-400 transition-colors" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full py-3.5 pl-12 pr-12 rounded-xl bg-slate-950/50 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/50 transition-all font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              disabled={loading}
              className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-black text-lg h-12 rounded-xl mt-2 transition-all shadow-[0_0_20px_rgba(250,204,21,0.15)] hover:shadow-[0_0_30px_rgba(250,204,21,0.3)] hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  Acessando...
                </span>
              ) : 'ENTRAR NO SISTEMA'}
            </Button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="w-full h-px bg-slate-800" />
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors group px-4 py-2 rounded-lg hover:bg-slate-800/50"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Voltar para o início
            </button>

            <div className="mt-2 scale-90 opacity-80 decoration-slate-900 grayscale hover:grayscale-0 transition-all">
              <InstallButton />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
