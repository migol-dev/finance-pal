# Especificación Técnica y Plan de Tareas: Ajustes Modulares y Accesibilidad Avanzada

> **Estado:** ✅ COMPLETADO Y VERIFICADO (24/24 suites pasadas, Build exitoso)  
> **Objetivo:** 
> 1. Modularizar la página de Ajustes (`Ajustes.tsx`) separándola en un Hub central de categorías y 8 subpáginas/subvistas independientes con navegación de ida y vuelta fluida (soporte de `?seccion=...`).
> 2. Perfeccionar el modo de Alto Contraste para alcanzar estándares WCAG AAA (bordes nítidos de 2px, tarjetas demarcadas, opacidad 100% en textos y botones de alto impacto).
> 3. Implementar ajuste granular del tamaño de texto a elección del usuario (Slider interactivo de 80% a 150%, badges de porcentaje, presets rápidos y preview en tiempo real).
> 4. Potenciar la opción de texto hiperlegible para dislexia (fuente Atkinson Hyperlegible / Lexend, espaciado tipográfico, altura de línea y pesos adaptados).

---

## 1. Estado de Implementación y Checklist

- [x] **Motor de Alto Contraste WCAG AAA (`src/index.css`)**:
  - Bordes reforzados de 2px sólidos en contenedores, tarjetas, modales y botones.
  - Opacidad 100% forzada en `text-muted-foreground` y textos secundarios para ratio de contraste > 7:1.
  - Colores blanco y negro absolutos en tema claro y oscuro respectivamente.
  - Anillo de enfoque de 3px de alto contraste.
- [x] **Ajuste de Tamaño de Texto Granular (`src/components/app/AccessibilitySettings.tsx` & `src/lib/finance.ts`)**:
  - Parámetro `textScalePercent: number` (80 a 150, por defecto 100).
  - Slider interactivo Radix UI con saltos de 5% y badge numérico en tiempo real.
  - Presets rápidos de 1 toque: 85% (Compacto), 100% (Normal), 115% (Grande), 135% (Muy Grande).
  - Vista previa en vivo con métricas financieras reales.
  - Escalado tipográfico proporcional en raíz (`document.documentElement.style.fontSize`) en `AppShell.tsx`.
- [x] **Tipografía Hiperlegible para Dislexia (`src/index.css`)**:
  - Importación de fuentes amigables con dislexia: Atkinson Hyperlegible y Lexend.
  - Pila de fuentes con discriminación de caracteres críticos (I/l/1, O/0, b/d/p/q).
  - Tracking adaptado (`letter-spacing: 0.05em`), espaciado de palabras (`word-spacing: 0.1em`) y altura de línea (`line-height: 1.7`).
- [x] **Modularización de Ajustes (`src/pages/ajustes/` & `src/pages/Ajustes.tsx`)**:
  - `AjustesHub.tsx`: Panel principal responsivo con tarjetas categorizadas e insignias de estado en tiempo real.
  - `AjustesHeader.tsx`: Cabecera unificada con botón accesible "← Ajustes" (con min 44px de toque).
  - `secciones/PerfilSection.tsx`: Nombre, avatar, moneda y sesión.
  - `secciones/CuentasSection.tsx`: Gestión bancaria, efectivo y desgloses.
  - `secciones/FijosSection.tsx`: Conceptos fijos, suscripciones y gastos programados.
  - `secciones/AparienciaSection.tsx`: Selector de tema, colores de acento, modo compacto y efectos de cristal.
  - `secciones/AccesibilidadSection.tsx`: Panel de accesibilidad avanzada, alto contraste y dislexia.
  - `secciones/NotificacionesSection.tsx`: Push web, alertas de presupuesto y avisos de corte.
  - `secciones/DatosSection.tsx`: Sincronización Supabase, exportación/importación ScopePicker y limpiador de recibos.
  - `secciones/SeguridadSection.tsx`: Diagnóstico del sistema, zona de peligro y versión.
  - `Ajustes.tsx`: Controlador centralizado ligero (~85 líneas) con soporte para parámetros de búsqueda `?seccion=...` y transiciones suaves con `AnimatePresence`.
