import React, { useState, useMemo } from 'react';
import { motion } from '@/lib/framer';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Mail, Lock, Loader2, LogIn, UserPlus, Wallet } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const GitHubIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
  </svg>
);

function calculatePasswordStrength(password: string): { score: number; label: string; color: string; feedback: string[] } {
  let score = 0;
  const feedback: string[] = [];
  if (password.length >= 8) score += 1; else feedback.push('Al menos 8 caracteres');
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1; else feedback.push('Minúsculas');
  if (/[A-Z]/.test(password)) score += 1; else feedback.push('Mayúsculas');
  if (/[0-9]/.test(password)) score += 1; else feedback.push('Números');
  if (/[^a-zA-Z0-9]/.test(password)) score += 1; else feedback.push('Símbolos');
  if (/(.)\1{2,}/.test(password)) score = Math.max(0, score - 1);
  if (/^(?:password|123456|qwerty|admin|finance)/i.test(password)) score = 0;

  const labels = ['Muy débil', 'Débil', 'Media', 'Fuerte', 'Muy fuerte'];
  const colors = ['text-destructive', 'text-orange-500', 'text-yellow-500', 'text-lime-500', 'text-green-500'];

  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    color: colors[Math.min(score, 4)],
    feedback,
  };
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);
  if (!password) return null;
  return (
    <div className="space-y-1.5 mt-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${strength.color}`}>{strength.label}</span>
        <span className="text-[11px] text-muted-foreground">
          {strength.feedback.length > 0 ? `Falta: ${strength.feedback.join(', ')}` : 'Cumple todos los requisitos'}
        </span>
      </div>
      <Progress value={((strength.score + 1) / 5) * 100} className="h-1" />
    </div>
  );
}

export default function Login() {
  const { session } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true);
    try {
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        const redirectTo = 'app.financepal.com://auth/callback';
        const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
        if (error) throw error;
        if (data?.url) {
          await Browser.open({ url: data.url });
        }
      } else {
        const options: any = {
          redirectTo: `${window.location.origin}/auth/callback`,
        };
        if (provider === 'google') {
          options.queryParams = { access_type: 'offline', prompt: 'consent' };
        } else {
          options.scopes = 'read:user user:email';
        }
        const { error } = await supabase.auth.signInWithOAuth({ provider, options });
        if (error) throw error;
      }
    } catch (error: any) {
      toast.error(error.message || `Error al iniciar sesión con ${provider}`);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Por favor llena todos los campos');
      return;
    }
    if (!isLogin) {
      const strength = calculatePasswordStrength(password);
      if (strength.score < 2) {
        toast.error('La contraseña es demasiado débil. Usa al menos 8 caracteres con mayúsculas, números y símbolos.');
        return;
      }
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Sesión iniciada correctamente');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Cuenta creada. Revisa tu correo para verificar.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  if (session) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4 bg-background">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Ya has iniciado sesión</h2>
          <p className="text-sm text-muted-foreground">Serás redirigido en breve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-50" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative"
      >
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="text-center mb-6">
            <div className="size-12 rounded-xl gradient-primary shadow-glow flex items-center justify-center mx-auto mb-3">
              <Wallet className="size-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">Finance Pal</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLogin ? 'Inicia sesión para continuar' : 'Crea tu cuenta para empezar'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Correo electrónico"
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="password"
                placeholder="Contraseña"
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                minLength={8}
              />
            </div>
            {!isLogin && <PasswordStrengthMeter password={password} />}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-60 text-sm"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isLogin ? (
                <><LogIn className="size-4" /> Iniciar Sesión</>
              ) : (
                <><UserPlus className="size-4" /> Crear Cuenta</>
              )}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-card px-2 text-muted-foreground font-medium">O continúa con</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={loading} onClick={() => handleOAuth('google')}
                className="py-2.5 bg-background border border-border rounded-xl flex items-center justify-center gap-2 hover:bg-muted/50 transition-all disabled:opacity-60 text-sm font-medium">
                <GoogleIcon /> Google
              </button>
              <button type="button" disabled={loading} onClick={() => handleOAuth('github')}
                className="py-2.5 bg-background border border-border rounded-xl flex items-center justify-center gap-2 hover:bg-muted/50 transition-all disabled:opacity-60 text-sm font-medium">
                <GitHubIcon /> GitHub
              </button>
            </div>
          </form>

          <div className="mt-5 text-center">
            <button type="button" onClick={() => { setIsLogin(!isLogin); setPassword(''); }}
              className="text-sm text-primary hover:underline font-medium">
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
