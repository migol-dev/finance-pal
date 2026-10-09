import { memo } from "react";
import { useFinance } from "@/store/finance-store";
import { useFinanceData } from "@/hooks/useFinanceData";
import { NotificationPreferences } from "@/lib/finance";
import { AjustesHeader } from "../AjustesHeader";
import { SectionProps } from "../types";
import { Bell, Clock, ShieldAlert, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  scheduleAllNotifications,
  requestNotificationPermissions,
  cancelAllLocalNotifications,
  sendTestNotification,
} from "@/lib/notifications";

export const NotificacionesSection = memo(function NotificacionesSection({ onBack }: SectionProps) {
  const prefs = useFinance((s) => s.appSettings.notifications);
  const setNotificationPrefs = useFinance((s) => s.setNotificationPrefs);
  const { goals, fixedItems } = useFinanceData();

  const toggleEnabled = async (key: keyof NotificationPreferences, value: boolean) => {
    setNotificationPrefs({ [key]: value });
    if (key === "enabled" && value) {
      await requestNotificationPermissions().catch(console.warn);
      scheduleAllNotifications(goals, fixedItems, { ...prefs, enabled: true }).catch(console.warn);
    } else if (key === "enabled" && !value) {
      cancelAllLocalNotifications().catch(console.warn);
    }
  };

  const updateUpcomingDays = (days: number[]) => {
    setNotificationPrefs({ upcomingDays: days });
    if (prefs.enabled) {
      scheduleAllNotifications(goals, fixedItems, { ...prefs, upcomingDays: days }).catch(console.warn);
    }
  };

  const toggleDay = (day: number) => {
    const newDays = prefs.upcomingDays.includes(day)
      ? prefs.upcomingDays.filter((d) => d !== day)
      : [...prefs.upcomingDays, day].sort((a, b) => a - b);
    updateUpcomingDays(newDays);
  };

  const testNotification = async () => {
    try {
      await sendTestNotification();
      toast.success("Notificación de prueba enviada 🎉");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo enviar la notificación de prueba");
    }
  };

  return (
    <div className="space-y-6">
      <AjustesHeader
        title="Notificaciones y Avisos"
        description="Configura recordatorios de pagos, metas próximas a vencer y horario silencioso"
        icon={Bell}
        iconColorClass="bg-indigo-500/10 text-indigo-500"
        onBack={onBack}
      />

      <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-4">
        {/* Master Switch */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bell className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Notificaciones activas</p>
              <p className="text-xs text-muted-foreground">Recibe avisos de pagos y seguimiento financiero</p>
            </div>
          </div>
          <Switch
            checked={prefs.enabled}
            onCheckedChange={(v) => toggleEnabled("enabled", v)}
            aria-label="Alternar notificaciones"
          />
        </div>

        {prefs.enabled && (
          <>
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Notificaciones locales en el dispositivo</p>
                  <p className="text-xs text-muted-foreground">Funcionan sin internet ni consumo de datos</p>
                </div>
                <Switch checked={prefs.localEnabled} onCheckedChange={(v) => toggleEnabled("localEnabled", v)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Notificaciones push (nube)</p>
                  <p className="text-xs text-muted-foreground">Sincronizadas mediante Supabase</p>
                </div>
                <Switch checked={prefs.pushEnabled} onCheckedChange={(v) => toggleEnabled("pushEnabled", v)} />
              </div>

              <div className="border-t border-border pt-3"></div>

              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Avisos de Metas</h4>

              <div className="space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-medium text-sm">Meta próxima a vencer</p>
                    <p className="text-xs text-muted-foreground">Avisar con días de anticipación</p>
                  </div>
                  <Switch
                    checked={prefs.upcomingDays.length > 0}
                    onCheckedChange={(v) => {
                      if (v) updateUpcomingDays([7, 3, 1]);
                      else updateUpcomingDays([]);
                    }}
                  />
                </label>

                {prefs.upcomingDays.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[1, 3, 7, 14].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                          prefs.upcomingDays.includes(day)
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        {day} día{day === 1 ? "" : "s"} antes
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Alerta de meta vencida</p>
                  <p className="text-xs text-muted-foreground">Notificar si la fecha límite pasó sin completarse</p>
                </div>
                <Switch checked={prefs.overdueAlert} onCheckedChange={(v) => toggleEnabled("overdueAlert", v)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Alerta de ritmo atrasado</p>
                  <p className="text-xs text-muted-foreground">Notificar si el ritmo de ahorro es inferior al requerido</p>
                </div>
                <Switch checked={prefs.behindPaceAlert} onCheckedChange={(v) => toggleEnabled("behindPaceAlert", v)} />
              </div>

              <div className="border-t border-border pt-3"></div>

              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Avisos de Pagos Recurrentes</h4>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Recordatorio de pagos fijos</p>
                  <p className="text-xs text-muted-foreground">Recordar 3 días antes de las fechas de corte o vencimiento</p>
                </div>
                <Switch checked={prefs.fixedItemReminders} onCheckedChange={(v) => toggleEnabled("fixedItemReminders", v)} />
              </div>

              <div className="border-t border-border pt-3"></div>

              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5" /> Horario silencioso
              </h4>
              <p className="text-xs text-muted-foreground">No emitir alertas dentro de este rango horario:</p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs">Inicio</Label>
                  <Input
                    type="time"
                    value={prefs.quietHours.start}
                    onChange={(e) => setNotificationPrefs({ quietHours: { ...prefs.quietHours, start: e.target.value } })}
                    className="h-10 rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Fin</Label>
                  <Input
                    type="time"
                    value={prefs.quietHours.end}
                    onChange={(e) => setNotificationPrefs({ quietHours: { ...prefs.quietHours, end: e.target.value } })}
                    className="h-10 rounded-xl mt-1"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4"></div>

              <Button onClick={testNotification} variant="outline" className="w-full h-11 rounded-xl text-xs font-semibold">
                <Sparkles className="size-4 mr-2 text-primary" /> Enviar notificación de prueba ahora
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default NotificacionesSection;
