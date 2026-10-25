import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useFinanceData } from "@/hooks/useFinanceData";
import {
  fmt,
  Goal,
  GoalFolder,
  paceForGoal,
  statusForGoal,
  fmtDate,
  Account,
} from "@/lib/finance";
import { Header } from "@/components/app/Header";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Search,
  X,
  Target,
  FolderPlus,
  Folder,
  Pin,
  ExternalLink,
  SlidersHorizontal,
  Sparkles,
  Calendar,
  Clock,
  TrendingUp,
  Coins,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { IconDisplay } from "@/components/app/IconDisplay";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";
import { PALETTES, FolderNode, normalizeUrl } from "@/pages/metas/types";
import { GoalForm } from "@/pages/metas/GoalForm";
import { FolderForm } from "@/pages/metas/FolderForm";

const localDateNow = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function getGoalProgress(goal: Goal) {
  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  const remaining = Math.max(0, goal.target - goal.saved);
  const completed = goal.saved >= goal.target;
  const pace = paceForGoal(goal);
  const status = statusForGoal(goal, 2);

  // Hitos estándar: 25%, 50%, 75%, 100%
  const milestones = [
    { label: "25%", value: goal.target * 0.25, reached: goal.saved >= goal.target * 0.25 },
    { label: "50%", value: goal.target * 0.5, reached: goal.saved >= goal.target * 0.5 },
    { label: "75%", value: goal.target * 0.75, reached: goal.saved >= goal.target * 0.75 },
    { label: "100%", value: goal.target, reached: completed },
  ];

  return { pct, remaining, completed, pace, status, milestones };
}

