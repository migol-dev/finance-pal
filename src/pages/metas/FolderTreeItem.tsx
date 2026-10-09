import { useState } from "react";
import { ChevronRight, MoreHorizontal, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { IconDisplay } from "@/components/app/IconDisplay";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { FolderNode } from "./types";
import { GoalFolder } from "@/lib/finance";

interface FolderTreeItemProps {
  folder: FolderNode;
  level: number;
  selectedFolderId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (folder: GoalFolder) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  goalCount: number;
  goalFolders: GoalFolder[];
  getFolderGoalCount: (id: string) => number;
}

export function FolderTreeItem({
  folder,
  level,
  selectedFolderId,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  goalCount,
  goalFolders,
  getFolderGoalCount,
}: FolderTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const hasChildren = folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;
  const indentPx = 8 + Math.min(level, 3) * 12;

  return (
    <div className="group">
      <div
        className={cn(
          "w-full flex items-center gap-2 pr-1.5 py-1.5 rounded-xl transition text-left relative",
          isSelected
            ? "border-l-4 border-primary bg-primary/10 text-primary font-bold shadow-soft"
            : "hover:bg-muted/60 text-foreground",
          level > 0 && "border-l border-border/40"
        )}
        style={{ paddingLeft: `${indentPx}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            aria-label={expanded ? `Contraer carpeta ${folder.name}` : `Expandir carpeta ${folder.name}`}
            className="shrink-0 size-6 rounded-md hover:bg-muted/80 flex items-center justify-center transition"
          >
            <ChevronRight
              className={cn("size-3.5 transition-transform duration-150", expanded && "rotate-90")}
            />
          </button>
        ) : (
          <div className="shrink-0 size-6" />
        )}

        <button
          type="button"
          onClick={() => onSelect(folder.id)}
          aria-label={`Seleccionar carpeta ${folder.name}`}
          className="flex-1 min-w-0 flex items-center gap-2 text-left focus:outline-none"
        >
          <IconDisplay
            icon={folder.icon ?? { kind: "emoji", value: "📁" }}
            size="sm"
            className="shrink-0 bg-background/80 shadow-xs"
          />
          <span className="flex-1 min-w-0 font-medium text-sm line-clamp-2 break-words">
            {folder.name}
          </span>
          <span className="text-xs opacity-70 px-1.5 py-0.5 rounded-full bg-muted/50 tabular-nums">
            {goalCount}
          </span>
        </button>

        {/* Context Menu '...' */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Acciones para la carpeta ${folder.name}`}
              className="shrink-0 size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition focus:outline-none"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-lg">
            <DropdownMenuItem
              onClick={() => onAddChild(folder.id)}
              className="flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium py-2"
            >
              <FolderPlus className="size-4 text-primary" />
              <span>Añadir subcarpeta</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEdit(folder)}
              className="flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium py-2"
            >
              <Pencil className="size-4 text-muted-foreground" />
              <span>Editar carpeta</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex items-center gap-2 cursor-pointer rounded-lg text-xs font-medium py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="size-4" />
              <span>Eliminar carpeta</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation modal */}
      <ElegantConfirm
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="¿Eliminar carpeta?"
        description={
          <span className="text-sm text-muted-foreground">
            Se eliminará la carpeta <span className="font-bold text-foreground">"{folder.name}"</span>. Las metas que contenía quedarán sin carpeta.
          </span>
        }
        onConfirm={() => {
          onDelete(folder.id);
          setDeleteConfirmOpen(false);
        }}
        icon={Trash2}
        iconColor="bg-destructive"
      />

      {/* Nested children */}
      {expanded && hasChildren && (
        <div className="mt-0.5 space-y-0.5">
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              goalCount={getFolderGoalCount(child.id)}
              goalFolders={goalFolders}
              getFolderGoalCount={getFolderGoalCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
