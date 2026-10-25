import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useSystemTheme } from "@/hooks/useSystemTheme";
import { useFinance } from "@/store/finance-store";
import { ACCENT_PALETTES } from "@/lib/accent-palette";
import {
  Mail,
  Lock,
  Loader2,
  LogIn,
  UserPlus,
  ShieldCheck,
  Key,
  ArrowLeft,
  Sparkles,
  Shield,
  Database,
  Smartphone,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { BrandLogo } from "@/components/app/BrandLogo";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { checkHibpPwnedPassword, validatePasswordStrength } from "@/lib/rate-limiter";
import { audit } from "@/lib/audit-logger";
import {
  calculatePasswordStrength,
  checkAuthRateLimit,
  getSafeAuthError,
  getValidatedRedirectUri,
} from "./login/auth-helpers";

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const GitHubIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
);

export function LoginV2() {
  const { session, mfaRequired, signOut, checkMfaStatus, refreshSession } = useAuth();
  const { resolvedTheme } = useSystemTheme();
  const currentTheme = useFinance((s) => s.theme);
  const setTheme = useFinance((s) => s.setTheme);
  const accentColor = useFinance((s) => s.appSettings?.accentColor ?? "emerald");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [mfaCode, setMfaCode] = useState("");
  const [verifyingMfa, setVerifyingMfa] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  // Apply theme variables outside AppShell
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolvedTheme === "dark" ? "#0C0C0B" : "#FAF8F5");

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
  useEffect(() => {
    if (session && mfaRequired) {
      supabase.auth.mfa
        .listFactors()
        .then(({ data, error }) => {
          if (!error && data?.all) {
            const totp = data.all.find(
              (f: any) => f.factor_type === "totp" && f.status === "verified"
            );
            if (totp) setMfaFactorId(totp.id);
          }
        })
        .catch(console.error);
    }
  }, [session, mfaRequired]);

  const passwordStrength = useMemo(
    () => calculatePasswordStrength(password),
    [password]
  );

  const handleOAuth = useCallback(
    async (provider: "google" | "github") => {
      if (!(await checkAuthRateLimit(`oauth:${provider}`))) return;

      setLoading(true);
      try {
        const redirectTo = getValidatedRedirectUri(provider);
        const isNative = Capacitor.isNativePlatform();

        const options: any = { redirectTo };
        if (isNative) {
          options.skipBrowserRedirect = true;
        }
        if (provider === "google") {
          options.queryParams = { access_type: "offline", prompt: "consent" };
        } else {
          options.scopes = "read:user user:email";
        }

        const { data, error } = await supabase.auth.signInWithOAuth({ provider, options });
        if (error) throw error;

        if (isNative && data?.url) {
          Browser.open({ url: data.url });
        }
        setLoading(false);
      } catch (error: any) {
        toast.error(getSafeAuthError(error, `Error al iniciar sesión con ${provider}`));
        setLoading(false);
      }
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !password) {
        toast.error("Por favor llena todos los campos");
        return;
      }
      if (!isLogin) {
        const strength = validatePasswordStrength(password);
        if (!strength.valid) {
          toast.error(strength.message ?? "La contraseña no cumple los requisitos de seguridad");
          return;
        }
      }

      if (!(await checkAuthRateLimit(`email:${email.trim().toLowerCase()}`))) return;

      setLoading(true);
      try {
        if (isLogin) {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          const needsMfa = await checkMfaStatus();
          if (!needsMfa) {
            toast.success("Sesión iniciada correctamente");
          }
        } else {
          const hibp = await checkHibpPwnedPassword(password);
          if (hibp.pwned) {
            toast.error(
              hibp.message ?? "Esta contraseña ha sido filtrada públicamente. Elige otra diferente."
            );
            return;
          }
          const { error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
          toast.success("Cuenta creada. Revisa tu correo para verificar.");
        }
      } catch (error: any) {
        toast.error(getSafeAuthError(error, "Error de autenticación"));
      } finally {
        setLoading(false);
      }
    },
    [email, password, isLogin, checkMfaStatus]
  );

  const handleMfaSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!mfaCode || mfaCode.length !== 6) {
        toast.error("Introduce el código de 6 dígitos");
        return;
      }

      if (!(await checkAuthRateLimit(`mfa:${session?.user?.id ?? "unknown"}`))) return;

      setVerifyingMfa(true);
      try {
        let factorId = mfaFactorId;
        if (!factorId) {
          const { data, error } = await supabase.auth.mfa.listFactors();
          if (error) throw error;
          const totp = data?.all?.find(
            (f: any) => f.factor_type === "totp" && f.status === "verified"
          );
          if (!totp) throw new Error("No se encontró el factor de autenticación");
          factorId = totp.id;
          setMfaFactorId(totp.id);
        }

        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId,
        });
        if (challengeError) throw challengeError;

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challengeData.id,
          code: mfaCode,
        });
        if (verifyError) throw verifyError;

        await refreshSession();
        await checkMfaStatus();
        if (session?.user?.id) {
          audit.mfaVerified(session.user.id, { factorId });
          audit.login(session.user.id, {
            provider: session.user.app_metadata?.provider ?? "email",
            aal: "aal2",
          });
        }
        toast.success("Autenticación de dos factores verificada");
      } catch (error: any) {
        toast.error(getSafeAuthError(error, "Código 2FA incorrecto o expirado"));
      } finally {
        setVerifyingMfa(false);
      }
    },
    [mfaCode, session, mfaFactorId, refreshSession, checkMfaStatus]
  );

  // If already logged in and no MFA required
  if (session && !mfaRequired) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-6 bg-[#FAF8F5] dark:bg-[#0C0C0B] text-[#191918] dark:text-[#EDEDED]">
        <div className="text-center max-w-sm space-y-4">
          <div className="flex justify-center mx-auto">
            <BrandLogo size="lg" />
          </div>
          <h2 className="font-display-v2 text-2xl font-normal">Sesión Activa</h2>
          <p className="text-xs text-[#6E6A63] dark:text-[#8E8D8A]">
            Ya has iniciado sesión correctamente. Redirigiendo a tu espacio de trabajo...
          </p>
        </div>
      </div>
    );
  }

  // 2FA TOTP Challenge Screen
  if (session && mfaRequired) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-6 bg-[#FAF8F5] dark:bg-[#0C0C0B] text-[#191918] dark:text-[#EDEDED]">
        <div className="w-full max-w-sm p-6 sm:p-8 rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] space-y-6">
          <div className="text-center space-y-2">
            <div className="size-12 rounded-xl bg-[#2383E2]/10 text-[#2383E2] flex items-center justify-center mx-auto">
              <ShieldCheck className="size-6" strokeWidth={1.5} />
            </div>
            <h1 className="font-display-v2 text-2xl font-normal">Verificación 2FA</h1>
            <p className="text-xs text-[#6E6A63] dark:text-[#8E8D8A]">
              Ingresa el código de 6 dígitos generado por tu aplicación de autenticación TOTP.
            </p>
          </div>

          <form onSubmit={handleMfaSubmit} className="space-y-4 font-mono-tabular">
            <div className="relative">
              <label htmlFor="login-mfa" className="sr-only">
                Código de autenticación 2FA
              </label>
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#6E6A63] dark:text-[#8E8D8A]" strokeWidth={1.5} />
              <input
                id="login-mfa"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                className="w-full pl-10 pr-4 py-3 min-h-[48px] rounded-xl bg-[#FAF8F5] dark:bg-white/[0.03] border border-[#E4E0D8] dark:border-white/10 text-center text-lg tracking-[0.3em] font-mono-tabular outline-none focus:border-[#2383E2] focus-visible:ring-2 focus-visible:ring-[#2383E2]"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={verifyingMfa || mfaCode.length !== 6}
              className="w-full py-3 min-h-[44px] rounded-xl bg-[#191918] dark:bg-white text-white dark:text-[#0C0C0B] font-semibold text-xs font-mono-tabular flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]"
            >
              {verifyingMfa ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Verificar código"
              )}
            </button>

            <button
              type="button"
              onClick={() => signOut()}
              className="w-full py-2.5 min-h-[44px] rounded-xl text-xs text-[#6E6A63] dark:text-[#8E8D8A] hover:text-foreground flex items-center justify-center gap-1.5 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]"
            >
              <ArrowLeft className="size-3.5" /> Cancelar e iniciar con otra cuenta
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main Login View: Asymmetric 5/7 Layout on PC
  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0C0C0B] text-[#191918] dark:text-[#EDEDED] flex flex-col justify-center">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] overflow-hidden shadow-sm">
          {/* BRAND COLUMN (5 cols on lg:): Editorial Narrative & Security */}
          <div className="lg:col-span-5 p-8 sm:p-12 border-b lg:border-b-0 lg:border-r border-[#E4E0D8] dark:border-white/10 flex flex-col justify-between bg-[#FAF8F5]/60 dark:bg-white/[0.01]">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <BrandLogo size="md" />
                <div>
                  <h2 className="font-display-v2 text-xl font-normal leading-tight">
                    Finance Pal
                  </h2>
                  <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#6E6A63] dark:text-[#8E8D8A]">
                    v2 · WARM EDITORIAL WEALTH
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <h1 className="font-display-v2 text-2xl sm:text-3xl lg:text-4xl font-normal leading-tight tracking-tight">
                  Gestión patrimonial serena, privada y en alta fidelidad.
                </h1>
                <p className="text-xs sm:text-sm text-[#6E6A63] dark:text-[#8E8D8A] mt-3 leading-relaxed">
                  Tus finanzas no pertenecen a la nube pública sin tu consentimiento. Diseñado bajo el principio Local-First con almacenamiento encriptado y visualización editorial.
                </p>
              </div>

              {/* Pillars List */}
              <div className="space-y-3.5 pt-4 border-t border-[#E4E0D8]/70 dark:border-white/5 font-mono-tabular">
                <div className="flex items-start gap-3">
                  <div className="size-7 rounded-lg bg-[#1F7A5A]/10 text-[#1F7A5A] flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="size-3.5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-foreground block">
                      01 / PRIVACIDAD LOCAL-FIRST
                    </span>
                    <span className="text-[11px] text-[#6E6A63] dark:text-[#8E8D8A] font-sans">
                      Los datos viven en tu navegador y dispositivo. Cero rastreadores intrusivos.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-7 rounded-lg bg-[#2383E2]/10 text-[#2383E2] flex items-center justify-center shrink-0 mt-0.5">
                    <Database className="size-3.5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-foreground block">
                      02 / SINCRONIZACIÓN SUPABASE
                    </span>
                    <span className="text-[11px] text-[#6E6A63] dark:text-[#8E8D8A] font-sans">
                      Respaldos en la nube bajo demanda cuando tú lo decidas.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-7 rounded-lg bg-[#D9730D]/10 text-[#D9730D] flex items-center justify-center shrink-0 mt-0.5">
                    <Smartphone className="size-3.5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-foreground block">
                      03 / RENDIMIENTO OPTIMIZADO
                    </span>
                    <span className="text-[11px] text-[#6E6A63] dark:text-[#8E8D8A] font-sans">
                      Interacción fluida a 60-120fps sin partículas pesadas que desgasten tu batería.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 text-[11px] text-[#6E6A63] dark:text-[#8E8D8A] font-mono-tabular">
              <span>EST. 2026 // SEGURIDAD CRIPTOGRÁFICA CERTIFICADA</span>
            </div>
          </div>

          {/* FORM COLUMN (7 cols on lg:): Clean De-boxed Authentication */}
          <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
            <div className="w-full max-w-md mx-auto space-y-6">
              {/* Form Header with Dynamic Theme Switcher */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display-v2 text-2xl font-normal">
                    {isLogin ? "Iniciar Sesión" : "Crear una Cuenta"}
                  </h3>
                  <p className="text-xs text-[#6E6A63] dark:text-[#8E8D8A] mt-1">
                    {isLogin
                      ? "Accede a tus cuentas, metas y patrimonio con tus credenciales."
                      : "Comienza a organizar tu patrimonio con soberanía de datos."}
                  </p>
                </div>

                {/* Theme Selector (Claro / Oscuro / Sistema) */}
                <div
                  role="radiogroup"
                  aria-label="Selector de tema visual"
                  className="inline-flex p-0.5 rounded-lg bg-[#FAF8F5] dark:bg-white/[0.05] border border-[#E4E0D8] dark:border-white/10 shrink-0 self-start"
                >
                  {(
                    [
                      { key: "system", label: "Auto", title: "Tema del sistema", icon: Monitor },
                      { key: "light", label: "Claro", title: "Tema claro", icon: Sun },
                      { key: "dark", label: "Oscuro", title: "Tema oscuro", icon: Moon },
                    ] as const
                  ).map(({ key, label, title, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={currentTheme === key}
                      title={title}
                      onClick={() => setTheme(key)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-mono-tabular transition-all ${
                        currentTheme === key
                          ? "bg-white dark:bg-[#1E1E1C] text-foreground font-semibold shadow-xs"
                          : "text-[#6E6A63] dark:text-[#8E8D8A] hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-3" strokeWidth={1.75} />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-email"
                    className="text-xs font-mono-tabular uppercase tracking-wider text-[#6E6A63] dark:text-[#8E8D8A]"
                  >
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#6E6A63] dark:text-[#8E8D8A]" strokeWidth={1.5} />
                    <input
                      id="login-email"
                      type="email"
                      placeholder="nombre@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-[#FAF8F5] dark:bg-white/[0.03] border border-[#E4E0D8] dark:border-white/10 text-xs text-foreground placeholder:text-[#6E6A63] dark:placeholder:text-[#8E8D8A] focus:outline-none focus:border-[#2383E2] focus-visible:ring-2 focus-visible:ring-[#2383E2] transition"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-mono-tabular uppercase tracking-wider text-[#6E6A63] dark:text-[#8E8D8A]"
                  >
                    Contraseña {isLogin ? "" : "(mínimo 12 caracteres)"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#6E6A63] dark:text-[#8E8D8A]" strokeWidth={1.5} />
                    <input
                      id="login-password"
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      required
                      minLength={isLogin ? undefined : 12}
                      className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-[#FAF8F5] dark:bg-white/[0.03] border border-[#E4E0D8] dark:border-white/10 text-xs text-foreground placeholder:text-[#6E6A63] dark:placeholder:text-[#8E8D8A] focus:outline-none focus:border-[#2383E2] focus-visible:ring-2 focus-visible:ring-[#2383E2] transition font-mono"
                    />
                  </div>
                </div>

                {/* Password strength meter on register */}
                {!isLogin && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-mono-tabular">
                      <span className={`font-semibold ${passwordStrength.color}`}>
                        {passwordStrength.label}
                      </span>
                      <span className="text-[#6E6A63] dark:text-[#8E8D8A]">
                        {passwordStrength.feedback.length > 0
                          ? `Falta: ${passwordStrength.feedback.join(", ")}`
                          : "Cumple todos los requisitos"}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-[#E4E0D8]/60 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${((passwordStrength.score + 1) / 5) * 100}%`,
                          backgroundColor:
                            passwordStrength.score >= 3
                              ? "#1F7A5A"
                              : passwordStrength.score >= 2
                              ? "#D9730D"
                              : "#C86446",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 min-h-[44px] rounded-xl bg-[#191918] dark:bg-white text-white dark:text-[#0C0C0B] font-semibold text-xs font-mono-tabular flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : isLogin ? (
                    <>
                      <LogIn className="size-3.5" />
                      Iniciar Sesión
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-3.5" />
                      Crear Cuenta
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E4E0D8] dark:border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-mono-tabular">
                    <span className="bg-white dark:bg-[#141413] px-3 text-[#6E6A63] dark:text-[#8E8D8A]">
                      O continúa con
                    </span>
                  </div>
                </div>

                {/* OAuth buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleOAuth("google")}
                    className="py-3 px-3 min-h-[44px] rounded-xl border border-[#E4E0D8] dark:border-white/10 bg-[#FAF8F5] dark:bg-white/[0.02] text-xs font-medium flex items-center justify-center gap-2 hover:border-[#2383E2]/40 active:scale-[0.98] transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]"
                  >
                    <GoogleIcon />
                    Google
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleOAuth("github")}
                    className="py-3 px-3 min-h-[44px] rounded-xl border border-[#E4E0D8] dark:border-white/10 bg-[#FAF8F5] dark:bg-white/[0.02] text-xs font-medium flex items-center justify-center gap-2 hover:border-[#2383E2]/40 active:scale-[0.98] transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]"
                  >
                    <GitHubIcon />
                    GitHub
                  </button>
                </div>
              </form>

              {/* Mode Toggle */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setPassword("");
                  }}
                  className="min-h-[44px] inline-flex items-center justify-center p-2 rounded-xl text-xs font-medium text-[#2383E2] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]"
                >
                  {isLogin
                    ? "¿No tienes una cuenta aún? Regístrate aquí"
                    : "¿Ya tienes una cuenta registrada? Inicia sesión"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginV2;