export function MetasV2() {
  const {
    goals,
    goalFolders,
    addGoal,
    updateGoal,
    removeGoal,
    contributeGoal,
    accounts,
    addGoalFolder,
    updateGoalFolder,
    removeGoalFolder,
  } = useFinanceData();

  const [params] = useSearchParams();

  // Estados de Filtros y Carpetas
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // null = todas, "uncategorized" = sin carpeta
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");

  // Selección Master-Detail
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Modales
  const [openGoalModal, setOpenGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);

  const [openFolderModal, setOpenFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<GoalFolder | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<GoalFolder | null>(null);

  // Deep-linking desde URL (?id=...)
  useEffect(() => {
    const id = params.get("id");
    if (id && goals.some((g) => g.id === id)) {
      setSelectedId(id);
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setIsMobileDrawerOpen(true);
      }
    }
  }, [params, goals]);

  // Helper para resolver todos los IDs de subcarpetas descendientes
  const getFolderAndDescendantIds = useMemo(() => {
    return (folderId: string): Set<string> => {
      const set = new Set<string>([folderId]);
      const addChildren = (pid: string) => {
        goalFolders
          .filter((f) => f.parentId === pid)
          .forEach((c) => {
            set.add(c.id);
            addChildren(c.id);
          });
      };
      addChildren(folderId);
      return set;
    };
  }, [goalFolders]);

  // Conteo de metas por carpeta (incluyendo recursión para subcarpetas)
  const getFolderGoalCount = (folderId: string): number => {
    let count = goals.filter((g) => g.folderId === folderId).length;
    const children = goalFolders.filter((f) => f.parentId === folderId);
    children.forEach((c) => {
      count += getFolderGoalCount(c.id);
    });
    return count;
  };

  // Totales Globales de Ahorro en Metas
  const totals = useMemo(() => {
    let totalSaved = 0;
    let totalTarget = 0;
    let completedCount = 0;

    goals.forEach((g) => {
      totalSaved += g.saved;
      totalTarget += g.target;
      if (g.saved >= g.target) completedCount += 1;
    });

    const globalPct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
    const totalRemaining = Math.max(0, totalTarget - totalSaved);

    return { totalSaved, totalTarget, globalPct, completedCount, totalRemaining };
  }, [goals]);

  // Metas filtradas
  const visibleGoals = useMemo(() => {
    return goals
      .filter((g) => {
        // Filtro por carpeta
        if (selectedFolderId === "uncategorized" && g.folderId) return false;
        if (selectedFolderId && selectedFolderId !== "uncategorized") {
          const validFolderIds = getFolderAndDescendantIds(selectedFolderId);
          if (!g.folderId || !validFolderIds.has(g.folderId)) return false;
        }

        // Filtro por estado
        const isCompleted = g.saved >= g.target;
        if (statusFilter === "active" && isCompleted) return false;
        if (statusFilter === "completed" && !isCompleted) return false;

        // Búsqueda
        if (query.trim()) {
          const q = query.toLowerCase();
          if (!g.name.toLowerCase().includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Fijadas arriba, luego por completitud
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
      });
  }, [goals, selectedFolderId, statusFilter, query, getFolderAndDescendantIds]);

  const selectedGoal = useMemo(() => {
    return goals.find((g) => g.id === selectedId) || null;
  }, [goals, selectedId]);

  const handleSelectGoal = (g: Goal) => {
    setSelectedId(g.id);
    if (window.innerWidth < 1024) {
      setIsMobileDrawerOpen(true);
    }
  };

  const handleOpenNewFolder = (parentId?: string) => {
    setEditingFolder({
      id: "",
      name: "",
      color: PALETTES[0],
      order: goalFolders.length,
      createdAt: new Date().toISOString(),
      parentId: parentId ?? undefined,
    } as GoalFolder);
    setOpenFolderModal(true);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-24 text-foreground">
      {/* Cabecera Principal */}
      <Header
        title="Metas de Ahorro"
        subtitle="Visualiza tus sueños con hitos y ritmo mensual"
        action={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleOpenNewFolder()}
              variant="outline"
              className="h-10 rounded-xl px-3 text-xs sm:text-sm font-medium border-[#E4E0D8] dark:border-white/10"
            >
              <FolderPlus className="size-4 mr-1.5" />
              <span className="hidden sm:inline">Nueva Carpeta</span>
              <span className="sm:hidden">Carpeta</span>
            </Button>
            <Button
              onClick={() => {
                setEditingGoal(null);
                setOpenGoalModal(true);
              }}
              className="rounded-xl gradient-primary text-primary-foreground border-0 shadow-glow h-10 text-xs sm:text-sm px-3 sm:px-4 font-medium"
            >
              <Plus className="size-4 mr-1.5" />
              <span>Nueva Meta</span>
            </Button>
          </div>
        }
      />

      {/* Resumen Global De-boxed (Warm Editorial Wealth - Anti-AI Law 1 & 3) */}
      <section className="px-4 sm:px-6 mb-6">
        <div className="py-4 border-y border-[#E4E0D8] dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Focal figure: Ahorro Acumulado */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Coins className="size-3.5 text-primary" strokeWidth={1.75} />
                Ahorro Acumulado
              </span>
              <span className="text-[10px] text-muted-foreground font-mono-tabular font-medium">
                Meta global {fmt(totals.totalTarget)}
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-1 flex-wrap">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono-tabular tracking-tight text-foreground">
                {fmt(totals.totalSaved)}
              </span>
              <span className="text-xs font-bold font-mono-tabular px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {totals.globalPct.toFixed(1)}% avance
              </span>
            </div>
            {/* Barra hairline de avance global */}
            <div className="w-full max-w-md h-1.5 rounded-full bg-muted overflow-hidden mt-2">
              <div
                style={{ width: `${totals.globalPct}%` }}
                className="h-full rounded-full bg-primary transition-all duration-500"
              />
            </div>
          </div>

          {/* Cifras de Capital Restante y Cumplimiento con divisor hairline */}
          <div className="grid grid-cols-2 gap-6 sm:gap-8 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-[#E4E0D8] dark:border-white/10 md:pl-8 shrink-0">
            {/* Capital Restante */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
                Capital Restante
              </span>
              <p className="text-xl sm:text-2xl font-bold font-mono-tabular text-amber-700 dark:text-amber-400 mt-1">
                {fmt(totals.totalRemaining)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Por alcanzar en tus metas
              </p>
            </div>

            {/* Metas Conquistadas */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                Cumplimiento
              </span>
              <p className="text-xl sm:text-2xl font-bold font-mono-tabular text-emerald-700 dark:text-emerald-400 mt-1">
                {totals.completedCount} de {goals.length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {goals.length - totals.completedCount} sueños aún en camino activo
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Barra de Carpetas y Categorías (Píldoras fluidas con edición) */}
      <section className="px-4 sm:px-6 mb-5" aria-label="Organizador por carpetas">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {/* Todas */}
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-[0.98] ${
              selectedFolderId === null
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-card border-[#E4E0D8] dark:border-white/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            Todas las metas ({goals.length})
          </button>

          {/* Sin Carpeta */}
          {goals.some((g) => !g.folderId) && (
            <button
              onClick={() => setSelectedFolderId("uncategorized")}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-[0.98] ${
                selectedFolderId === "uncategorized"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card border-[#E4E0D8] dark:border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              Sin carpeta ({goals.filter((g) => !g.folderId).length})
            </button>
          )}

          {/* Carpetas registradas con acciones de edición/eliminación */}
          {goalFolders.map((f) => {
            const count = getFolderGoalCount(f.id);
            const isSelected = selectedFolderId === f.id;
            return (
              <div key={f.id} className="relative group shrink-0 flex items-center">
                <button
                  onClick={() => setSelectedFolderId(isSelected ? null : f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-[0.98] ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card border-[#E4E0D8] dark:border-white/10 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <IconDisplay
                    icon={f.icon ?? { kind: "emoji", value: "📁" }}
                    size="sm"
                    className="size-4 shrink-0"
                  />
                  <span>{f.name}</span>
                  <span className="opacity-75 font-mono-tabular">({count})</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFolder(f);
                    setOpenFolderModal(true);
                  }}
                  title="Editar carpeta"
                  aria-label={`Editar carpeta ${f.name}`}
                  className="size-6 ml-0.5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                >
                  <Pencil className="size-3" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteFolder(f);
                  }}
                  title="Eliminar carpeta"
                  aria-label={`Eliminar carpeta ${f.name}`}
                  className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                >
                  <Trash2 className="size-3" strokeWidth={1.5} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Buscador reactivo y Filtros de Estado */}
      <section className="px-4 sm:px-6 mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Píldoras de Estado */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-xl bg-muted/40 border border-[#E4E0D8] dark:border-white/10">
            {(
              [
                { k: "all", label: "Todas las metas" },
                { k: "active", label: "En progreso" },
                { k: "completed", label: "Alcanzadas" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.k}
                onClick={() => setStatusFilter(tab.k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === tab.k
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Buscador por nombre */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar meta..."
              className="pl-9 pr-9 h-10 rounded-xl bg-card border-[#E4E0D8] dark:border-white/10 text-xs sm:text-sm"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Contenedor Principal Master-Detail (12 Columnas en lg:) */}
      <main className="px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA IZQUIERDA (col-span-7): Catálogo de Metas con Hitos y Ritmo */}
          <section className="lg:col-span-7 space-y-3" aria-label="Lista de metas">
            {goals.length === 0 ? (
              /* Estado Vacío Sin Metas (Anti-AI Law 5: Sin circular bubble badge) */
              <div className="rounded-2xl border border-dashed border-[#E4E0D8] dark:border-white/10 p-10 text-center flex flex-col items-center justify-center">
                <Target className="size-8 text-muted-foreground mb-3" strokeWidth={1.5} />
                <h3 className="font-display-v2 text-lg font-semibold tracking-tight text-foreground mb-1">
                  Sin metas de ahorro aún
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">
                  Crea tu primera meta financiera (un viaje, un fondo de emergencia o un proyecto) y define tu ritmo de ahorro.
                </p>
                <Button
                  onClick={() => {
                    setEditingGoal(null);
                    setOpenGoalModal(true);
                  }}
                  className="rounded-xl gradient-primary text-primary-foreground border-0 shadow-glow h-9 text-xs font-medium"
                >
                  Crear mi primera meta
                </Button>
              </div>
            ) : visibleGoals.length === 0 ? (
              /* Estado Vacío Filtros */
              <div className="rounded-2xl border border-dashed border-[#E4E0D8] dark:border-white/10 p-8 text-center flex flex-col items-center justify-center">
                <p className="text-xs text-muted-foreground mb-3">
                  No se encontraron metas con los filtros seleccionados.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFolderId(null);
                    setStatusFilter("all");
                    setQuery("");
                  }}
                  className="text-xs rounded-lg"
                >
                  Restablecer filtros
                </Button>
              </div>
            ) : (
              visibleGoals.map((g) => {
                const { pct, remaining, completed, pace, milestones } = getGoalProgress(g);
                const isSelected = selectedId === g.id;
                const folder = goalFolders.find((f) => f.id === g.folderId);

                return (
                  <div
                    key={g.id}
                    onClick={() => handleSelectGoal(g)}
                    className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 active:scale-[0.99] ${
                      isSelected
                        ? "border-primary bg-primary/[0.03] ring-1 ring-primary shadow-xs"
                        : "border-[#E4E0D8] dark:border-white/10 bg-card hover:border-primary/40 hover:bg-muted/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <IconDisplay
                          icon={g.icon ?? { kind: "emoji", value: g.emoji || "🎯" }}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold truncate text-foreground">
                              {g.name}
                            </h4>
                            {g.pinned && (
                              <Pin className="size-3 text-primary fill-primary shrink-0" />
                            )}
                            {completed && (
                              <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.2 rounded-full flex items-center gap-0.5">
                                <CheckCircle2 className="size-2.5" /> Cumplida
                              </span>
                            )}
                          </div>
                          {folder && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                              <Folder className="size-2.5" />
                              {folder.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold font-mono-tabular text-foreground">
                          {fmt(g.saved)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">de {fmt(g.target)}</p>
                      </div>
                    </div>

                    {/* Barra de Progreso con Hitos Marcados */}
                    <div className="space-y-1.5 mt-3 pt-2.5 border-t border-[#E4E0D8]/60 dark:border-white/5">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          Faltan: <span className="font-mono-tabular font-medium text-foreground">{fmt(remaining)}</span>
                        </span>
                        <span className="font-mono-tabular font-bold text-foreground">
                          {pct.toFixed(0)}%
                        </span>
                      </div>

                      {/* Barra de track con marcadores de hitos (25, 50, 75, 100) */}
                      <div className="h-2 rounded-full bg-muted overflow-hidden relative">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            completed ? "bg-emerald-600" : "bg-primary"
                          }`}
                        />
                      </div>

                      {/* Chips de Hitos (Milestones) */}
                      <div className="flex items-center justify-between pt-1">
                        {milestones.map((m) => (
                          <span
                            key={m.label}
                            className={`text-[9px] font-mono-tabular px-1.5 py-0.2 rounded-md ${
                              m.reached
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold"
                                : "text-muted-foreground/60"
                            }`}
                          >
                            {m.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Ritmo Requerido y Fecha Límite */}
                    {pace && !completed && (
                      <div className="flex items-center justify-between text-[11px] mt-2.5 pt-2 border-t border-[#E4E0D8]/40 dark:border-white/5 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 text-amber-600 dark:text-amber-400" />
                          <span>
                            Ritmo requerido:{" "}
                            <span className="font-mono-tabular font-bold text-foreground">
                              {fmt(pace.perMonth)}/mes
                            </span>
                          </span>
                        </div>
                        {g.deadline && (
                          <span className="text-[10px]">
                            Límite: {fmtDate(g.deadline)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>

          {/* COLUMNA DERECHA (col-span-5): Panel Inspector Master-Detail en PC (Desktop lg:) */}
          <aside className="hidden lg:block lg:col-span-5 sticky top-20" aria-label="Inspector de meta">
            {selectedGoal ? (
              <GoalInspectorContent
                goal={selectedGoal}
                accounts={accounts}
                onClose={() => setSelectedId(null)}
                onEdit={() => setEditingGoal(selectedGoal)}
                onDelete={() => setDeleteGoal(selectedGoal)}
                onTogglePin={() => updateGoal(selectedGoal.id, { pinned: !selectedGoal.pinned })}
                onContribute={(amt, date, acc) => contributeGoal(selectedGoal.id, amt, date, acc)}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-[#E4E0D8] dark:border-white/10 p-10 text-center flex flex-col items-center justify-center bg-card/40">
                <SlidersHorizontal className="size-8 text-muted-foreground mb-3" strokeWidth={1.5} />
                <h4 className="font-display-v2 text-base font-semibold text-foreground mb-1">
                  Inspector de Metas
                </h4>
                <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
                  Selecciona una meta para ver el desglose de hitos, ritmo necesario y realizar aportaciones ágiles de un toque.
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Drawer Móvil (< lg) */}
      <Drawer open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
        <DrawerContent className="max-h-[88dvh] overflow-y-auto px-4 pb-8">
          <DrawerHeader className="text-left px-0 pt-4 pb-2">
            <DrawerTitle className="font-display-v2 text-lg">Detalle de Meta</DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              Progreso, hitos y aportaciones
            </DrawerDescription>
          </DrawerHeader>
          {selectedGoal && (
            <GoalInspectorContent
              goal={selectedGoal}
              accounts={accounts}
              onClose={() => setIsMobileDrawerOpen(false)}
              onEdit={() => {
                setIsMobileDrawerOpen(false);
                setEditingGoal(selectedGoal);
              }}
              onDelete={() => {
                setIsMobileDrawerOpen(false);
                setDeleteGoal(selectedGoal);
              }}
              onTogglePin={() => updateGoal(selectedGoal.id, { pinned: !selectedGoal.pinned })}
              onContribute={(amt, date, acc) => contributeGoal(selectedGoal.id, amt, date, acc)}
            />
          )}
        </DrawerContent>
      </Drawer>

      {/* Modal Nueva Meta / Editar Meta */}
      <Dialog
        open={openGoalModal || !!editingGoal}
        onOpenChange={(v) => {
          if (!v) {
            setOpenGoalModal(false);
            setEditingGoal(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl max-h-[90dvh] overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle className="font-display-v2 text-lg">
              {editingGoal ? "Editar meta" : "Nueva meta de ahorro"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define el objetivo, fecha límite y carpeta organizadora
            </DialogDescription>
          </DialogHeader>
          <GoalForm
            initial={editingGoal}
            folders={goalFolders}
            defaultFolderId={
              selectedFolderId === "uncategorized" || !selectedFolderId
                ? undefined
                : selectedFolderId
            }
            onSave={async (g) => {
              try {
                if (editingGoal) {
                  await updateGoal(editingGoal.id, g);
                  toast.success("Meta actualizada");
                } else {
                  await addGoal(g);
                  toast.success("Meta creada ✨");
                }
                setOpenGoalModal(false);
                setEditingGoal(null);
              } catch (e: any) {
                toast.error(e.message || "Ocurrió un error");
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal Nueva / Editar Carpeta */}
      <Dialog
        open={openFolderModal || !!editingFolder}
        onOpenChange={(v) => {
          if (!v) {
            setOpenFolderModal(false);
            setEditingFolder(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl max-h-[90dvh] overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle className="font-display-v2 text-lg">
              {editingFolder?.id ? "Editar carpeta" : "Nueva carpeta"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Organiza tus metas en grupos temáticos
            </DialogDescription>
          </DialogHeader>
          <FolderForm
            initial={editingFolder}
            onSave={async (f) => {
              try {
                if (editingFolder?.id) {
                  await updateGoalFolder(editingFolder.id, f);
                  toast.success("Carpeta actualizada");
                } else {
                  await addGoalFolder(f);
                  toast.success("Carpeta creada ✨");
                }
                setOpenFolderModal(false);
                setEditingFolder(null);
              } catch (e: any) {
                toast.error(e.message || "Ocurrió un error");
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmación para Eliminar Meta */}
      <ElegantConfirm
        open={!!deleteGoal}
        onOpenChange={(v) => !v && setDeleteGoal(null)}
        title="¿Eliminar meta?"
        description={
          <span className="text-sm text-muted-foreground">
            ¿Estás seguro de eliminar la meta{" "}
            <span className="font-bold text-foreground">"{deleteGoal?.name}"</span>? Esta acción no se
            puede deshacer.
          </span>
        }
        onConfirm={async () => {
          if (deleteGoal) {
            try {
              await removeGoal(deleteGoal.id);
              toast.success("Meta eliminada");
              if (selectedId === deleteGoal.id) setSelectedId(null);
            } catch (e: any) {
              toast.error(e.message || "Error al eliminar");
            }
            setDeleteGoal(null);
          }
        }}
        icon={Trash2}
        iconColor="bg-destructive"
      />

      {/* Confirmación para Eliminar Carpeta */}
      <ElegantConfirm
        open={!!deleteFolder}
        onOpenChange={(v) => !v && setDeleteFolder(null)}
        title="¿Eliminar carpeta?"
        description={
          <span className="text-sm text-muted-foreground">
            ¿Estás seguro de eliminar la carpeta{" "}
            <span className="font-bold text-foreground">"{deleteFolder?.name}"</span>? Las metas no se
            eliminarán, solo quedarán sin carpeta organizadora.
          </span>
        }
        onConfirm={async () => {
          if (deleteFolder) {
            try {
              await removeGoalFolder(deleteFolder.id);
              toast.success("Carpeta eliminada");
              if (selectedFolderId === deleteFolder.id) setSelectedFolderId(null);
            } catch (e: any) {
              toast.error(e.message || "Error al eliminar la carpeta");
            }
            setDeleteFolder(null);
          }
        }}
        icon={Trash2}
        iconColor="bg-destructive"
      />
    </div>
  );
}

/** Componente Inspector de Meta (Desktop y Drawer Móvil) */
function GoalInspectorContent({
  goal,
  accounts,
  onClose,
  onEdit,
  onDelete,
  onTogglePin,
  onContribute,
}: {
  goal: Goal;
  accounts: Account[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onContribute: (amount: number, date: string, accountId?: string) => Promise<void>;
}) {
  const { pct, remaining, completed, pace, milestones } = getGoalProgress(goal);

  // Formulario de Aportación Ágil (Quick Contribution)
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(localDateNow());
  const [accountId, setAccountId] = useState<string | undefined>(accounts[0]?.id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const handleQuickAdd = (delta: number) => {
    const cur = parseFloat(amount) || 0;
    setAmount(String(cur + delta));
  };

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!a || a <= 0) {
      toast.error("Ingresa un monto válido para aportar");
      return;
    }

    setIsSubmitting(true);
    try {
      await onContribute(a, new Date(`${date}T12:00:00`).toISOString(), accountId || undefined);
      toast.success(`¡Aportación de ${fmt(a)} registrada! 🎉`);
      setAmount("");
    } catch (err: any) {
      toast.error(err.message || "Error al registrar la aportación");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-card p-5 shadow-xs space-y-5">
      {/* Cabecera del Inspector */}
      <div className="flex items-start justify-between pb-3 border-b border-[#E4E0D8] dark:border-white/10">
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <IconDisplay
            icon={goal.icon ?? { kind: "emoji", value: goal.emoji || "🎯" }}
            size="lg"
          />
          <div className="min-w-0">
            <h3 className="font-display-v2 text-xl font-bold tracking-tight text-foreground truncate">
              {goal.name}
            </h3>
            {goal.purchaseUrl && (
              <a
                href={normalizeUrl(goal.purchaseUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-0.5 truncate"
              >
                <ExternalLink className="size-3" /> Ver producto
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onTogglePin}
            className={`size-8 rounded-lg flex items-center justify-center transition ${
              goal.pinned
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title={goal.pinned ? "Desfijar meta" : "Fijar meta al inicio"}
          >
            <Pin className={`size-3.5 ${goal.pinned ? "fill-primary" : ""}`} />
          </button>
          <Button size="sm" variant="outline" onClick={onEdit} className="h-8 text-xs rounded-lg gap-1">
            <Pencil className="size-3" strokeWidth={1.5} />
            <span>Editar</span>
          </Button>
          <button
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="Cerrar panel"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="p-4 rounded-xl bg-muted/40 border border-[#E4E0D8]/60 dark:border-white/5 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground font-medium">Ahorrado</span>
          <span className="text-2xl font-bold font-mono-tabular tracking-tight text-foreground">
            {fmt(goal.saved)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            style={{ width: `${pct}%` }}
            className={`h-full rounded-full transition-all duration-500 ${
              completed ? "bg-emerald-600" : "bg-primary"
            }`}
          />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
          <span>
            Objetivo: <span className="font-mono-tabular font-medium text-foreground">{fmt(goal.target)}</span>
          </span>
          <span>
            Falta: <span className="font-mono-tabular font-medium text-foreground">{fmt(remaining)}</span> ({pct.toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* Desglose de Hitos (Milestones Tracker) */}
      <div className="space-y-2">
        <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
          <Target className="size-3.5 text-primary" />
          Hitos del Sueño
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {milestones.map((m) => (
            <div
              key={m.label}
              className={`p-2 rounded-xl border text-center transition ${
                m.reached
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                  : "bg-muted/20 border-[#E4E0D8]/50 dark:border-white/5 text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <span className="text-xs font-bold font-mono-tabular">{m.label}</span>
                {m.reached && <CheckCircle2 className="size-2.5 text-emerald-600" />}
              </div>
              <span className="text-[10px] font-mono-tabular block truncate">
                {fmt(m.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ritmo Requerido y Análisis */}
      {pace && (
        <div className="p-3.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-amber-900 dark:text-amber-200 font-semibold">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> Ritmo de Ahorro
            </span>
            <span className="font-mono-tabular text-sm">{fmt(pace.perMonth)}/mes</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-amber-800/80 dark:text-amber-300/80">
            <span>Ritmo semanal: <span className="font-mono-tabular font-medium">{fmt(pace.perWeek)}</span></span>
            <span>Días restantes: <span className="font-mono-tabular font-medium">{pace.days}d</span></span>
          </div>
        </div>
      )}

      {/* Aportación Ágil sin Modales Invasivos */}
      <form onSubmit={handleContributeSubmit} className="space-y-3 pt-1">
        <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
          <Sparkles className="size-3.5 text-primary" />
          Aportación Rápida
        </span>

        {/* Botones de Presets de Monto */}
        <div className="grid grid-cols-4 gap-1.5">
          {[100, 250, 500, 1000].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleQuickAdd(d)}
              className="py-1 px-2 rounded-lg text-xs font-mono-tabular font-semibold border border-[#E4E0D8] dark:border-white/10 bg-muted/30 hover:bg-muted/70 active:scale-95 transition text-foreground"
            >
              +{d}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[11px]">Monto a aportar</Label>
            <Input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-9 font-mono-tabular text-sm font-semibold rounded-lg"
            />
          </div>
          <div>
            <Label className="text-[11px]">Cuenta origen</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-9 text-xs rounded-lg">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <Label className="text-[11px]">Fecha</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 text-xs rounded-lg"
            />
          </div>
          <div className="flex-1 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-9 rounded-lg gradient-primary text-primary-foreground font-medium text-xs border-0 shadow-glow"
            >
              {isSubmitting ? "Aportando..." : "Aportar ahora"}
            </Button>
          </div>
        </div>
      </form>

      {/* Historial de Aportaciones */}
      <div className="space-y-2 pt-2 border-t border-[#E4E0D8] dark:border-white/10">
        <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center justify-between">
          <span>Aportaciones registradas</span>
          <span className="font-mono-tabular text-[10px]">
            {(goal.contributions ?? []).length} aportes
          </span>
        </span>

        {(!goal.contributions || goal.contributions.length === 0) ? (
          <p className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-xl">
            Sin aportaciones registradas aún
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {goal.contributions.slice().reverse().map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-[#E4E0D8]/40 dark:border-white/5"
              >
                <div>
                  <p className="text-xs font-bold font-mono-tabular text-foreground">
                    +{fmt(c.amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{fmtDate(c.date)}</p>
                </div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  Aporte
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Eliminar Meta */}
      <div className="pt-2 border-t border-[#E4E0D8] dark:border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="w-full h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg justify-center"
        >
          <Trash2 className="size-3.5 mr-1.5" />
          <span>Eliminar meta de ahorro</span>
        </Button>
      </div>
    </div>
  );
}
