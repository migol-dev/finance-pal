import { memo, useState, useCallback, useEffect } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useFinance } from "@/store/finance-store";
import { Currency, IconRef } from "@/lib/finance";
import { AjustesHeader } from "../AjustesHeader";
import { SectionProps } from "../types";
import { IconPicker } from "@/components/app/IconPicker";
import { IconDisplay } from "@/components/app/IconDisplay";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Pencil, LogOut, ShieldCheck, ShieldOff, Key, Mail } from "lucide-react";
import { toast } from "sonner";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseEnabled, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { audit } from "@/lib/audit-logger";
import { checkHibpPwnedPassword, getClientIdentifier, rateLimiter, validatePasswordStrength } from "@/lib/rate-limiter";
import { useNavigate } from "react-router-dom";

function ProfileForm({ onSave }: { onSave: (p: { name: string; email?: string; currency: Currency; avatar?: IconRef }) => void }) {
  const profile = useFinance((s) => s.profile);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email ?? "");
  const [currency, setCurrency] = useState<Currency>(profile.currency);
  const [avatar, setAvatar] = useState<IconRef | undefined>(profile.avatar);
  const currencies: Currency[] = ["MXN", "USD", "EUR", "COP", "ARS", "CLP", "PEN", "BRL"];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name: name.trim(), email: email.trim() || undefined, currency, avatar });
      }}
      className="space-y-3"
    >
      <div className="flex justify-center">
        <IconPicker value={avatar} onChange={setAvatar} />
      </div>
      <div>
        <Label className="text-xs">Tu nombre</Label>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. María" className="h-11 rounded-2xl" />
      </div>
      <div>
        <Label className="text-xs">Email (opcional)</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" className="h-11 rounded-2xl" />
      </div>
      <div>
        <Label className="text-xs">Moneda principal</Label>
        <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
          <SelectTrigger className="h-11 rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">
        Guardar cambios
      </Button>
    </form>
  );
}

