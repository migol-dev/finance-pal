import { memo, useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useNotificationScheduler } from "@/hooks/useNotificationScheduler";
import {
  DEFAULT_NOTIFICATION_PREFS,
  NotificationPreferences,
  NotificationRepeatFrequency,
} from "@/lib/finance";
import {
  cancelAllLocalNotifications,
  sendTestNotification,
} from "@/lib/notifications";
import { AjustesHeader } from "../AjustesHeader";
import { SectionProps } from "../types";
import {
  Bell,
  BellRing,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  CalendarClock,
  Volume2,
  EyeOff,
  RotateCcw,
  Plus,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const REPEAT_OPTIONS: { value: NotificationRepeatFrequency; label: string }[] = [
  { value: "daily", label: "Diario" },
  { value: "every_3_days", label: "Cada 3 días" },
  { value: "weekly", label: "Semanal" },
  { value: "once", label: "Solo una vez" },
];

const TOLERANCE_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 2, label: "Estricto (2%)", desc: "Avisa en cuanto te desvíes ligeramente del plan" },
  { value: 5, label: "Moderado (5%)", desc: "Balance ideal para metas medianas y largas" },
  { value: 10, label: "Flexible (10%)", desc: "Solo avisa cuando el atraso sea considerable" },
];

const PRESET_GOAL_DAYS = [0, 1, 3, 7, 14, 30];
const PRESET_FIXED_DAYS = [0, 1, 2, 3, 5, 7];

function formatDayChip(day: number): string {
  if (day === 0) return "El mismo día (0d)";
  if (day === 1) return "1 día antes";
  return `${day} días antes`;
}

