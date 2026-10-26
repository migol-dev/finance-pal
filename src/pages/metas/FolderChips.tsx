import { useState } from "react";
import { FolderOpen, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { FolderNode } from "./types";
import { FolderTree } from "./FolderTree";
import { Goal, GoalFolder } from "@/lib/finance";

interface FolderChipsProps {
  folderTree: FolderNode[];
  goals: Goal[];
  goalFolders: GoalFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onEditFolder: (folder: GoalFolder) => void;
  onDeleteFolder: (id: string) => void;
  onAddChildFolder: (parentId: string) => void;
  getFolderGoalCount: (folderId: string) => number;
}

export function FolderChips({
  folderTree,
  goals,
  goalFolders,
  selectedFolderId,
  onSelectFolder,
  onEditFolder,
  onDeleteFolder,
  onAddChildFolder,
  getFolderGoalCount,
}: FolderChipsProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const uncategorizedCount = goals.filter((g) => !g.folderId).length;
  const isSpecificFolderSelected =
    selectedFolderId !== null && selectedFolderId !== "uncategorized";
  const activeFolderName = isSpecificFolderSelected
    ? goalFolders.find((f) => f.id === selectedFolderId)?.name
    : null;

  const handleSelectInsideDrawer = (id: string | null) => {
    onSelectFolder(id);
    setDrawerOpen(false);
  };

  return (
    <div className="lg:hidden mb-4">
      <div className="grid grid-cols-3 gap-2">
        {/* Chip: Todas */}
        <button
          type="button"
          onClick={() => onSelectFolder(null)}
          className={cn(
            "min-h-[40px] px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-[0.98]",
            selectedFolderId === null
              ? "gradient-primary text-primary-foreground shadow-glow"
              : "bg-card border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <span>Todas</span>
          <span className="text-[10px] opacity-80 tabular-nums">({goals.length})</span>
        </button>

        {/* Chip: Sin carpeta */}
        <button
          type="button"
          onClick={() => onSelectFolder("uncategorized")}
          className={cn(
            "min-h-[40px] px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 active:scale-[0.98]",
            selectedFolderId === "uncategorized"
              ? "gradient-primary text-primary-foreground shadow-glow"
              : "bg-card border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="truncate">Sin carpeta</span>
          <span className="text-[10px] opacity-80 tabular-nums shrink-0">({uncategorizedCount})</span>
        </button>

        {/* Drawer Trigger Button: Carpetas */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label="Ver todas las carpetas en panel"
              className={cn(
                "min-h-[40px] px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-[0.98]",
                isSpecificFolderSelected
                  ? "gradient-primary text-primary-foreground shadow-glow"
                  : "bg-muted/80 text-foreground hover:bg-muted border border-border/80"
              )}
            >
              <Layers className="size-3.5 shrink-0" />
              <span className="truncate">
                {activeFolderName ? activeFolderName : "Carpetas"}
              </span>
            </button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[90dvh] px-4 pb-8">
            <DrawerHeader className="px-1 text-left pb-2">
              <DrawerTitle className="text-base font-extrabold flex items-center gap-2">
                <FolderOpen className="size-5 text-primary" />
                <span>Explorador de carpetas</span>
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                Selecciona una carpeta o gestiona tus subcarpetas
              </DrawerDescription>
            </DrawerHeader>

            <div className="pt-2 pb-6 px-1">
              <FolderTree
                folderTree={folderTree}
                goals={goals}
                goalFolders={goalFolders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={handleSelectInsideDrawer}
                onEditFolder={(f) => {
                  setDrawerOpen(false);
                  onEditFolder(f);
                }}
                onDeleteFolder={(id) => {
                  setDrawerOpen(false);
                  onDeleteFolder(id);
                }}
                onAddChildFolder={(parentId) => {
                  setDrawerOpen(false);
                  onAddChildFolder(parentId);
                }}
                getFolderGoalCount={getFolderGoalCount}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
