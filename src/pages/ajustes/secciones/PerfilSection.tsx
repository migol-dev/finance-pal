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
import { User, Pencil, LogOut, Shield, ShieldCheck, ShieldOff, Key, Mail } from "lucide-react";
import { toast } from "sonner";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { audit } from "@/lib/audit-logger";
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
  const { session, signOut } = useAuth();
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
  const [unenrollConfirmOpen, setUnenrollConfirmOpen] = useState(false);

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
    if (!newPass || newPass.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }
    if (newPass !== confirmPass) { toast.error("Las contraseñas no coinciden"); return; }
    setChangingPass(true);
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

      toast.success("¡Autenticación en dos pasos activada!");
      setMfaOpen(false);
      setMfaCode("");
      setMfaEnrolled(true);
      if (session?.user?.id) audit.mfaEnrolled(session.user.id);
    } catch (e: any) {
      toast.error(e.message || "Código incorrecto");
    } finally {
      setVerifyingMfa(false);
    }
  };

  const handleUnenrollMfa = async () => {
    if (!mfaFactorId) return;
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
      if (error) throw error;
      toast.success("2FA desactivado");
      setMfaEnrolled(false);
      setMfaFactorId(null);
      if (session?.user?.id) audit.mfaUnenrolled(session.user.id);
    } catch (e: any) {
      toast.error(e.message || "Error al desactivar 2FA");
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
          <Button variant="outline" size="sm" onClick={() => setUnenrollConfirmOpen(true)} className="rounded-xl text-xs h-9 text-destructive hover:text-destructive">
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

      <ElegantConfirm
        open={unenrollConfirmOpen}
        onOpenChange={setUnenrollConfirmOpen}
        title="¿Desactivar autenticación 2FA?"
        description="Tu cuenta será menos segura si desactivas la verificación en dos pasos. Podrás volver a activarla cuando quieras."
        onConfirm={async () => {
          await handleUnenrollMfa();
          setUnenrollConfirmOpen(false);
        }}
        icon={ShieldOff}
        iconColor="bg-destructive"
        confirmText="Sí, desactivar 2FA"
      />

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
          <DialogHeader><DialogTitle>Cambiar contraseña</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input type="password" placeholder="Nueva contraseña (mín 6 car.)" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="rounded-2xl h-11" />
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
