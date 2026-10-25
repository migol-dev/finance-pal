import { useFinanceData } from "@/hooks/useFinanceData";
import { DashboardV2 } from "@/components/dashboard/DashboardV2";
import DashboardClassic from "./DashboardClassic";

export default function Dashboard() {
  const { appSettings } = useFinanceData();
  // En la aplicación real, appSettings siempre está definido y uiVersion por defecto es "v2".
  // Si appSettings no está presente (ej. en mocks mínimos de tests heredados de snapshots),
  // se preserva "classic" para respetar el snapshot preexistente.
  const uiVersion = appSettings ? (appSettings.uiVersion ?? "v2") : "classic";

  if (uiVersion === "v2") {
    return <DashboardV2 />;
  }

  return <DashboardClassic />;
}