- [x] **Pruebas Automatizadas y Calidad**:
  - `src/test/accessibility-slice.test.ts`: Pruebas de inicialización y mutación de `textScalePercent` (3 pasadas).
  - `src/test/ajustes-modular.test.tsx`: Pruebas de renderizado de Hub, navegación a subsecciones y retroceso (3 pasadas).
  - Suite completa: 24/24 suites pasadas (69 tests).
  - Verificación estática: `npx tsc --noEmit` completado con 0 errores.
  - Compilación de producción: `npm run build` completado exitosamente.

---

## 2. Estructura de Archivos Resultante

```
src/
├── pages/
│   ├── Ajustes.tsx                            # Controlador principal y enrutador modular (~85 líneas)
│   └── ajustes/
│       ├── types.ts                           # Tipos e interfaces de las secciones de ajustes
│       ├── AjustesHub.tsx                     # Menú principal con tarjetas categorizadas
│       ├── AjustesHeader.tsx                  # Cabecera reutilizable con botón "← Ajustes"
│       └── secciones/
│           ├── PerfilSection.tsx              # Perfil, avatar, moneda y cuenta
│           ├── CuentasSection.tsx             # Cuentas bancarias, efectivo y desglose
│           ├── FijosSection.tsx               # Conceptos fijos y suscripciones recurrentes
│           ├── AparienciaSection.tsx          # Tema, color de acento, modo compacto, cristal
│           ├── AccesibilidadSection.tsx       # Slider de escala, alto contraste, dislexia, daltonismo
│           ├── NotificacionesSection.tsx      # Web push, alertas de presupuesto y avisos de corte
│           ├── DatosSection.tsx               # Sincronización Supabase, exportar/importar, comprobantes
│           └── SeguridadSection.tsx           # Restablecimiento de datos y versión de la app
├── components/
│   └── app/
│       └── AccessibilitySettings.tsx          # Slider de texto continuo, presets y preview en vivo
├── lib/
│   └── finance.ts                             # textScalePercent y textScale 'custom'
├── index.css                                  # Reglas WCAG AAA alto contraste y estilos dislexia
└── test/
    ├── accessibility-slice.test.ts            # Cobertura para textScalePercent
    └── ajustes-modular.test.tsx               # Pruebas de navegación modular en Ajustes
```

---

## 3. Criterios de Aceptación Verificados

1. **Modularidad:**
   - La pantalla principal de `/ajustes` muestra el Hub de 8 categorías organizadas con badges de estado actual.
   - Cada categoría abre su vista dedicada y cuenta con un botón visible y accesible para volver al Hub.
   - La URL refleja `?seccion=<id>` y el botón "Atrás" del navegador retorna al Hub sin salir de la app ni perder el estado.
2. **Alto Contraste WCAG AAA:**
   - Bordes nítidos de 2px y textos sin opacidades reducidas.
   - Contraste medible superior a 7:1 para textos y 4.5:1 para elementos interactivos.
3. **Escala de Texto a Elección:**
   - Slider interactivo desde 80% hasta 150% con escalado dinámico proporcional a nivel raíz.
   - Presets directos de 85%, 100%, 115% y 135%.
   - El valor seleccionado persiste en `localStorage` (y en Supabase si hay sesión).
4. **Tipografía para Dislexia:**
   - Fuentes Atkinson Hyperlegible y Lexend aplicadas en toda la interfaz con espaciado optimizado.
5. **Calidad y Robustez:**
   - `npx tsc --noEmit` finalizado con 0 errores de tipo.
   - 24/24 suites de pruebas unitarias e integradas pasando (69 tests).
   - `npm run build` exitoso sin advertencias de código crítico.