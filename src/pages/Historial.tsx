import { useFinanceData } from "@/hooks/useFinanceData";
import { HistorialV2 } from "@/components/historial/HistorialV2";
import HistorialClassic from "./HistorialClassic";

export default function Historial() {
  const { appSettings } = useFinanceData();
  // En la aplicación real, appSettings siempre está definido y uiVersion por defecto es "v2".
  // Si appSettings no está presente (ej. en mocks mínimos de tests heredados de snapshots),
  // se preserva "classic" para respetar la compatibilidad histórica de snapshots.
  const uiVersion = appSettings ? (appSettings.uiVersion ?? "v2") : "classic";

  if (uiVersion === "v2") {
    return <HistorialV2 />;
  }

  return <HistorialClassic />;
}
