import React, { useState, useMemo, useCallback, memo } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { ChangeAction, ChangeEntity, ChangeLogEntry } from "@/lib/finance";
import { Header } from "@/components/app/Header";
import { Button } from "@/components/ui/button";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";
import {
  Trash2,
  History,
  Search,
  PlusCircle,
  Pencil,
  Trash,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Filter,
  Receipt,
  CalendarClock,
  Target,
  HandCoins,
} from "lucide-react";
import { toast } from "sonner";

const ENTITY_CONFIG: Record<
  ChangeEntity,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  transaction: { label: "Movimiento", icon: Receipt },
  fixed: { label: "Fijo", icon: CalendarClock },
  goal: { label: "Meta", icon: Target },
  debt: { label: "Deuda", icon: HandCoins },
};

const ACTION_CONFIG: Record<
  ChangeAction,
  { label: string; tone: string; bgTone: string; icon: React.ComponentType<{ className?: string }> }
> = {
  create: {
    label: "Creado",
    tone: "text-[#1F7A5A]",
    bgTone: "bg-[#1F7A5A]/10 text-[#1F7A5A]",
    icon: PlusCircle,
  },
  update: {
    label: "Editado",
    tone: "text-[#2383E2]",
    bgTone: "bg-[#2383E2]/10 text-[#2383E2]",
    icon: Pencil,
  },
  delete: {
    label: "Eliminado",
    tone: "text-[#C86446]",
    bgTone: "bg-[#C86446]/10 text-[#C86446]",
    icon: Trash,
  },
};

function fmtVal(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v).slice(0, 40);
    } catch {
      return "[Objeto]";
    }
  }
  if (typeof v === "string" && v.length > 40) return v.slice(0, 40) + "…";
  return String(v);
}

function getDayHeader(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isToday) return "Hoy";
    if (isYesterday) return "Ayer";

    return d.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return dateStr;
  }
}

const PAGE_SIZE = 40;

