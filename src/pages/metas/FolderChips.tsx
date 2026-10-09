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
  const selectedSubfolder =
    selectedFolderId && selectedFolderId !== "uncategorized" && !folderTree.some((f) => f.id === selectedFolderId)
      ? goalFolders.find((f) => f.id === selectedFolderId)
      : null;

  const handleSelectInsideDrawer = (id: string | null) => {
    onSelectFolder(id);
    setDrawerOpen(false);
  };

  return (
    <div className="lg:hidden mb-4">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-1">
        {/* Chip: Todas */}
        <button
          type="button"
          onClick={() => onSelectFolder(null)}
          className={cn(
            "shrink-0 h-9 px-3.5 rounded-full text-xs font-bold transition flex items-center gap-1.5",
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
            "shrink-0 h-9 px-3.5 rounded-full text-xs font-bold transition flex items-center gap-1.5",
            selectedFolderId === "uncategorized"
              ? "gradient-primary text-primary-foreground shadow-glow"
              : "bg-card border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <span>Sin carpeta</span>
          <span className="text-[10px] opacity-80 tabular-nums">({uncategorizedCount})</span>
        </button>

        {/* Root folders as chips */}
        {folderTree.map((folder) => {
          const isSelected = selectedFolderId === folder.id;
          const count = getFolderGoalCount(folder.id);
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => onSelectFolder(folder.id)}
              className={cn(
                "shrink-0 h-9 px-3.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 max-w-[160px]",
                isSelected
                  ? "gradient-primary text-primary-foreground shadow-glow"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="truncate">{folder.name}</span>
              <span className="text-[10px] opacity-80 tabular-nums">({count})</span>
            </button>
          );
        })}

        {/* Active subfolder chip if a non-root folder is selected */}
        {selectedSubfolder && (
          <button
            type="button"
            onClick={() => onSelectFolder(selectedSubfolder.id)}
            className="shrink-0 h-9 px-3.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 max-w-[160px] gradient-primary text-primary-foreground shadow-glow"
          >
            <span className="truncate">{selectedSubfolder.name}</span>
            <span className="text-[10px] opacity-80 tabular-nums">
              ({getFolderGoalCount(selectedSubfolder.id)})
            </span>
          </button>
        )}

        {/* Drawer Trigger Button */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label="Ver todas las carpetas en panel"
              className="shrink-0 h-9 px-3 rounded-full text-xs font-bold bg-muted/80 text-foreground hover:bg-muted border border-border/80 flex items-center gap-1.5"
            >
              <Layers className="size-3.5 text-primary" />
              <span>Carpetas</span>
            </button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[85dvh] p-4 pt-2">
            <DrawerHeader className="px-1 text-left pb-2">
              <DrawerTitle className="text-base font-extrabold flex items-center gap-2">
                <FolderOpen className="size-5 text-primary" />
                <span>Explorador de carpetas</span>
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                Selecciona una carpeta o gestiona tus subcarpetas
              </DrawerDescription>
            </DrawerHeader>

            <div className="overflow-y-auto max-h-[60dvh] pt-2 pb-6 px-1">
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
