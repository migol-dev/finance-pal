import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderNode } from "./types";
import { FolderTreeItem } from "./FolderTreeItem";
import { GoalFolder, Goal } from "@/lib/finance";

interface FolderTreeProps {
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

export function FolderTree({
  folderTree,
  goals,
  goalFolders,
  selectedFolderId,
  onSelectFolder,
  onEditFolder,
  onDeleteFolder,
  onAddChildFolder,
  getFolderGoalCount,
}: FolderTreeProps) {
  const uncategorizedCount = goals.filter((g) => !g.folderId).length;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onSelectFolder(null)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition text-left focus:outline-none",
          selectedFolderId === null
            ? "border-l-4 border-primary bg-primary/10 text-primary font-bold shadow-soft"
            : "hover:bg-muted/60 text-foreground"
        )}
      >
        <FolderOpen className="size-5 shrink-0" />
        <span className="flex-1 truncate">Todas las metas</span>
        <span className="text-xs opacity-70 px-1.5 py-0.5 rounded-full bg-muted/50 tabular-nums">
          {goals.length}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSelectFolder("uncategorized")}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition text-left focus:outline-none",
          selectedFolderId === "uncategorized"
            ? "border-l-4 border-primary bg-primary/10 text-primary font-bold shadow-soft"
            : "hover:bg-muted/60 text-foreground"
        )}
      >
        <FolderOpen className="size-5 opacity-50 shrink-0" />
        <span className="flex-1 truncate">Sin carpeta</span>
        <span className="text-xs opacity-70 px-1.5 py-0.5 rounded-full bg-muted/50 tabular-nums">
          {uncategorizedCount}
        </span>
      </button>

      <div className="border-t border-border/60 my-2" />

      {folderTree.length === 0 ? (
        <p className="px-3 py-3 text-xs text-muted-foreground text-center">Sin carpetas aún</p>
      ) : (
        <div className="space-y-0.5">
          {folderTree.map((folder) => (
            <FolderTreeItem
              key={folder.id}
              folder={folder}
              level={0}
              selectedFolderId={selectedFolderId}
              onSelect={onSelectFolder}
              onEdit={onEditFolder}
              onDelete={onDeleteFolder}
              onAddChild={onAddChildFolder}
              goalCount={getFolderGoalCount(folder.id)}
              goalFolders={goalFolders}
              getFolderGoalCount={getFolderGoalCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
