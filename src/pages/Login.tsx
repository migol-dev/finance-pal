import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Mail, Lock, Loader2, LogIn, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

function calculatePasswordStrength(password: string): { score: number; label: string; color: string; feedback: string[] } {
  let score = 0;
  const feedback: string[] = [];
  
  if (password.length >= 8) score += 1; else feedback.push('Al menos 8 caracteres');
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1; else feedback.push('Minúsculas');
  if (/[A-Z]/.test(password)) score += 1; else feedback.push('Mayúsculas');
  if (/[0-9]/.test(password)) score += 1; else feedback.push('Números');
  if (/[^a-zA-Z0-9]/.test(password)) score += 1; else feedback.push('Símbolos');
  
  // Penalize common patterns
  if (/(.)\1{2,}/.test(password)) score = Math.max(0, score - 1); // repeated chars
  if (/^(?:password|123456|qwerty|admin|finance)/i.test(password)) score = 0; // common passwords
  
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
    <div className="space-y-2 mt-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${strength.color}`}>
          {strength.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {strength.feedback.length > 0 ? `Falta: ${strength.feedback.join(', ')}` : '✓ Cumple todos los requisitos'}
        </span>
      </div>
      <Progress value={((strength.score + 1) / 5) * 100} className="h-1.5" />
    </div>
  );
}

export default function Login() {
  const { session } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
          <h2 className="text-2xl font-bold mb-2">Ya has iniciado sesión</h2>
          <p className="text-muted-foreground">Serás redirigido en breve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-background">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card p-8 rounded-3xl shadow-lg border border-border"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black gradient-text mb-2">
            Finance Pal
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLogin ? 'Inicia sesión para continuar' : 'Crea tu cuenta para empezar'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                type="email" 
                placeholder="Correo electrónico" 
                className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                type="password" 
                placeholder="Contraseña" 
                className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                minLength={8}
              />
            </div>
            {!isLogin && <PasswordStrengthMeter password={password} />}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn className="w-5 h-5" /> Iniciar Sesión
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" /> Crear Cuenta
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setPassword(''); }}
            className="text-sm text-primary hover:underline font-medium"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}