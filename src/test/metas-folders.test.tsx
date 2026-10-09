import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FolderTreeItem } from "@/pages/metas/FolderTreeItem";
import { FolderChips } from "@/pages/metas/FolderChips";
import { FolderNode } from "@/pages/metas/types";
import { GoalFolder } from "@/lib/finance";

describe("FolderTreeItem Component", () => {
  const dummyFolder: FolderNode = {
    id: "f-1",
    name: "Ahorro para Vehículo Nuevo con Nombre Extraordinariamente Largo para Probar Desbordamiento",
    color: "gradient-primary",
    order: 0,
    createdAt: new Date().toISOString(),
    children: [],
  };

  it("renders folder name and contextual menu trigger '...' without crashing", () => {
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onAddChild = vi.fn();

    render(
      <FolderTreeItem
        folder={dummyFolder}
        level={0}
        selectedFolderId={null}
        onSelect={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
        onAddChild={onAddChild}
        goalCount={3}
        goalFolders={[dummyFolder]}
        getFolderGoalCount={() => 3}
      />
    );

    // Folder name is visible
    expect(screen.getByText(/Ahorro para Vehículo Nuevo/i)).toBeInTheDocument();

    // Goal count is visible
    expect(screen.getByText("3")).toBeInTheDocument();

    // Trigger button '...' with aria-label exists
    const menuTrigger = screen.getByRole("button", {
      name: /Acciones para la carpeta Ahorro para Vehículo/i,
    });
    expect(menuTrigger).toBeInTheDocument();

    // Click folder row selects the folder
    const selectBtn = screen.getByRole("button", {
      name: `Seleccionar carpeta ${dummyFolder.name}`,
    });
    fireEvent.click(selectBtn);
    expect(onSelect).toHaveBeenCalledWith("f-1");
  });

  it("applies active border style when folder is selected", () => {
    const { container } = render(
      <FolderTreeItem
        folder={dummyFolder}
        level={0}
        selectedFolderId="f-1"
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAddChild={vi.fn()}
        goalCount={1}
        goalFolders={[dummyFolder]}
        getFolderGoalCount={() => 1}
      />
    );

    // Active item has border-l-4 and bg-primary/10
    const activeItem = container.querySelector(".border-l-4");
    expect(activeItem).toBeInTheDocument();
    expect(activeItem?.className).toContain("bg-primary/10");
  });

  it("preserves active border-l-4 accent bar on nested child folders (level > 0)", () => {
    const childFolder: FolderNode = {
      ...dummyFolder,
      id: "f-child",
      parentId: "f-1",
    };

    const { container } = render(
      <FolderTreeItem
        folder={childFolder}
        level={1}
        selectedFolderId="f-child"
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAddChild={vi.fn()}
        goalCount={2}
        goalFolders={[dummyFolder, childFolder]}
        getFolderGoalCount={() => 2}
      />
    );

    // Active nested child MUST have border-l-4 and bg-primary/10 (not overridden by border-border/40)
    const activeItem = container.querySelector(".border-l-4");
    expect(activeItem).toBeInTheDocument();
    expect(activeItem?.className).toContain("border-primary");
    expect(activeItem?.className).toContain("bg-primary/10");
  });
});

describe("FolderChips Component", () => {
  const rootFolder: FolderNode = {
    id: "f-root",
    name: "General",
    color: "gradient-primary",
    order: 0,
    createdAt: new Date().toISOString(),
    children: [],
  };

  const childFolder: GoalFolder = {
    id: "f-child",
    name: "Subcarpeta Especial",
    color: "gradient-ocean",
    order: 1,
    parentId: "f-root",
    createdAt: new Date().toISOString(),
  };

  it("renders active subfolder chip when selectedFolderId is a nested child folder", () => {
    render(
      <FolderChips
        folderTree={[rootFolder]}
        goals={[]}
        goalFolders={[rootFolder, childFolder]}
        selectedFolderId="f-child"
        onSelectFolder={vi.fn()}
        onEditFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onAddChildFolder={vi.fn()}
        getFolderGoalCount={(id) => (id === "f-child" ? 7 : 3)}
      />
    );

    expect(screen.getByText("Subcarpeta Especial")).toBeInTheDocument();
    expect(screen.getByText("(7)")).toBeInTheDocument();
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });
});
