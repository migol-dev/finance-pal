import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FolderTreeItem } from "@/pages/metas/FolderTreeItem";
import { FolderNode } from "@/pages/metas/types";

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
});
