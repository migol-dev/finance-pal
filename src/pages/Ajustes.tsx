import { memo } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "@/lib/framer";
import { AjustesSectionId } from "./ajustes/types";
import { AjustesHub } from "./ajustes/AjustesHub";
import { PerfilSection } from "./ajustes/secciones/PerfilSection";
import { CuentasSection } from "./ajustes/secciones/CuentasSection";
import { FijosSection } from "./ajustes/secciones/FijosSection";
import { AparienciaSection } from "./ajustes/secciones/AparienciaSection";
import { AccesibilidadSection } from "./ajustes/secciones/AccesibilidadSection";
import { NotificacionesSection } from "./ajustes/secciones/NotificacionesSection";
import { DatosSection } from "./ajustes/secciones/DatosSection";
import { SeguridadSection } from "./ajustes/secciones/SeguridadSection";

const sectionVariants = {
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -12, filter: "blur(4px)" },
};

export const Ajustes = memo(function Ajustes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const seccion = (searchParams.get("seccion") as AjustesSectionId) || null;

  const handleSelectSection = (id: AjustesSectionId) => {
    setSearchParams({ seccion: id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderSection = (id: AjustesSectionId) => {
    switch (id) {
      case "perfil":
        return <PerfilSection onBack={handleBack} />;
      case "cuentas":
        return <CuentasSection onBack={handleBack} />;
      case "fijos":
        return <FijosSection onBack={handleBack} />;
      case "apariencia":
        return <AparienciaSection onBack={handleBack} />;
      case "accesibilidad":
        return <AccesibilidadSection onBack={handleBack} />;
      case "notificaciones":
        return <NotificacionesSection onBack={handleBack} />;
      case "datos":
        return <DatosSection onBack={handleBack} />;
      case "seguridad":
        return <SeguridadSection onBack={handleBack} />;
      default:
        return <AjustesHub onSelectSection={handleSelectSection} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-12 min-h-screen">
      <AnimatePresence mode="wait" initial={false}>
        {!seccion ? (
          <motion.div
            key="hub"
            variants={sectionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          >
            <AjustesHub onSelectSection={handleSelectSection} />
          </motion.div>
        ) : (
          <motion.div
            key={seccion}
            variants={sectionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          >
            {renderSection(seccion)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default Ajustes;
