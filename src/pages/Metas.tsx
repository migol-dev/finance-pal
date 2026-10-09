import { useMemo, useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { Header } from "@/components/app/Header";
import { Plus, FolderPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "@/lib/framer";
import { toast } from "sonner";
import { IconDisplay } from "@/components/app/IconDisplay";
import { Goal, GoalFolder } from "@/lib/finance";

import { FolderNode, PALETTES } from "./metas/types";
import { FolderTree } from "./metas/FolderTree";
import { FolderChips } from "./metas/FolderChips";
import { GoalCompactCard } from "./metas/GoalCompactCard";
import { GoalDetailContent } from "./metas/GoalDetailContent";
import { GoalForm } from "./metas/GoalForm";
import { FolderForm } from "./metas/FolderForm";

export default function Metas() {
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

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<GoalFolder | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // null = all, "uncategorized" = no folder

  const detailGoal = useMemo(() => goals.find((g) => g.id === detailId) || null, [goals, detailId]);

  // Build folder tree
  const folderTree = useMemo(() => {
    const folderMap = new Map<string, FolderNode>();
    goalFolders.forEach((f) => folderMap.set(f.id, { ...f, children: [] }));

    const roots: FolderNode[] = [];
    goalFolders.forEach((f) => {
      const folder = folderMap.get(f.id)!;
      if (f.parentId) {
        const parent = folderMap.get(f.parentId);
        if (parent) parent.children.push(folder);
      } else {
        roots.push(folder);
      }
    });

    const sortFolders = (folders: FolderNode[]) => {
      folders.sort((a, b) => a.order - b.order).forEach((f) => sortFolders(f.children));
    };
    sortFolders(roots);

    return roots;
  }, [goalFolders]);

  // Count goals in folder (including subfolders)
  const getFolderGoalCount = (folderId: string): number => {
    let count = goals.filter((g) => g.folderId === folderId).length;
    const getChildren = (id: string) => goalFolders.filter((f) => f.parentId === id);
    const children = getChildren(folderId);
    children.forEach((c) => {
      count += getFolderGoalCount(c.id);
    });
    return count;
  };

  // Get goals for selected folder
  const filteredGoals = useMemo(() => {
    if (selectedFolderId === null) return goals;
    if (selectedFolderId === "uncategorized") return goals.filter((g) => !g.folderId);
    return goals.filter((g) => g.folderId === selectedFolderId);
  }, [goals, selectedFolderId]);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const openNewFolder = (parentId?: string) => {
    setEditingFolder({
      id: "",
      name: "",
      color: PALETTES[0],
      order: goalFolders.length,
      createdAt: new Date().toISOString(),
      parentId: parentId ?? undefined,
    } as GoalFolder);
    setFolderOpen(true);
  };

  const openEditFolder = (folder: GoalFolder) => {
    setEditingFolder(folder);
    setFolderOpen(true);
  };

  return (
    <div className="pb-28">
      <Header
        title="Metas"
        subtitle="Sueños con plan"
        action={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              onClick={() => openNewFolder()}
              variant="ghost"
              className="h-10 rounded-xl px-2.5 sm:px-3 text-xs sm:text-sm"
            >
              <FolderPlus className="size-4 mr-1 sm:mr-1.5" />
              <span className="hidden xs:inline">Carpeta</span>
            </Button>
            <Button
              onClick={openNew}
              className="rounded-xl gradient-primary text-primary-foreground border-0 shadow-glow h-10 text-xs sm:text-sm px-3 sm:px-4"
            >
              <Plus className="size-4 mr-1 sm:mr-1.5" />
              <span>Nueva</span>
            </Button>
          </div>
        }
      />

      {/* Goal Form Modal */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent bottomSheet={true} className="rounded-2xl max-h-[90dvh] overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle className="text-lg">{editing ? "Editar meta" : "Nueva meta"}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="sr-only">Formulario para crear o editar una meta</DialogDescription>
          <GoalForm
            initial={editing}
            folders={goalFolders}
            defaultFolderId={selectedFolderId === "uncategorized" || !selectedFolderId ? undefined : selectedFolderId}
            onSave={async (g) => {
              try {
                if (editing) {
                  await updateGoal(editing.id, g);
                  toast.success("Actualizado");
                } else {
                  await addGoal(g);
                  toast.success("Meta creada ✨");
                }
                setOpen(false);
                setEditing(null);
              } catch (e: any) {
                toast.error(e.message || "Ocurrió un error");
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Folder Form Modal */}
      <Dialog open={folderOpen} onOpenChange={(v) => { setFolderOpen(v); if (!v) setEditingFolder(null); }}>
        <DialogContent bottomSheet={true} className="rounded-2xl max-h-[90dvh] overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingFolder?.id ? "Editar carpeta" : "Nueva carpeta"}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="sr-only">Formulario para crear o editar una carpeta</DialogDescription>
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
                setFolderOpen(false);
                setEditingFolder(null);
              } catch (e: any) {
                toast.error(e.message || "Ocurrió un error");
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Mobile Folder Chips (<lg) */}
      <div className="px-5 lg:hidden">
        <FolderChips
          folderTree={folderTree}
          goals={goals}
          goalFolders={goalFolders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onEditFolder={openEditFolder}
          onDeleteFolder={removeGoalFolder}
          onAddChildFolder={openNewFolder}
          getFolderGoalCount={getFolderGoalCount}
        />
      </div>

      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-5 px-5 lg:px-6">
        {/* Desktop Folder Sidebar (>=lg) */}
        <aside className="hidden lg:block lg:sticky lg:top-20 lg:h-[calc(100dvh-8rem)] lg:overflow-y-auto space-y-2 p-3 bg-card/60 backdrop-blur-sm rounded-2xl border border-border shadow-soft">
          <FolderTree
            folderTree={folderTree}
            goals={goals}
            goalFolders={goalFolders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onEditFolder={openEditFolder}
            onDeleteFolder={removeGoalFolder}
            onAddChildFolder={openNewFolder}
            getFolderGoalCount={getFolderGoalCount}
          />
        </aside>

        {/* Goals Area */}
        <div className="space-y-4 min-w-0">
          {/* Subfolders Grid if any inside selected folder */}
          {selectedFolderId !== "uncategorized" &&
            goalFolders.filter((f) => f.parentId === (selectedFolderId ?? undefined)).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-4">
                {goalFolders
                  .filter((f) => f.parentId === (selectedFolderId ?? undefined))
                  .sort((a, b) => a.order - b.order)
                  .map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFolderId(f.id)}
                      className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-card border border-border flex flex-col items-start gap-2.5 shadow-soft text-left hover:border-primary/40 hover:bg-muted/20 active:scale-95 transition min-w-0"
                    >
                      <IconDisplay icon={f.icon ?? { kind: "emoji", value: "📁" }} size="md" className="bg-muted shrink-0" />
                      <div className="w-full min-w-0">
                        <p className="font-bold text-sm truncate w-full">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{getFolderGoalCount(f.id)} metas</p>
                      </div>
                    </button>
                  ))}
              </div>
            )}

          {/* Empty state */}
          {filteredGoals.length === 0 &&
            goalFolders.filter((f) => f.parentId === (selectedFolderId ?? undefined)).length === 0 && (
              <div className="rounded-3xl bg-card border border-dashed border-border p-8 text-center shadow-soft flex flex-col items-center">
                <p className="text-5xl mb-4" aria-hidden="true">🎯</p>
                <p className="text-base font-bold mb-2">
                  {selectedFolderId === "uncategorized"
                    ? "No hay metas sin carpeta"
                    : selectedFolderId === null
                    ? "No tienes metas de ahorro"
                    : "Esta carpeta está vacía"}
                </p>
                <p className="text-xs text-muted-foreground mb-5 max-w-[280px]">
                  {selectedFolderId === "uncategorized"
                    ? "Todas tus metas están organizadas en carpetas."
                    : selectedFolderId === null
                    ? "Crea tu primera meta y empieza a ahorrar para cumplir tus sueños."
                    : "Crea una nueva meta o arrastra una existente aquí."}
                </p>
                <Button
                  type="button"
                  onClick={openNew}
                  className="h-10 px-5 rounded-xl gradient-primary text-primary-foreground font-bold border-0 shadow-glow"
                >
                  Crear nueva meta
                </Button>
              </div>
            )}

          {/* Goal Cards */}
          <AnimatePresence>
            {filteredGoals.map((g, i) => (
              <GoalCompactCard
                key={g.id}
                goal={g}
                index={i}
                onViewMore={() => setDetailId(g.id)}
                onContribute={(amt, date, acc) => contributeGoal(g.id, amt, date, acc)}
                accounts={accounts}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Goal Detail Dialog with hideCloseButton=true to avoid double X */}
      <Dialog open={!!detailId} onOpenChange={(v) => { if (!v) setDetailId(null); }}>
        <DialogContent
          hideCloseButton={true}
          bottomSheet={true}
          className="max-w-lg p-0 border-0 bg-transparent shadow-none overflow-hidden max-h-[92dvh] sm:rounded-3xl"
        >
          <DialogTitle className="sr-only">Detalle de {detailGoal?.name ?? "meta"}</DialogTitle>
          <DialogDescription className="sr-only">Detalle de la meta {detailGoal?.name}</DialogDescription>
          {detailGoal && (
            <GoalDetailContent
              goal={detailGoal}
              onClose={() => setDetailId(null)}
              onEdit={() => {
                setEditing(detailGoal);
                setOpen(true);
                setDetailId(null);
              }}
              onDelete={() => {
                removeGoal(detailGoal.id);
                setDetailId(null);
              }}
              onContribute={(amt, date, acc) => contributeGoal(detailGoal.id, amt, date, acc)}
              onTogglePin={() => updateGoal(detailGoal.id, { pinned: !detailGoal.pinned })}
              accounts={accounts}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
