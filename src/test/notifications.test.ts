import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFS,
  FixedItem,
  Goal,
  Transaction,
  getUpcomingOccurrencesForFixedItem,
  statusForGoal,
  paceForGoal,
  buildScheduledTxId,
} from "@/lib/finance";
import { sanitizeNotificationPrefs } from "@/lib/sanitizers";
import { notificationPreferencesSchema } from "@/lib/validators";
import {
  computeGoalNotifications,
  computeFixedItemNotifications,
  isDateInQuietHours,
  applyPreferredTimeAndQuietHours,
  hasNotificationBeenDelivered,
  markNotificationDelivered,
  clearDeliveredNotificationsLog,
  hashCode,
} from "@/lib/notifications";

describe("Notifications Engine, Preferences Sanitizer & Calculators", () => {
  beforeEach(() => {
    clearDeliveredNotificationsLog();
  });

  describe("1. Sanitización e Hidratación de Preferencias", () => {
    it("rellena objetos parciales o legados con DEFAULT_NOTIFICATION_PREFS y pasa validación Zod", () => {
      const legacyPartial = {
        enabled: true,
        upcomingDays: [1, 7, 3, 3, -5, 99],
        quietHours: { start: "23:00" },
      };

      const sanitized = sanitizeNotificationPrefs(legacyPartial);
      expect(sanitized.enabled).toBe(true);
      expect(sanitized.upcomingDays).toEqual([7, 3, 1]);
      expect(sanitized.fixedUpcomingDays).toEqual([3, 1, 0]);
      expect(sanitized.quietHours).toEqual({ start: "23:00", end: "08:00" });
      expect(sanitized.preferredTime).toBe("09:00");
      expect(sanitized.behindPaceTolerancePct).toBe(2);

      const validation = notificationPreferencesSchema.safeParse(sanitized);
      expect(validation.success).toBe(true);
    });

    it("maneja null, undefined o valores corruptos devolviendo defaults seguros", () => {
      const fromNull = sanitizeNotificationPrefs(null);
      expect(fromNull).toEqual(DEFAULT_NOTIFICATION_PREFS);

      const fromCorrupt = sanitizeNotificationPrefs({
        preferredTime: "99:99",
        behindPaceTolerancePct: 500,
        overdueRepeat: "invalid_freq",
      });
      expect(fromCorrupt.preferredTime).toBe("09:00");
      expect(fromCorrupt.behindPaceTolerancePct).toBe(50);
      expect(fromCorrupt.overdueRepeat).toBe("every_3_days");
    });

    it("genera IDs enteros positivos de 31 bits seguros para Android NotificationManager", () => {
      const ids = [
        "goal_deadline_upcoming_123_7d",
        "fixed_item_due_abc_2026-05-10_0d",
        "polygenelubricants", // cadena conocida por producir -2147483648 en hash de 32 bits
      ];
      for (const str of ids) {
        const h = hashCode(str);
        expect(Number.isInteger(h)).toBe(true);
        expect(h).toBeGreaterThan(0);
        expect(h).toBeLessThanOrEqual(2147483647);
      }
    });
  });

  describe("2. Alertas de Metas: Cercanía de Límite, Vencimiento y Atraso según el Plan", () => {
    const fixedNow = new Date(2026, 4, 10, 8, 30, 0); // 10 de mayo 2026, 08:30 AM

    it("genera alertas para cada día configurado en upcomingDays incluyendo 0 (mismo día)", () => {
      const goal: Goal = {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Fondo de Emergencia",
        target: 10000,
        saved: 8500,
        emoji: "🛟",
        color: "gradient-primary",
        createdAt: "2026-01-01T00:00:00.000Z",
        deadline: "2026-05-13", // En 3 días desde el 10 de mayo
      };

      const notifs = computeGoalNotifications(
        goal,
        {
          ...DEFAULT_NOTIFICATION_PREFS,
          upcomingDays: [7, 3, 1, 0],
          behindPaceAlert: false,
        },
        fixedNow,
      );

      // Como faltan 3 días, deben programarse las de 3d (hoy 10 mayo), 1d (12 mayo) y 0d (13 mayo); 7d ya pasó
      const upcoming = notifs.filter((n) => n.type === "goal_deadline_upcoming");
      expect(upcoming.map((n) => n.payload?.daysBefore)).toEqual([3, 1, 0]);
      expect(upcoming[0].scheduledAt.getFullYear()).toBe(2026);
      expect(upcoming[0].scheduledAt.getMonth()).toBe(4);
      expect(upcoming[0].scheduledAt.getDate()).toBe(10);
      expect(upcoming[0].scheduledAt.getHours()).toBe(9);
    });

    it("detecta cuando una meta va atrasada según el plan lineal y calcula déficit y cuota diaria", () => {
      // Meta de 100 días: 1 abril 2026 -> 10 julio 2026 (100 días)
      // En el día 50 (21 mayo 2026), el ideal es $5,000 (50%). Si lleva $2,000 (20%), va $3,000 atrasado.
      const start = new Date(2026, 3, 1, 12, 0, 0);
      const mid = new Date(2026, 4, 21, 10, 0, 0); // +50 días
      const end = new Date(2026, 6, 10, 12, 0, 0); // +100 días

      const behindGoal: Goal = {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Viaje a Japón",
        target: 10000,
        saved: 2000,
        emoji: "✈️",
        color: "gradient-ocean",
        createdAt: start.toISOString(),
        deadline: end.toISOString(),
      };

      const status = statusForGoal(behindGoal, 2, mid);
      expect(status?.kind).toBe("behind");
      expect(Math.round(status?.ideal ?? 0)).toBe(5000);
      expect(status?.actual).toBe(2000);

      const pace = paceForGoal(behindGoal, mid);
      expect(pace?.remaining).toBe(8000);
      expect(pace?.days).toBe(50);
      expect(pace?.perDay).toBe(160);

      const notifs = computeGoalNotifications(
        behindGoal,
        {
          ...DEFAULT_NOTIFICATION_PREFS,
          goalDeadlineReminders: false,
          behindPaceAlert: true,
          behindPaceTolerancePct: 2,
        },
        mid,
      );

      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe("goal_behind_pace");
      expect(notifs[0].body).toContain("$3,000");
      expect(notifs[0].body).toContain("$160/día");
    });

    it("no genera alerta de atraso cuando la meta va al ritmo del plan", () => {
      const start = new Date(2026, 3, 1, 12, 0, 0);
      const mid = new Date(2026, 4, 21, 10, 0, 0);
      const end = new Date(2026, 6, 10, 12, 0, 0);

      const onTrackGoal: Goal = {
        id: "33333333-3333-4333-8333-333333333333",
        name: "Laptop",
        target: 10000,
        saved: 5000,
        emoji: "💻",
        color: "gradient-primary",
        createdAt: start.toISOString(),
        deadline: end.toISOString(),
      };

      const notifs = computeGoalNotifications(
        onTrackGoal,
        {
          ...DEFAULT_NOTIFICATION_PREFS,
          goalDeadlineReminders: false,
          behindPaceAlert: true,
        },
        mid,
      );

      expect(notifs).toHaveLength(0);
    });

    it("oculta los montos con $••• cuando hideAmountsInNotifications está activo", () => {
      const overdueGoal: Goal = {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Moto",
        target: 30000,
        saved: 10000,
        emoji: "🏍️",
        color: "gradient-sunset",
        deadline: "2026-05-01",
      };

      const notifs = computeGoalNotifications(
        overdueGoal,
        {
          ...DEFAULT_NOTIFICATION_PREFS,
          overdueAlert: true,
          hideAmountsInNotifications: true,
        },
        fixedNow,
      );

      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe("goal_overdue");
      expect(notifs[0].body).toContain("$•••");
      expect(notifs[0].body).not.toContain("20,000");
    });
  });

  describe("3. Conceptos Fijos / Recurrentes: 9 Frecuencias, Fin de Mes y Filtros", () => {
    const baseItem: FixedItem = {
      id: "55555555-5555-4555-8555-555555555555",
      type: "expense_fixed",
      category: "Servicios",
      concept: "Internet Fibra",
      amount: 699,
      frequency: "monthly",
      active: true,
      startDate: "2026-01-15",
      endDate: "2028-12-31",
      priority: "high",
      payDay: 15,
    };

    it("calcula ocurrencias exactas para las 9 frecuencias soportadas", () => {
      const now = new Date(2026, 0, 10, 9, 0, 0); // 10 de enero 2026

      // 1. monthly
      const monthlyOcc = getUpcomingOccurrencesForFixedItem(baseItem, [], now, 2);
      expect(monthlyOcc.map((o) => o.dueISO)).toEqual(["2026-01-15", "2026-02-15"]);

      // 2. biweekly
      const biweeklyOcc = getUpcomingOccurrencesForFixedItem(
        { ...baseItem, frequency: "biweekly", payDay: 15 },
        [],
        now,
        2,
      );
      expect(biweeklyOcc.map((o) => o.dueISO)).toEqual(["2026-01-15", "2026-01-30"]);

      // 3. weekly (payWeekDay = 1 -> Lunes; 10 enero 2026 es Sábado -> Lunes 12 y Lunes 19 cuando inició el 1 de enero)
      const weeklyOcc = getUpcomingOccurrencesForFixedItem(
        { ...baseItem, startDate: "2026-01-01", frequency: "weekly", payWeekDay: 1 },
        [],
        now,
        2,
      );
      expect(weeklyOcc.map((o) => o.dueISO)).toEqual(["2026-01-12", "2026-01-19"]);

      // Y si startDate es futuro (15 de enero), el primer Lunes >= startDate es el 19 de enero
      const weeklyFutureStart = getUpcomingOccurrencesForFixedItem(
        { ...baseItem, startDate: "2026-01-15", frequency: "weekly", payWeekDay: 1 },
        [],
        now,
        2,
      );
      expect(weeklyFutureStart.map((o) => o.dueISO)).toEqual(["2026-01-19", "2026-01-26"]);

      // 4. bimonthly (enero y marzo)
      const bimonthlyOcc = getUpcomingOccurrencesForFixedItem(
        { ...baseItem, frequency: "bimonthly", payDay: 15 },
        [],
        now,
        2,
      );
      expect(bimonthlyOcc.map((o) => o.dueISO)).toEqual(["2026-01-15", "2026-03-15"]);

      // 5. quarterly (enero y abril)
      const quarterlyOcc = getUpcomingOccurrencesForFixedItem(
        { ...baseItem, frequency: "quarterly", payDay: 15 },
        [],
        now,
        2,
      );
      expect(quarterlyOcc.map((o) => o.dueISO)).toEqual(["2026-01-15", "2026-04-15"]);

      // 6. fourmonthly (enero y mayo)
      const fourmonthlyOcc = getUpcomingOccurrencesForFixedItem(
        { ...baseItem, frequency: "fourmonthly", payDay: 15 },
        [],
        now,
        2,
      );
      expect(fourmonthlyOcc.map((o) => o.dueISO)).toEqual(["2026-01-15", "2026-05-15"]);

      // 7. biannual (enero y julio)
      const biannualOcc = getUpcomingOccurrencesForFixedItem(
        { ...baseItem, frequency: "biannual", payDay: 15 },
        [],
        now,
        2,
      );
      expect(biannualOcc.map((o) => o.dueISO)).toEqual(["2026-01-15", "2026-07-15"]);

      // 8. yearly (enero 2026 y enero 2027)
      const yearlyOcc = getUpcomingOccurrencesForFixedItem(
        { ...baseItem, frequency: "yearly", payDay: 15 },
        [],
        now,
        2,
      );
      expect(yearlyOcc.map((o) => o.dueISO)).toEqual(["2026-01-15", "2027-01-15"]);

      // 9. one_time (solo una ocurrencia)
      const oneTimeOcc = getUpcomingOccurrencesForFixedItem(
        { ...baseItem, frequency: "one_time", payDay: 20 },
        [],
        now,
        2,
      );
      expect(oneTimeOcc.map((o) => o.dueISO)).toEqual(["2026-01-20"]);
    });

    it("ajusta payDay=31 al último día de febrero (28) sin saltar el mes", () => {
      const febNow = new Date(2026, 1, 20, 9, 0, 0); // 20 feb 2026
      const occ = getUpcomingOccurrencesForFixedItem(
        { ...baseItem, payDay: 31 },
        [],
        febNow,
        2,
      );
      expect(occ[0].dueISO).toBe("2026-02-28");
      expect(occ[1].dueISO).toBe("2026-03-31");
    });

    it("programa alertas anticipadas en dueDate - daysBefore y respeta filtros por tipo y skipIfAlreadyRecorded", () => {
      const now = new Date(2026, 4, 10, 8, 0, 0); // 10 mayo 2026
      const itemDueMay15: FixedItem = {
        ...baseItem,
        type: "income_fixed",
        concept: "Nómina Quincenal",
        amount: 15000,
        payDay: 15,
      };

      // Si notifyFixedIncomes es false, no genera alertas
      expect(
        computeFixedItemNotifications(
          itemDueMay15,
          { ...DEFAULT_NOTIFICATION_PREFS, notifyFixedIncomes: false },
          [],
          now,
        ),
      ).toHaveLength(0);

      // Con fixedUpcomingDays: [3, 1, 0], para el vencimiento 2026-05-15 debe agendar el 12, 14 y 15 de mayo
      const notifs = computeFixedItemNotifications(
        itemDueMay15,
        { ...DEFAULT_NOTIFICATION_PREFS, fixedUpcomingDays: [3, 1, 0] },
        [],
        now,
      );
      const firstCycle = notifs.filter((n) => n.payload?.dueISO === "2026-05-15");
      expect(firstCycle).toHaveLength(3);
      expect(firstCycle.map((n) => n.scheduledAt.getDate())).toEqual([12, 14, 15]);
      expect(firstCycle[0].title).toContain("Ingreso próximo");

      // Si el usuario ya registró manualmente el movimiento del 15 de mayo, omite mayo pero agenda junio
      const manualTx: Transaction = {
        id: "66666666-6666-4666-8666-666666666666",
        type: "income",
        category: "Trabajo",
        concept: "Nómina Quincenal",
        amount: 15000,
        date: "2026-05-15T12:00:00.000Z",
        fixedId: itemDueMay15.id,
      };
      const afterManual = computeFixedItemNotifications(
        itemDueMay15,
        { ...DEFAULT_NOTIFICATION_PREFS, fixedUpcomingDays: [3, 0], skipIfAlreadyRecorded: true },
        [manualTx],
        now,
      );
      expect(afterManual.some((n) => n.payload?.dueISO === "2026-05-15")).toBe(false);
      expect(afterManual.some((n) => n.payload?.dueISO === "2026-06-15")).toBe(true);

      // Si fue auto-registrado HOY por reconcileScheduledTransactions, conserva el aviso de hoy (0d)
      const dueTodayNow = new Date(2026, 4, 15, 8, 0, 0);
      const autoTx: Transaction = {
        id: buildScheduledTxId(itemDueMay15.id, "2026-05-15"),
        type: "income",
        category: "Trabajo",
        concept: "Nómina Quincenal",
        amount: 15000,
        date: "2026-05-15T12:00:00.000Z",
        fixedId: itemDueMay15.id,
      };
      const withAutoToday = computeFixedItemNotifications(
        itemDueMay15,
        { ...DEFAULT_NOTIFICATION_PREFS, fixedUpcomingDays: [0], skipIfAlreadyRecorded: true },
        [autoTx],
        dueTodayNow,
      );
      expect(withAutoToday.some((n) => n.payload?.dueISO === "2026-05-15")).toBe(true);
    });
  });

  describe("4. Horario Silencioso (No Molestar) y Deduplicación Persistente", () => {
    it("desplaza alertas que caen en horario silencioso (22:00 - 08:00) hacia las 08:00 sin descartarlas", () => {
      const prefs = {
        ...DEFAULT_NOTIFICATION_PREFS,
        preferredTime: "23:15",
        quietHoursEnabled: true,
        quietHours: { start: "22:00", end: "08:00" },
      };

      const nightTarget = new Date(2026, 4, 10, 12, 0, 0);
      expect(isDateInQuietHours(new Date(2026, 4, 10, 23, 15, 0), prefs)).toBe(true);
      expect(isDateInQuietHours(new Date(2026, 4, 10, 6, 30, 0), prefs)).toBe(true);
      expect(isDateInQuietHours(new Date(2026, 4, 10, 12, 0, 0), prefs)).toBe(false);

      // Como preferredTime (23:15) cae en el tramo nocturno, debe posponerse a las 08:00 del día siguiente (11 mayo)
      const shifted = applyPreferredTimeAndQuietHours(nightTarget, prefs);
      expect(shifted.getDate()).toBe(11);
      expect(shifted.getHours()).toBe(8);
      expect(shifted.getMinutes()).toBe(0);
    });

    it("evita duplicar notificaciones ya entregadas mediante hasNotificationBeenDelivered / markNotificationDelivered", () => {
      const key = "goal_overdue_test_2026-05-10";
      expect(hasNotificationBeenDelivered(key)).toBe(false);
      markNotificationDelivered(key, new Date());
      expect(hasNotificationBeenDelivered(key)).toBe(true);
    });
  });
});