function AccountSettings() {
  const { session, signOut, refreshSession, checkMfaStatus: checkAuthMfa } = useAuth();
  const navigate = useNavigate();
  const [emailOpen, setEmailOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaEnrolled, setMfaEnrolled] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [enrollingMfa, setEnrollingMfa] = useState(false);
  const [verifyingMfa, setVerifyingMfa] = useState(false);
  const [unenrollOpen, setUnenrollOpen] = useState(false);
  const [unenrollCode, setUnenrollCode] = useState("");
  const [unenrollPassword, setUnenrollPassword] = useState("");
  const [unenrollMethod, setUnenrollMethod] = useState<"totp" | "password">("totp");
  const [unenrollingMfa, setUnenrollingMfa] = useState(false);

  const checkMfaStatus = useCallback(async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const totpFactor = data?.all?.find((f: any) => f.factor_type === "totp" && f.status === "verified");
      setMfaEnrolled(!!totpFactor);
      if (totpFactor) setMfaFactorId(totpFactor.id);
    } catch (e) {
      console.error("Failed to check MFA status:", e);
    }
  }, [session]);

  useEffect(() => {
    checkMfaStatus();
  }, [checkMfaStatus]);

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes("@")) { toast.error("Correo inválido"); return; }

    const limit = await rateLimiter.checkLimit(
      `${session?.user?.id ?? getClientIdentifier()}:email-update`,
      "auth",
    );
    if (!limit.allowed) {
      toast.error(`Demasiados intentos. Espera ${limit.retryAfter ?? 60} segundos.`);
      return;
    }

    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setChangingEmail(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Correo actualizado. Revisa tu bandeja para confirmar.");
    setEmailOpen(false);
    setNewEmail("");
    if (session?.user?.id) audit.emailChanged(session.user.id, { newEmail });
  };

  const handleChangePassword = async () => {
    const strength = validatePasswordStrength(newPass);
    if (!strength.valid) { toast.error(strength.message ?? "La contraseña no cumple los requisitos de seguridad"); return; }
    if (newPass !== confirmPass) { toast.error("Las contraseñas no coinciden"); return; }

    const limit = await rateLimiter.checkLimit(
      `${session?.user?.id ?? getClientIdentifier()}:password-update`,
      "auth",
    );
    if (!limit.allowed) {
      toast.error(`Demasiados intentos. Espera ${limit.retryAfter ?? 60} segundos.`);
      return;
    }

    setChangingPass(true);
    const hibp = await checkHibpPwnedPassword(newPass);
    if (hibp.pwned) {
      setChangingPass(false);
      toast.error(hibp.message ?? "Esta contraseña ha sido filtrada públicamente. Elige otra diferente.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setChangingPass(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contraseña actualizada correctamente");
    setPassOpen(false);
    setNewPass("");
    setConfirmPass("");
    if (session?.user?.id) audit.passwordChanged(session.user.id);
  };

  const handleEnrollMfa = async () => {
    setEnrollingMfa(true);
    try {
      // Clean up any unverified factors left from abandoned enrollments
      try {
        const { data: factorList } = await supabase.auth.mfa.listFactors();
        if (factorList?.all) {
          for (const f of factorList.all) {
            if (f.status === "unverified") {
              await supabase.auth.mfa.unenroll({ factorId: f.id });
            }
          }
        }
      } catch (cleanupErr) {
        console.warn("Error cleaning up unverified factors:", cleanupErr);
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "Finance Pal",
        friendlyName: session?.user?.email ?? "Finance Pal",
      });
      if (error) throw error;
      if (data?.totp?.qr_code) {
        setMfaQrCode(data.totp.qr_code);
        setMfaSecret(data.totp.secret);
        setMfaFactorId(data.id || (data as any)?.totp?.id || (data as any)?.totp?.factor_id);
        setMfaOpen(true);
      }
    } catch (e: any) {
      toast.error(e.message || "Error al configurar 2FA");
    } finally {
      setEnrollingMfa(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaCode || mfaCode.length !== 6) { toast.error("Código de 6 dígitos requerido"); return; }
    if (!mfaFactorId) { toast.error("Factor ID no disponible"); return; }

    const limit = await rateLimiter.checkLimit(
      `${session?.user?.id ?? getClientIdentifier()}:mfa-verify`,
      "auth",
    );
    if (!limit.allowed) {
      toast.error(`Demasiados intentos. Espera ${limit.retryAfter ?? 60} segundos.`);
      return;
    }

    setVerifyingMfa(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeError) throw challengeError;

      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });
      if (error) throw error;

      await refreshSession();
      await checkAuthMfa();
      await checkMfaStatus();

      toast.success("¡Autenticación en dos pasos activada!");
      setMfaOpen(false);
      setMfaCode("");
      setMfaEnrolled(true);
      if (session?.user?.id) audit.mfaEnabled(session.user.id);
    } catch (e: any) {
      toast.error(e.message || "Código incorrecto");
    } finally {
      setVerifyingMfa(false);
    }
  };

  const handleUnenrollMfa = async () => {
    let factorId = mfaFactorId;
    if (!factorId) {
      try {
        const { data: factorList } = await supabase.auth.mfa.listFactors();
        const totp = factorList?.all?.find((f: any) => f.factor_type === "totp" && f.status === "verified");
        if (totp) {
          factorId = totp.id;
          setMfaFactorId(totp.id);
        }
      } catch (err) {
        console.warn("Failed to fetch factor ID fallback:", err);
      }
    }

    if (!factorId) {
      toast.error("Factor ID no disponible");
      return;
    }

    const limit = await rateLimiter.checkLimit(
      `${session?.user?.id ?? getClientIdentifier()}:mfa-unenroll`,
      "auth",
    );
    if (!limit.allowed) {
      toast.error(`Demasiados intentos. Espera ${limit.retryAfter ?? 60} segundos.`);
      return;
    }

    setUnenrollingMfa(true);
    try {
      if (unenrollMethod === "totp") {
        if (!unenrollCode || unenrollCode.length !== 6) {
          toast.error("Ingresa el código 2FA de 6 dígitos");
          setUnenrollingMfa(false);
          return;
        }
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
        if (challengeError) throw challengeError;

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challengeData.id,
          code: unenrollCode,
        });
        if (verifyError) throw verifyError;
      } else {
        if (!unenrollPassword) {
          toast.error("Ingresa tu contraseña actual");
          setUnenrollingMfa(false);
          return;
        }
        if (!session?.user?.email) {
          toast.error("Correo de usuario no disponible");
          setUnenrollingMfa(false);
          return;
        }

        // Use an isolated ephemeral client to verify password without downgrading
        // or replacing the current AAL2 session in localStorage/memory
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        });
        const { error: passError } = await tempClient.auth.signInWithPassword({
          email: session.user.email,
          password: unenrollPassword,
        });
        if (passError) throw new Error("Contraseña actual incorrecta");
      }

      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      await refreshSession();
      await checkAuthMfa();
      await checkMfaStatus();

      toast.success("2FA desactivado");
      setMfaEnrolled(false);
      setMfaFactorId(null);
      setUnenrollOpen(false);
      setUnenrollCode("");
      setUnenrollPassword("");
      if (session?.user?.id) audit.mfaDisabled(session.user.id);
    } catch (e: any) {
      toast.error(e.message || "Verificación fallida al desactivar 2FA");
    } finally {
      setUnenrollingMfa(false);
    }
  };

  if (!isSupabaseEnabled || !session) {
    return (
      <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-3">
        <h3 className="font-bold text-sm text-foreground">Cuenta en la nube</h3>
        <p className="text-xs text-muted-foreground">
          Actualmente estás usando Finance Pal en modo local. Inicia sesión para sincronizar tus finanzas en varios dispositivos de forma cifrada.
        </p>
        <Button
          type="button"
          onClick={() => navigate("/login")}
          className="rounded-xl gradient-primary text-primary-foreground font-bold h-10 px-4"
        >
          Iniciar sesión o registrarse
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-foreground">Seguridad de la cuenta</h3>
        <span className="text-xs text-muted-foreground">{session.user.email}</span>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)} className="rounded-xl text-xs h-9">
          <Mail className="size-3.5 mr-1.5" /> Cambiar correo
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPassOpen(true)} className="rounded-xl text-xs h-9">
          <Key className="size-3.5 mr-1.5" /> Cambiar contraseña
        </Button>
        {mfaEnrolled ? (
          <Button variant="outline" size="sm" onClick={() => setUnenrollOpen(true)} className="rounded-xl text-xs h-9 text-destructive hover:text-destructive">
            <ShieldOff className="size-3.5 mr-1.5" /> Desactivar 2FA
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handleEnrollMfa} disabled={enrollingMfa} className="rounded-xl text-xs h-9">
            <ShieldCheck className="size-3.5 mr-1.5" /> Activar 2FA
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => signOut()} className="rounded-xl text-xs h-9 text-destructive hover:bg-destructive/10 ml-auto">
          <LogOut className="size-3.5 mr-1.5" /> Cerrar sesión
        </Button>
      </div>

      <Dialog open={unenrollOpen} onOpenChange={setUnenrollOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldOff className="size-5" /> Desactivar 2FA
            </DialogTitle>
            <DialogDescription className="text-xs">
              Por seguridad, verifica tu identidad para confirmar la desactivación del segundo factor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex rounded-xl bg-muted p-1 text-xs">
              <button
                type="button"
                onClick={() => setUnenrollMethod("totp")}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${unenrollMethod === "totp" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Código 2FA
              </button>
              <button
                type="button"
                onClick={() => setUnenrollMethod("password")}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${unenrollMethod === "password" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Contraseña
              </button>
            </div>

            {unenrollMethod === "totp" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Código de autenticación (6 dígitos)</Label>
                <Input
                  placeholder="123456"
                  value={unenrollCode}
                  onChange={(e) => setUnenrollCode(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  className="rounded-2xl h-11 text-center font-mono tracking-widest text-lg"
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Contraseña actual</Label>
                <Input
                  type="password"
                  placeholder="Tu contraseña actual"
                  value={unenrollPassword}
                  onChange={(e) => setUnenrollPassword(e.target.value)}
                  className="rounded-2xl h-11"
                  autoFocus
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setUnenrollOpen(false); setUnenrollCode(""); setUnenrollPassword(""); }}
                className="flex-1 rounded-2xl h-11"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleUnenrollMfa}
                disabled={unenrollingMfa || (unenrollMethod === "totp" ? unenrollCode.length !== 6 : !unenrollPassword)}
                className="flex-1 rounded-2xl h-11 font-bold"
              >
                {unenrollingMfa ? "Verificando..." : "Desactivar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader><DialogTitle>Cambiar correo</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input type="email" placeholder="Nuevo correo" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="rounded-2xl h-11" />
            <Button onClick={handleChangeEmail} disabled={changingEmail} className="w-full rounded-2xl h-11 gradient-primary text-primary-foreground font-bold">
              {changingEmail ? "Guardando..." : "Actualizar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={passOpen} onOpenChange={setPassOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription className="text-xs">
              La nueva contraseña debe tener <strong>mínimo 12 caracteres</strong> e incluir mayúsculas, minúsculas y números.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input type="password" placeholder="Nueva contraseña (mín. 12 caracteres)" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="rounded-2xl h-11" minLength={12} />
            <Input type="password" placeholder="Confirmar nueva contraseña" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="rounded-2xl h-11" />
            <Button onClick={handleChangePassword} disabled={changingPass} className="w-full rounded-2xl h-11 gradient-primary text-primary-foreground font-bold">
              {changingPass ? "Actualizando..." : "Actualizar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mfaOpen} onOpenChange={setMfaOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader><DialogTitle>Configurar 2FA (TOTP)</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2 text-center">
            {mfaQrCode && <img src={mfaQrCode} alt="Código QR 2FA" className="mx-auto rounded-xl border border-border" />}
            {mfaSecret && <p className="text-[11px] font-mono text-muted-foreground select-all bg-muted p-2 rounded-xl">{mfaSecret}</p>}
            <Input placeholder="Código de 6 dígitos" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} maxLength={6} className="rounded-2xl h-11 text-center font-mono tracking-widest text-lg" />
            <Button onClick={handleVerifyMfa} disabled={verifyingMfa} className="w-full rounded-2xl h-11 gradient-primary text-primary-foreground font-bold">
              {verifyingMfa ? "Verificando..." : "Verificar y Activar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const PerfilSection = memo(function PerfilSection({ onBack }: SectionProps) {
  const { profile, setProfile } = useFinanceData();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="space-y-5">
      <AjustesHeader
        title="Perfil y Cuenta"
        description="Personaliza tu nombre, avatar, moneda principal y gestiona tu sesión"
        icon={User}
        iconColorClass="bg-blue-500/10 text-blue-500"
        onBack={onBack}
      />

      {/* Main Profile Card */}
      <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {profile.avatar ? (
              <IconDisplay icon={profile.avatar} size="lg" className="shadow-sm" />
            ) : (
              <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm">
                <User className="size-7" />
              </div>
            )}
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-foreground">{profile.name || "Sin nombre configurado"}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{profile.email || "Sin correo asociado"}</p>
              <div className="mt-1">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                  Moneda: {profile.currency}
                </span>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setProfileOpen(true)}
            className="rounded-xl text-xs h-9"
          >
            <Pencil className="size-3.5 mr-1.5" /> Editar
          </Button>
        </div>
      </div>

      {/* Cloud Account Settings */}
      <AccountSettings />

      {/* Edit Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader><DialogTitle>Editar perfil</DialogTitle></DialogHeader>
          <DialogDescription className="sr-only">Edita tu nombre, moneda y foto de perfil</DialogDescription>
          <ProfileForm
            onSave={(p) => {
              setProfile(p);
              setProfileOpen(false);
              toast.success("Perfil guardado");
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default PerfilSection;
