import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

describe("DialogContent Close Button Behavior", () => {
  it("renders a single accessible close button by default with Spanish label", () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogTitle>Título del Diálogo</DialogTitle>
          <p>Contenido</p>
        </DialogContent>
      </Dialog>
    );

    const closeButtons = screen.getAllByRole("button", { name: /Cerrar/i });
    expect(closeButtons).toHaveLength(1);
  });

  it("suppresses the built-in close button when hideCloseButton={true}", () => {
    render(
      <Dialog open={true}>
        <DialogContent hideCloseButton={true}>
          <DialogTitle>Diálogo Personalizado</DialogTitle>
          <button type="button" aria-label="Cerrar detalles">
            X Manual
          </button>
        </DialogContent>
      </Dialog>
    );

    // There should be only the custom close button, NOT the default one
    const closeButtons = screen.getAllByRole("button", { name: /Cerrar/i });
    expect(closeButtons).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Cerrar detalles" })).toBeInTheDocument();
  });
});
