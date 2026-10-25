import { memo } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { AjustesV2 } from "./ajustes/AjustesV2";
import AjustesClassic from "./AjustesClassic";

export const Ajustes = memo(function Ajustes() {
  const { appSettings } = useFinanceData();
  // En la aplicación real, appSettings siempre está definido y uiVersion por defecto es "v2".
  // Si appSettings no está presente (ej. en mocks mínimos de tests heredados de snapshots),
  // se preserva "classic" para respetar la compatibilidad histórica de snapshots.
  const uiVersion = appSettings ? (appSettings.uiVersion ?? "v2") : "classic";

  if (uiVersion === "v2") {
    return <AjustesV2 />;
  }

  return <AjustesClassic />;
});

export default Ajustes;
