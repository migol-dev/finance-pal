import React, { useState, useMemo, useEffect } from 'react';
import { motion } from '@/lib/framer';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useSystemTheme } from '@/hooks/useSystemTheme';
import { useFinance } from '@/store/finance-store';
import { ACCENT_PALETTES } from '@/lib/accent-palette';
import { toast } from 'sonner';
import { Mail, Lock, Loader2, LogIn, UserPlus, Wallet, ShieldCheck, Key, ArrowLeft, Sparkles } from 'lucide-react';
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

// OAuth Redirect URI Allowlist - Security: Prevent open redirect attacks
const OAUTH_REDIRECT_ALLOWLIST = [
  'app.financepal.com://auth/callback', // Native Android app
  'https://financepal-web.vercel.app/auth/callback', // Production web/PWA
  'http://localhost:5173/auth/callback', // Local development (Vite default)
  'http://localhost:8080/auth/callback', // Local development (legacy)
  'http://localhost:3000/auth/callback', // Alternative local port
  'http://127.0.0.1:5173/auth/callback',
  'http://127.0.0.1:8080/auth/callback',
  'http://127.0.0.1:3000/auth/callback',
];

function isValidRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    // Allow exact matches from allowlist
    if (OAUTH_REDIRECT_ALLOWLIST.includes(uri)) return true;
    // Allow any subdomain of financepal.com in production
    if (parsed.hostname.endsWith('.financepal.com') && parsed.pathname === '/auth/callback') return true;
    // Allow localhost with any port in development
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;
    return false;
  } catch {
    return false;
  }
}

function getValidatedRedirectUri(_provider: 'google' | 'github'): string {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    const redirectUri = 'app.financepal.com://auth/callback';
    if (!isValidRedirectUri(redirectUri)) {
      throw new Error('URI de redirección nativa no permitida');
    }
    return redirectUri;
  }
  
  // Web: use VITE_PUBLIC_URL or current origin
  const baseUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
  const redirectUri = `${baseUrl}/auth/callback`;
  
  if (!isValidRedirectUri(redirectUri)) {
    throw new Error(`URI de redirección no permitida: ${redirectUri}. Configure VITE_PUBLIC_URL correctamente.`);
  }
  return redirectUri;
}

function calculatePasswordStrength(password: string): { score: number; label: string; color: string; feedback: string[] } {
  let score = 0;
  const feedback: string[] = [];
  if (password.length >= 8) score += 1; else feedback.push('Al menos 8 caracteres');
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1; else feedback.push('Minúsculas');
  if (/[A-Z]/.test(password)) score += 1; else feedback.push('Mayúsculas');
  if (/[0-9]/.test(password)) score += 1; else feedback.push('Números');
  if (/[^a-zA-Z0-9]/.test(password)) score += 1; else feedback.push('Símbolos');
  if (/(.)\\1{2,}/.test(password)) score = Math.max(0, score - 1);
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

/* ─── Floating Particles ─── */
function FloatingParticles() {
  const particles = useMemo(() => 
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: Math.random() * 12 + 14,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-primary/20 login-particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            bottom: '-10px',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Animated Background Orbs ─── */
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid pattern */}
      <div className="absolute inset-0 login-grid-bg" />
      
      {/* Orb 1 — Primary */}
      <div
        className="absolute login-orb-1 rounded-full"
        style={{
          width: '340px',
          height: '340px',
          top: '-5%',
          right: '-10%',
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.3), transparent 70%)',
        }}
      />
      {/* Orb 2 — Accent */}
      <div
        className="absolute login-orb-2 rounded-full"
        style={{
          width: '280px',
          height: '280px',
          bottom: '-8%',
          left: '-8%',
          background: 'radial-gradient(circle, hsl(var(--accent) / 0.25), transparent 70%)',
        }}
      />
      {/* Orb 3 — Secondary */}
      <div
        className="absolute login-orb-3 rounded-full"
        style={{
          width: '200px',
          height: '200px',
          top: '40%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, hsl(var(--secondary) / 0.15), transparent 70%)',
        }}
      />
      
      {/* Floating particles */}
      <FloatingParticles />
    </div>
  );
}

