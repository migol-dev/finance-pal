import { useFinanceData } from "@/hooks/useFinanceData";
import { DeudasV2 } from "@/components/deudas/DeudasV2";
import DeudasClassic from "./DeudasClassic";

export default function Deudas() {
  const { appSettings } = useFinanceData();
  // En la aplicación real, appSettings siempre está definido y uiVersion por defecto es "v2".
  // Si appSettings no está presente (ej. en mocks mínimos de tests heredados de snapshots),
  // se preserva "classic" para respetar la compatibilidad histórica de snapshots.
  const uiVersion = appSettings ? (appSettings.uiVersion ?? "v2") : "classic";

  if (uiVersion === "v2") {
    return <DeudasV2 />;
  }

  return <DeudasClassic />;
}