export const NotificacionesSection = memo(function NotificacionesSection({
  onBack,
}: SectionProps) {
  const { appSettings, setNotificationPrefs } = useFinanceData();
  const prefs = appSettings.notifications;
  const {
    permissionState,
    scheduledCount,
    requestPermission,
    rescheduleNow,
  } = useNotificationScheduler();

  const [customGoalDay, setCustomGoalDay] = useState("");
  const [customFixedDay, setCustomFixedDay] = useState("");
  const [testing, setTesting] = useState(false);

  const updatePref = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => {
    setNotificationPrefs({ [key]: value });
    if (key === "enabled" && value === false) {
      cancelAllLocalNotifications().catch(console.warn);
    }
  };

  const handleToggleMaster = async (enabled: boolean) => {
    updatePref("enabled", enabled);
    if (enabled && permissionState === "prompt") {
      try {
        const res = await requestPermission();
        if (res.status === "granted") {
          toast.success("Permiso de notificaciones concedido 🎉");
        }
      } catch (e) {
        console.warn("Permission request failed:", e);
      }
    }
  };

  const handleGrantNow = async () => {
    try {
      const res = await requestPermission();
      if (res.status === "granted") {
        setNotificationPrefs({ enabled: true });
        toast.success("¡Permiso concedido! Tus recordatorios están activos 🔔");
      } else if (res.status === "denied") {
        toast.error(
          "El navegador o sistema bloqueó el permiso. Habilítalo desde los ajustes del sitio o de Android.",
        );
      }
    } catch {
      toast.error("No se pudo solicitar el permiso de notificación");
    }
  };

  const toggleGoalDay = (day: number) => {
    const exists = prefs.upcomingDays.includes(day);
    const next = exists
      ? prefs.upcomingDays.filter((d) => d !== day)
      : [...prefs.upcomingDays, day].sort((a, b) => b - a);
    setNotificationPrefs({ upcomingDays: next, goalDeadlineReminders: next.length > 0 });
  };

  const addCustomGoalDay = () => {
    const trimmed = customGoalDay.trim();
    const n = trimmed === "" ? NaN : Math.round(Number(trimmed));
    if (!Number.isFinite(n) || n < 0 || n > 60) {
      toast.error("Ingresa un número de días entre 0 y 60");
      return;
    }
    if (!prefs.upcomingDays.includes(n)) {
      const next = [...prefs.upcomingDays, n].sort((a, b) => b - a);
      setNotificationPrefs({ upcomingDays: next, goalDeadlineReminders: true });
    }
    setCustomGoalDay("");
  };

  const toggleFixedDay = (day: number) => {
    const exists = prefs.fixedUpcomingDays.includes(day);
    const next = exists
      ? prefs.fixedUpcomingDays.filter((d) => d !== day)
      : [...prefs.fixedUpcomingDays, day].sort((a, b) => b - a);
    setNotificationPrefs({ fixedUpcomingDays: next });
  };

  const addCustomFixedDay = () => {
    const trimmed = customFixedDay.trim();
    const n = trimmed === "" ? NaN : Math.round(Number(trimmed));
    if (!Number.isFinite(n) || n < 0 || n > 60) {
      toast.error("Ingresa un número de días entre 0 y 60");
      return;
    }
    if (!prefs.fixedUpcomingDays.includes(n)) {
      const next = [...prefs.fixedUpcomingDays, n].sort((a, b) => b - a);
      setNotificationPrefs({ fixedUpcomingDays: next });
    }
    setCustomFixedDay("");
  };

  const handleTestNotification = async () => {
    setTesting(true);
    try {
      await sendTestNotification(prefs);
      await rescheduleNow();
      toast.success("Notificación de prueba enviada 🎉");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo enviar la notificación de prueba");
    } finally {
      setTesting(false);
    }
  };

  const handleResetDefaults = () => {
    setNotificationPrefs(DEFAULT_NOTIFICATION_PREFS);
    toast.success("Preferencias de notificación restablecidas a los valores recomendados");
  };

  const allGoalDayChips = Array.from(
    new Set([...PRESET_GOAL_DAYS, ...prefs.upcomingDays]),
  ).sort((a, b) => a - b);

  const allFixedDayChips = Array.from(
    new Set([...PRESET_FIXED_DAYS, ...prefs.fixedUpcomingDays]),
  ).sort((a, b) => a - b);

  return (
    <div className="space-y-6 pb-8">
      <AjustesHeader
        title="Notificaciones y Avisos"
        description="Personaliza al 100% qué, cómo y cada cuánto recibes alertas de pagos recurrentes y metas"
        icon={Bell}
        iconColorClass="bg-indigo-500/10 text-indigo-500"
        onBack={onBack}
      />

      {/* 1. Tarjeta de Estado del Permiso del Sistema (Web / Android) */}
      <div className="rounded-3xl bg-card border border-border/60 p-5 shadow-soft space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`size-11 rounded-2xl flex items-center justify-center shrink-0 ${
                permissionState === "granted" && prefs.enabled
                  ? "bg-emerald-500/10 text-emerald-500"
                  : permissionState === "denied"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-500/10 text-amber-500"
              }`}
            >
              {permissionState === "granted" && prefs.enabled ? (
                <ShieldCheck className="size-5.5" />
              ) : permissionState === "denied" ? (
                <ShieldAlert className="size-5.5" />
              ) : (
                <BellRing className="size-5.5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-sm text-foreground">
                  Estado del permiso en este dispositivo
                </h3>
                {permissionState === "granted" && prefs.enabled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3" /> Activo en este dispositivo
                  </span>
                )}
                {permissionState === "granted" && !prefs.enabled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-muted text-muted-foreground">
                    Pausado por el usuario
                  </span>
                )}
                {permissionState === "prompt" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-3" /> Permiso pendiente
                  </span>
                )}
                {permissionState === "denied" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-destructive/15 text-destructive">
                    Bloqueado en el navegador/sistema
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {permissionState === "granted"
                  ? "Finance Pal tiene permiso para enviarte notificaciones automáticas en Web y en la App."
                  : permissionState === "prompt"
                    ? "Concede permiso para recibir alertas en segundo plano incluso cuando no estés mirando la app."
                    : permissionState === "denied"
                      ? "El permiso fue denegado en el navegador o en Android. Habilítalo desde el ícono de candado en la barra de direcciones o en Ajustes > Aplicaciones > Finance Pal."
                      : "Este navegador no soporta la API de notificaciones del sistema."}
              </p>
            </div>
          </div>

          {permissionState === "prompt" && (
            <Button
              type="button"
              size="sm"
              onClick={handleGrantNow}
              className="rounded-xl text-xs font-bold h-9 px-4 shrink-0"
            >
              Conceder permiso ahora
            </Button>
          )}
        </div>
      </div>

      {/* 2. Canales de Entrega y Privacidad */}
      <div className="rounded-3xl bg-card border border-border/60 p-5 shadow-soft space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bell className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Notificaciones activas</p>
              <p className="text-xs text-muted-foreground">
                Interruptor general de alertas y seguimiento financiero
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.enabled}
            onCheckedChange={handleToggleMaster}
            aria-label="Alternar notificaciones"
          />
        </div>

        {prefs.enabled && (
          <div className="border-t border-border/60 pt-4 space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">Notificaciones locales en el dispositivo</p>
                <p className="text-xs text-muted-foreground">
                  Funcionan automáticamente sin internet en Android y navegador
                </p>
              </div>
              <Switch
                checked={prefs.localEnabled}
                onCheckedChange={(v) => updatePref("localEnabled", v)}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">Notificaciones Push en segundo plano (nube)</p>
                <p className="text-xs text-muted-foreground">
                  Envío diario autónomo vía Web Push sincronizado con tu cuenta
                </p>
              </div>
              <Switch
                checked={prefs.pushEnabled}
                onCheckedChange={(v) => updatePref("pushEnabled", v)}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">Avisos rápidos dentro de la app</p>
                <p className="text-xs text-muted-foreground">
                  Mostrar confirmaciones visuales mientras usas Finance Pal
                </p>
              </div>
              <Switch
                checked={prefs.inAppToastEnabled}
                onCheckedChange={(v) => updatePref("inAppToastEnabled", v)}
              />
            </div>

            <div className="border-t border-border/60 pt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center justify-between sm:flex-col sm:items-start gap-2 rounded-2xl bg-muted/40 p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Volume2 className="size-4 text-primary" />
                  <span className="text-xs font-bold">Sonido de alerta</span>
                </div>
                <Switch
                  checked={prefs.soundEnabled}
                  onCheckedChange={(v) => updatePref("soundEnabled", v)}
                />
              </label>

              <label className="flex items-center justify-between sm:flex-col sm:items-start gap-2 rounded-2xl bg-muted/40 p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <BellRing className="size-4 text-primary" />
                  <span className="text-xs font-bold">Vibración</span>
                </div>
                <Switch
                  checked={prefs.vibrationEnabled}
                  onCheckedChange={(v) => updatePref("vibrationEnabled", v)}
                />
              </label>

              <label className="flex items-center justify-between sm:flex-col sm:items-start gap-2 rounded-2xl bg-muted/40 p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <EyeOff className="size-4 text-primary" />
                  <span className="text-xs font-bold">Ocultar montos ($•••)</span>
                </div>
                <Switch
                  checked={prefs.hideAmountsInNotifications}
                  onCheckedChange={(v) => updatePref("hideAmountsInNotifications", v)}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {prefs.enabled && (
        <>
          {/* 3. Gastos, Ingresos y Ahorros Recurrentes (Conceptos Fijos) */}
          <div className="rounded-3xl bg-card border border-border/60 p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                  <CalendarClock className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Gastos, Ingresos y Ahorros Recurrentes
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Avisos automáticos para las 9 frecuencias (semanal, quincenal, mensual, anual, etc.)
                  </p>
                </div>
              </div>
              <Switch
                checked={prefs.fixedItemReminders}
                onCheckedChange={(v) => updatePref("fixedItemReminders", v)}
                aria-label="Alternar recordatorios de pagos fijos"
              />
            </div>

            {prefs.fixedItemReminders && (
              <div className="border-t border-border/60 pt-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    ¿Qué movimientos recurrentes deseas notificar?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <label className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-3.5 py-2.5 cursor-pointer">
                      <span className="text-xs font-semibold">Gastos recurrentes</span>
                      <Switch
                        checked={prefs.notifyFixedExpenses}
                        onCheckedChange={(v) => updatePref("notifyFixedExpenses", v)}
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-3.5 py-2.5 cursor-pointer">
                      <span className="text-xs font-semibold">Ingresos recurrentes</span>
                      <Switch
                        checked={prefs.notifyFixedIncomes}
                        onCheckedChange={(v) => updatePref("notifyFixedIncomes", v)}
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-3.5 py-2.5 cursor-pointer">
                      <span className="text-xs font-semibold">Ahorros recurrentes</span>
                      <Switch
                        checked={prefs.notifyFixedSavings}
                        onCheckedChange={(v) => updatePref("notifyFixedSavings", v)}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    ¿Con cuántos días de anticipación avisar?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allFixedDayChips.map((day) => {
                      const active = prefs.fixedUpcomingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleFixedDay(day)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          }`}
                        >
                          {formatDayChip(day)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 pt-1 max-w-xs">
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      placeholder="Otro día (0-60)"
                      value={customFixedDay}
                      onChange={(e) => setCustomFixedDay(e.target.value)}
                      className="h-9 rounded-xl text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomFixedDay}
                      className="h-9 rounded-xl text-xs font-semibold shrink-0"
                    >
                      <Plus className="size-3.5 mr-1" /> Añadir
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div>
                    <p className="font-medium text-sm">
                      Omitir si ya fue registrado manualmente en el periodo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Evita avisos innecesarios si ya pagaste o cobraste ese concepto antes de la fecha
                    </p>
                  </div>
                  <Switch
                    checked={prefs.skipIfAlreadyRecorded}
                    onCheckedChange={(v) => updatePref("skipIfAlreadyRecorded", v)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Metas de Ahorro y Seguimiento del Plan */}
          <div className="rounded-3xl bg-card border border-border/60 p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Target className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Metas de Ahorro: Límites y Ritmo del Plan
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configura avisos cuando se acerque la fecha límite o cuando vayas atrasado según tu plan
                </p>
              </div>
            </div>

            <div className="border-t border-border/60 pt-4 space-y-4">
              {/* Cercanía de fecha límite */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">Meta próxima a vencer</p>
                    <p className="text-xs text-muted-foreground">
                      Avisar cuando se acerque la fecha límite de una meta
                    </p>
                  </div>
                  <Switch
                    checked={prefs.goalDeadlineReminders}
                    onCheckedChange={(v) => {
                      if (v && prefs.upcomingDays.length === 0) {
                        setNotificationPrefs({
                          goalDeadlineReminders: true,
                          upcomingDays: [7, 3, 1, 0],
                        });
                      } else {
                        updatePref("goalDeadlineReminders", v);
                      }
                    }}
                  />
                </div>

                {prefs.goalDeadlineReminders && (
                  <>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {allGoalDayChips.map((day) => {
                        const active = prefs.upcomingDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleGoalDay(day)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              active
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted text-muted-foreground hover:bg-muted/70"
                            }`}
                          >
                            {formatDayChip(day)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 pt-1 max-w-xs">
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        placeholder="Otro día (0-60)"
                        value={customGoalDay}
                        onChange={(e) => setCustomGoalDay(e.target.value)}
                        className="h-9 rounded-xl text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCustomGoalDay}
                        className="h-9 rounded-xl text-xs font-semibold shrink-0"
                      >
                        <Plus className="size-3.5 mr-1" /> Añadir
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Atraso según el plan */}
              <div className="border-t border-border/60 pt-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">
                      Alerta cuando vas atrasado en una meta según el plan
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Compara tu ahorro actual contra el progreso esperado entre la fecha de inicio y la fecha límite
                    </p>
                  </div>
                  <Switch
                    checked={prefs.behindPaceAlert}
                    onCheckedChange={(v) => updatePref("behindPaceAlert", v)}
                  />
                </div>

                {prefs.behindPaceAlert && (
                  <div className="rounded-2xl bg-muted/35 p-3.5 space-y-3">
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-foreground">
                        ¿Cada cuánto recordar si sigues atrasado?
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {REPEAT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updatePref("behindPaceRepeat", opt.value)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              prefs.behindPaceRepeat === opt.value
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-card text-muted-foreground border border-border/60 hover:bg-muted"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-foreground">
                        Sensibilidad del plan (margen de tolerancia)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {TOLERANCE_OPTIONS.map((opt) => {
                          const active = prefs.behindPaceTolerancePct === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => updatePref("behindPaceTolerancePct", opt.value)}
                              className={`text-left rounded-xl p-2.5 border transition ${
                                active
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border/60 bg-card text-muted-foreground hover:bg-muted/60"
                              }`}
                            >
                              <p className="text-xs font-bold">{opt.label}</p>
                              <p className="text-[11px] opacity-80 mt-0.5">{opt.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Meta vencida */}
              <div className="border-t border-border/60 pt-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">Alerta de meta vencida</p>
                    <p className="text-xs text-muted-foreground">
                      Notificar si la fecha límite ya pasó y aún falta saldo por ahorrar
                    </p>
                  </div>
                  <Switch
                    checked={prefs.overdueAlert}
                    onCheckedChange={(v) => updatePref("overdueAlert", v)}
                  />
                </div>

                {prefs.overdueAlert && (
                  <div className="rounded-2xl bg-muted/35 p-3.5 space-y-1.5">
                    <p className="text-xs font-bold text-foreground">
                      Frecuencia de aviso para metas vencidas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {REPEAT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updatePref("overdueRepeat", opt.value)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            prefs.overdueRepeat === opt.value
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-card text-muted-foreground border border-border/60 hover:bg-muted"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Horario Preferido y Horario Silencioso (No Molestar) */}
          <div className="rounded-3xl bg-card border border-border/60 p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Clock className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Horario de Envío y Modo Silencioso
                </h3>
                <p className="text-xs text-muted-foreground">
                  Elige a qué hora recibir tus alertas y cuándo posponerlas automáticamente
                </p>
              </div>
            </div>

            <div className="border-t border-border/60 pt-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <Label htmlFor="preferred-time-input" className="font-semibold text-sm">
                    Hora preferida para tus recordatorios diarios
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Hora por defecto en la que se programan las alertas de metas y pagos
                  </p>
                </div>
                <Input
                  id="preferred-time-input"
                  type="time"
                  value={prefs.preferredTime}
                  onChange={(e) => updatePref("preferredTime", e.target.value)}
                  className="h-10 w-36 rounded-xl"
                />
              </div>

              <div className="border-t border-border/60 pt-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">Activar horario silencioso (No molestar)</p>
                    <p className="text-xs text-muted-foreground">
                      Las alertas que caigan en este rango no se pierden: se posponen al finalizar el horario silencioso
                    </p>
                  </div>
                  <Switch
                    checked={prefs.quietHoursEnabled}
                    onCheckedChange={(v) => updatePref("quietHoursEnabled", v)}
                  />
                </div>

                {prefs.quietHoursEnabled && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-xs">Inicio</Label>
                      <Input
                        type="time"
                        value={prefs.quietHours.start}
                        onChange={(e) =>
                          updatePref("quietHours", {
                            ...prefs.quietHours,
                            start: e.target.value,
                          })
                        }
                        className="h-10 rounded-xl mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fin</Label>
                      <Input
                        type="time"
                        value={prefs.quietHours.end}
                        onChange={(e) =>
                          updatePref("quietHours", {
                            ...prefs.quietHours,
                            end: e.target.value,
                          })
                        }
                        className="h-10 rounded-xl mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 6. Diagnóstico y Acciones Rápidas */}
          <div className="rounded-3xl bg-card border border-border/60 p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-foreground">
                  Cola autónoma de recordatorios
                </p>
                <p className="text-xs text-muted-foreground">
                  Actualmente hay{" "}
                  <span className="font-bold text-foreground">{scheduledCount}</span>{" "}
                  {scheduledCount === 1 ? "alerta programada" : "alertas programadas"} según tus metas y conceptos fijos
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button
                type="button"
                onClick={handleTestNotification}
                disabled={testing}
                variant="outline"
                className="flex-1 h-11 rounded-xl text-xs font-semibold"
              >
                <Sparkles className="size-4 mr-2 text-primary" />
                {testing
                  ? "Enviando prueba..."
                  : "Enviar notificación de prueba ahora"}
              </Button>

              <Button
                type="button"
                onClick={handleResetDefaults}
                variant="ghost"
                className="h-11 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-4 mr-2" />
                Restablecer valores recomendados
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default NotificacionesSection;