export default function Login() {
  const { session, mfaRequired, signOut, checkMfaStatus } = useAuth();
  const { resolvedTheme } = useSystemTheme();
  const accentColor = useFinance((s) => s.appSettings.accentColor);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [mfaCode, setMfaCode] = useState('');
  const [verifyingMfa, setVerifyingMfa] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  // Apply theme on Login page (outside AppShell)
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") root.classList.add("dark"); else root.classList.remove("dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolvedTheme === "dark" ? "#0a0e1a" : "#ffffff");
    // Apply accent vars
    const theme = root.classList.contains("dark") ? "dark" : "light";
    const p = ACCENT_PALETTES[theme][accentColor];
    root.style.setProperty("--accent-hue", String(p.hue));
    root.style.setProperty("--accent-saturation", p.saturation);
    root.style.setProperty("--accent-lightness", p.lightness);
    root.style.setProperty("--primary", p.primary);
    root.style.setProperty("--ring", p.ring);
    root.style.setProperty("--primary-muted", p.primaryMuted);
    root.style.setProperty("--primary-glow", p.primaryGlow);
    root.style.setProperty("--secondary", p.secondary);
    root.style.setProperty("--secondary-muted", p.secondaryMuted);
    root.style.setProperty("--accent", p.accent);
    root.style.setProperty("--accent-muted", p.accentMuted);
  }, [resolvedTheme, accentColor]);

  // Load TOTP factor ID if MFA is required
  React.useEffect(() => {
    if (session && mfaRequired) {
      supabase.auth.mfa.listFactors().then(({ data, error }) => {
        if (!error && data?.all) {
          const totp = data.all.find((f: any) => f.factor_type === 'totp' && f.status === 'verified');
          if (totp) setMfaFactorId(totp.id);
        }
      }).catch(console.error);
    }
  }, [session, mfaRequired]);

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true);
    try {
      // Validate redirect URI before initiating OAuth
      const redirectTo = getValidatedRedirectUri(provider);
      const isNative = Capacitor.isNativePlatform();

      const options: any = { redirectTo };
      if (isNative) {
        options.skipBrowserRedirect = true;
      }
      if (provider === 'google') {
        options.queryParams = { access_type: 'offline', prompt: 'consent' };
      } else {
        options.scopes = 'read:user user:email';
      }

      const { data, error } = await supabase.auth.signInWithOAuth({ provider, options });
      if (error) throw error;

      if (isNative && data?.url) {
        Browser.open({ url: data.url });
      }
      setLoading(false);
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
      if (strength.score < 3) {
        toast.error('La contraseña es demasiado débil. Usa al menos 8 caracteres con mayúsculas, números y símbolos.');
        return;
      }
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const needsMfa = await checkMfaStatus();
        if (!needsMfa) {
          toast.success('Sesión iniciada correctamente');
        }
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

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length !== 6) {
      toast.error('Introduce el código de 6 dígitos');
      return;
    }
    setVerifyingMfa(true);
    try {
      let factorId = mfaFactorId;
      if (!factorId) {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        const totp = data?.all?.find((f: any) => f.factor_type === 'totp' && f.status === 'verified');
        if (!totp) throw new Error('No se encontró el factor de autenticación');
        factorId = totp.id;
        setMfaFactorId(totp.id);
      }

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });
      if (verifyError) throw verifyError;

      await checkMfaStatus();
      toast.success('Autenticación de dos factores verificada');
    } catch (error: any) {
      toast.error(error.message || 'Código 2FA incorrecto o expirado');
    } finally {
      setVerifyingMfa(false);
    }
  };

  // If user is logged in and does not need MFA, show redirecting banner
  if (session && !mfaRequired) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4 bg-background relative overflow-hidden">
        <AnimatedBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center relative z-10"
        >
          <div className="size-16 rounded-2xl gradient-primary shadow-glow flex items-center justify-center mx-auto mb-4">
            <Wallet className="size-8 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Ya has iniciado sesión</h2>
          <p className="text-sm text-muted-foreground">Serás redirigido en breve.</p>
        </motion.div>
      </div>
    );
  }

  // 2FA TOTP Challenge Screen
  if (session && mfaRequired) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-4 bg-background relative overflow-hidden">
        <AnimatedBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm relative z-10"
        >
          <div className="login-glass-card rounded-3xl p-7 shadow-pop space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <motion.div
                  animate={{ rotate: [0, -8, 8, -4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <ShieldCheck className="size-8" />
                </motion.div>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">Verificación 2FA</h1>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Ingresa el código de 6 dígitos generado por tu aplicación de autenticación.
              </p>
            </motion.div>

            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  className="w-full pl-10 pr-4 py-3.5 bg-muted/30 border border-border/50 rounded-2xl text-center text-lg tracking-[0.3em] font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={verifyingMfa || mfaCode.length !== 6}
                className="w-full py-3 gradient-primary text-primary-foreground font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 text-sm shadow-glow hover:shadow-pop"
              >
                {verifyingMfa ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>Verificar código</>
                )}
              </motion.button>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                type="button"
                onClick={() => signOut()}
                className="w-full py-2 bg-transparent text-muted-foreground hover:text-foreground font-medium rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
              >
                <ArrowLeft className="size-3.5" /> Cancelar e iniciar con otra cuenta
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="login-glass-card rounded-3xl p-8 shadow-pop">
          {/* Header with animated logo */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-center mb-8"
          >
            <motion.div
              animate={{ 
                boxShadow: [
                  '0 0 20px 0 hsl(var(--primary) / 0.3)',
                  '0 0 40px 5px hsl(var(--primary) / 0.4)',
                  '0 0 20px 0 hsl(var(--primary) / 0.3)',
                ]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="size-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5"
            >
              <motion.div
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Wallet className="size-8 text-primary-foreground" />
              </motion.div>
            </motion.div>
            
            <h1 className="text-3xl font-extrabold tracking-tight login-text-gradient">
              Finance Pal
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="size-3.5 text-primary" />
              {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta para empezar'}
            </motion.p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="relative group"
            >
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="email"
                placeholder="Correo electrónico"
                className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border/50 rounded-2xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-muted/50 transition-all placeholder:text-muted-foreground/60"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </motion.div>

            {/* Password input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="relative group"
            >
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="password"
                placeholder="Contraseña"
                className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border/50 rounded-2xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-muted/50 transition-all placeholder:text-muted-foreground/60"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                minLength={8}
              />
            </motion.div>

            {/* Password strength meter (register only) */}
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <PasswordStrengthMeter password={password} />
              </motion.div>
            )}

            {/* Submit button */}
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              whileHover={{ scale: 1.01, boxShadow: '0 12px 40px -8px hsl(var(--primary) / 0.35)' }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 gradient-primary text-primary-foreground font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 text-sm shadow-glow"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isLogin ? (
                <><LogIn className="size-4" /> Iniciar Sesión</>
              ) : (
                <><UserPlus className="size-4" /> Crear Cuenta</>
              )}
            </motion.button>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="relative my-5"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="login-glass-card px-3 py-0.5 rounded-full text-muted-foreground font-medium tracking-wider">
                  O continúa con
                </span>
              </div>
            </motion.div>

            {/* OAuth buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="grid grid-cols-2 gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                disabled={loading}
                onClick={() => handleOAuth('google')}
                className="py-3 bg-muted/30 border border-border/50 rounded-2xl flex items-center justify-center gap-2.5 hover:bg-muted/50 hover:border-border transition-all disabled:opacity-60 text-sm font-medium"
              >
                <GoogleIcon /> Google
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                disabled={loading}
                onClick={() => handleOAuth('github')}
                className="py-3 bg-muted/30 border border-border/50 rounded-2xl flex items-center justify-center gap-2.5 hover:bg-muted/50 hover:border-border transition-all disabled:opacity-60 text-sm font-medium"
              >
                <GitHubIcon /> GitHub
              </motion.button>
            </motion.div>
          </form>

          {/* Toggle login/register */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center"
          >
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setPassword(''); }}
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors relative group"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
              <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-primary group-hover:w-full transition-all duration-300" />
            </button>
          </motion.div>
        </div>

        {/* Subtle footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-[11px] text-muted-foreground/50 mt-4"
        >
          Gestión financiera inteligente y segura
        </motion.p>
      </motion.div>
    </div>
  );
}