export const HistorialV2 = memo(function HistorialV2() {
  const { changeLog, clearChangeLog } = useFinanceData();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});

  const handleClear = useCallback(() => {
    clearChangeLog();
    toast.success("Historial de cambios borrado");
  }, [clearChangeLog]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedEntries((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Filtered changelog with extreme performance memoization
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return changeLog.filter((entry) => {
      if (selectedEntity !== "all" && entry.entity !== selectedEntity) return false;
      if (selectedAction !== "all" && entry.action !== selectedAction) return false;
      if (!q) return true;

      if (entry.label.toLowerCase().includes(q)) return true;
      if (ENTITY_CONFIG[entry.entity]?.label.toLowerCase().includes(q)) return true;
      if (ACTION_CONFIG[entry.action]?.label.toLowerCase().includes(q)) return true;

      if (entry.changes && entry.changes.length > 0) {
        return entry.changes.some(
          (c) =>
            c.field.toLowerCase().includes(q) ||
            String(c.from ?? "").toLowerCase().includes(q) ||
            String(c.to ?? "").toLowerCase().includes(q)
        );
      }
      return false;
    });
  }, [changeLog, selectedEntity, selectedAction, search]);

  const pagedEntries = useMemo(() => {
    return filteredEntries.slice(0, visibleCount);
  }, [filteredEntries, visibleCount]);

  // Group by day for clean timeline reading
  const groupedByDay = useMemo(() => {
    const groups: { day: string; entries: ChangeLogEntry[] }[] = [];
    let currentDay = "";
    let currentList: ChangeLogEntry[] = [];

    for (const entry of pagedEntries) {
      const day = getDayHeader(entry.at);
      if (day !== currentDay) {
        if (currentList.length > 0) {
          groups.push({ day: currentDay, entries: currentList });
        }
        currentDay = day;
        currentList = [entry];
      } else {
        currentList.push(entry);
      }
    }
    if (currentList.length > 0) {
      groups.push({ day: currentDay, entries: currentList });
    }
    return groups;
  }, [pagedEntries]);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  return (
    <div className="min-h-screen pb-32 bg-[#FAF8F5] dark:bg-[#0C0C0B] text-[#191918] dark:text-[#EDEDED]">
      {/* Header */}
      <Header
        title="Historial"
        subtitle="Registro de cambios, adiciones y auditoría de datos"
        action={
          changeLog.length > 0 ? (
            <Button
              onClick={() => setConfirmOpen(true)}
              variant="ghost"
              className="min-h-[44px] px-3.5 rounded-xl border border-[#E4E0D8] dark:border-white/10 text-xs font-semibold text-[#C86446] hover:bg-[#C86446]/10 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C86446]"
              aria-label="Limpiar historial"
            >
              <Trash2 className="size-3.5 mr-1.5" strokeWidth={1.5} />
              Limpiar
            </Button>
          ) : undefined
        }
      />

      <ElegantConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Borrar historial de auditoría?"
        description="Se eliminarán todas las entradas registradas de cambios. Esta acción no afecta tus saldos ni tus registros financieros."
        onConfirm={handleClear}
        icon={Trash2}
        iconColor="bg-destructive"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-5">
        {/* Search & Reactive Filters Bar */}
        <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] p-4 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#6E6A63] dark:text-[#8E8D8A]" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Buscar por concepto, campo o valor modificado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 min-h-[44px] rounded-xl bg-[#FAF8F5] dark:bg-white/[0.03] border border-[#E4E0D8] dark:border-white/10 text-xs text-foreground placeholder:text-[#6E6A63] dark:placeholder:text-[#8E8D8A] focus:outline-none focus:border-[#2383E2] focus-visible:ring-2 focus-visible:ring-[#2383E2]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-8 rounded-lg text-xs text-[#6E6A63] dark:text-[#8E8D8A] hover:text-foreground flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E4E0D8]/60 dark:border-white/5 text-xs font-mono-tabular">
            <span className="text-[11px] uppercase tracking-wider text-[#6E6A63] dark:text-[#8E8D8A] mr-1">
              Entidad:
            </span>
            {[
              { id: "all", label: "Todas" },
              { id: "transaction", label: "Movimientos" },
              { id: "fixed", label: "Fijos" },
              { id: "goal", label: "Metas" },
              { id: "debt", label: "Deudas" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={selectedEntity === f.id}
                onClick={() => setSelectedEntity(f.id)}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2] flex items-center justify-center ${
                  selectedEntity === f.id
                    ? "bg-[#191918] dark:bg-white text-white dark:text-[#0C0C0B] font-semibold"
                    : "bg-[#FAF8F5] dark:bg-white/[0.03] border border-[#E4E0D8] dark:border-white/10 text-[#6E6A63] dark:text-[#8E8D8A] hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}

            <div className="h-4 w-px bg-[#E4E0D8] dark:bg-white/10 mx-1 hidden sm:block" />

            <span className="text-[11px] uppercase tracking-wider text-[#6E6A63] dark:text-[#8E8D8A] mr-1">
              Acción:
            </span>
            {[
              { id: "all", label: "Todas" },
              { id: "create", label: "Creados" },
              { id: "update", label: "Editados" },
              { id: "delete", label: "Eliminados" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={selectedAction === f.id}
                onClick={() => setSelectedAction(f.id)}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2] flex items-center justify-center ${
                  selectedAction === f.id
                    ? "bg-[#191918] dark:bg-white text-white dark:text-[#0C0C0B] font-semibold"
                    : "bg-[#FAF8F5] dark:bg-white/[0.03] border border-[#E4E0D8] dark:border-white/10 text-[#6E6A63] dark:text-[#8E8D8A] hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Change Log Content */}
        {changeLog.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E4E0D8] dark:border-white/10 p-12 text-center space-y-2">
            <History className="size-10 mx-auto text-[#6E6A63] dark:text-[#8E8D8A]" strokeWidth={1.25} />
            <p className="font-display-v2 text-base font-normal">Aún no hay cambios registrados</p>
            <p className="text-xs text-[#6E6A63] dark:text-[#8E8D8A]">
              Los cambios que realices en movimientos, metas, fijos o deudas se registrarán aquí con detalle cronológico.
            </p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E4E0D8] dark:border-white/10 p-8 text-center space-y-1">
            <p className="text-sm font-semibold text-foreground">Sin resultados para esta búsqueda</p>
            <p className="text-xs text-[#6E6A63] dark:text-[#8E8D8A]">
              Prueba cambiando los filtros de entidad o limpiando el texto del buscador.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByDay.map(({ day, entries }) => (
              <div key={day} className="space-y-2">
                {/* Day Header */}
                <div className="flex items-center gap-3 px-1">
                  <span className="text-[11px] font-mono-tabular uppercase tracking-wider font-bold text-[#6E6A63] dark:text-[#8E8D8A]">
                    {day}
                  </span>
                  <div className="flex-1 h-px bg-[#E4E0D8] dark:bg-white/10" />
                </div>

                {/* Day Entries List: De-boxed Hairline Separation */}
                <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] divide-y divide-[#E4E0D8]/60 dark:divide-white/5 overflow-hidden">
                  {entries.map((entry) => {
                    const actionConfig = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.update;
                    const entityConfig = ENTITY_CONFIG[entry.entity] ?? {
                      label: entry.entity,
                      icon: Layers,
                    };
                    const ActionIcon = actionConfig.icon;
                    const EntityIcon = entityConfig.icon;
                    const isExpanded = !!expandedEntries[entry.id];
                    const changesCount = entry.changes?.length ?? 0;

                    return (
                      <div key={entry.id} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${actionConfig.bgTone}`}
                            >
                              <ActionIcon className="size-4" strokeWidth={1.75} />
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {entry.label}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-[#6E6A63] dark:text-[#8E8D8A] font-mono-tabular">
                                <span className={`font-bold ${actionConfig.tone}`}>
                                  {actionConfig.label}
                                </span>
                                <span>·</span>
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <EntityIcon className="size-3" strokeWidth={1.5} />
                                  {entityConfig.label}
                                </span>
                                <span>·</span>
                                <span>
                                  {new Date(entry.at).toLocaleTimeString("es-MX", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Diff Box if changes exist */}
                        {changesCount > 0 && (
                          <div className="mt-2 pl-11 space-y-1">
                            {(isExpanded ? entry.changes! : entry.changes!.slice(0, 2)).map(
                              (c, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs font-mono-tabular bg-[#FAF8F5] dark:bg-white/[0.02] border border-[#E4E0D8]/60 dark:border-white/5 rounded-lg p-2 flex items-center gap-2 flex-wrap"
                                >
                                  <span className="font-sans font-semibold text-foreground/80 min-w-[70px]">
                                    {c.field}:
                                  </span>
                                  <span className="line-through text-[#6E6A63] dark:text-[#8E8D8A] opacity-70">
                                    {fmtVal(c.from)}
                                  </span>
                                  <ArrowRight className="size-3 text-[#6E6A63] dark:text-[#8E8D8A]" strokeWidth={1.5} />
                                  <span className="font-semibold text-foreground">
                                    {fmtVal(c.to)}
                                  </span>
                                </div>
                              )
                            )}

                            {changesCount > 2 && (
                              <button
                                type="button"
                                aria-expanded={isExpanded}
                                onClick={() => toggleExpand(entry.id)}
                                className="text-[11px] font-semibold text-[#2383E2] flex items-center gap-1 py-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2] rounded"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="size-3" />
                                    Mostrar menos
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="size-3" />
                                    Ver todos los {changesCount} cambios
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Incremental Pagination Button */}
            {visibleCount < filteredEntries.length && (
              <div className="pt-2 text-center">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  className="rounded-xl border-[#E4E0D8] dark:border-white/10 text-xs font-mono-tabular px-6 py-2.5 min-h-[44px] h-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]"
                >
                  Cargar más registros ({visibleCount} de {filteredEntries.length})
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default HistorialV2;
