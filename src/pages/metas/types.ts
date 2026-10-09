import { Goal, GoalFolder, parseDateLocal } from "@/lib/finance";

export const PALETTES = [
  "gradient-sunset",
  "gradient-ocean",
  "gradient-secondary",
  "gradient-success",
  "gradient-primary",
];

export type FolderNode = GoalFolder & { children: FolderNode[] };

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000));
}

export function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function normalizeUrl(u?: string): string | undefined {
  if (!u) return undefined;
  const t = u.trim();
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function paceFor(goal: Goal) {
  if (!goal.deadline) return null;
  const remaining = Math.max(0, goal.target - goal.saved);
  const today = startOfDay(new Date());
  const cleanDl = goal.deadline.slice(0, 10);
  const dl = startOfDay(parseDateLocal(`${cleanDl}T12:00:00`));
  const days = Math.max(1, daysBetween(today, dl) || 1);
  return {
    remaining,
    days,
    perDay: remaining / days,
    perWeek: remaining / (days / 7),
    perMonth: remaining / (days / 30),
    overdue: dl < today,
  };
}

export function expectedAt(goal: Goal, date: Date): number {
  if (!goal.deadline) return goal.target;
  const start = startOfDay(parseDateLocal(goal.createdAt ?? new Date().toISOString()));
  const cleanDl = goal.deadline.slice(0, 10);
  const dl = startOfDay(parseDateLocal(`${cleanDl}T12:00:00`));
  const total = Math.max(1, daysBetween(start, dl));
  const elapsed = Math.min(total, Math.max(0, daysBetween(start, date)));
  return (goal.target * elapsed) / total;
}

export function actualAt(goal: Goal, date: Date): number {
  const end = startOfDay(date).getTime();
  const initial = (goal.contributions && goal.contributions.length > 0)
    ? 0
    : goal.saved;
  const sum = (goal.contributions ?? []).reduce((acc, c) => {
    const t = startOfDay(parseDateLocal(c.date)).getTime();
    return t <= end ? acc + c.amount : acc;
  }, 0);
  return Math.max(0, initial + sum);
}

export function statusFor(goal: Goal) {
  if (!goal.deadline) return null;
  const today = new Date();
  const ideal = expectedAt(goal, today);
  const actual = actualAt(goal, today);
  const diff = actual - ideal;
  const tolerance = Math.max(50, goal.target * 0.02);
  if (goal.saved >= goal.target) return { kind: "done" as const, diff };
  if (diff < -tolerance) return { kind: "behind" as const, diff };
  if (diff > tolerance) return { kind: "ahead" as const, diff };
  return { kind: "ontrack" as const, diff };
}
