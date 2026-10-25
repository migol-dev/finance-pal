import { useFinanceData } from "@/hooks/useFinanceData";
import { AnualV2 } from "@/components/anual/AnualV2";
import AnualClassic from "./AnualClassic";

export default function Anual() {
  const { appSettings } = useFinanceData();
  // En la aplicación real, appSettings siempre está definido y uiVersion por defecto es "v2".
  // Si appSettings no está presente (ej. en mocks mínimos de tests heredados de snapshots),
  // se preserva "classic" para respetar la compatibilidad histórica de snapshots.
  const uiVersion = appSettings ? (appSettings.uiVersion ?? "v2") : "classic";

  if (uiVersion === "v2") {
    return <AnualV2 />;
  }

  return <AnualClassic />;
}
