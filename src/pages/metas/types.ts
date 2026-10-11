import {
  Goal,
  GoalFolder,
  startOfDay,
  daysBetween,
  paceForGoal,
  expectedGoalAt,
  actualGoalAt,
  statusForGoal,
} from "@/lib/finance";

export { startOfDay, daysBetween };

export const PALETTES = [
  "gradient-sunset",
  "gradient-ocean",
  "gradient-secondary",
  "gradient-success",
  "gradient-primary",
];

export type FolderNode = GoalFolder & { children: FolderNode[] };

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

export const paceFor = paceForGoal;
export const expectedAt = expectedGoalAt;
export const actualAt = actualGoalAt;
export const statusFor = (goal: Goal): ReturnType<typeof statusForGoal> =>
  statusForGoal(goal, 2);

