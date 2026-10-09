# Plan de Tareas: Mejora Integral de GUI y Nuevo Módulo de Accesibilidad

> **Estado:** ✅ FASES 1, 2, 3 Y 4 COMPLETADAS  
> **Objetivo:** Auditoría completa de la GUI, corrección de alineaciones, superposiciones, duplicados, simetría, diseño responsivo, estandarización visual y desarrollo del módulo de Accesibilidad en Ajustes.  
> **Resultado de Verificación:**  
> - `npx tsc --noEmit`: 0 errores.  
> - `npm test`: 23 test suites pasadas (66/66 tests).  
> - `npx eslint src/ --quiet`: 0 errores.  
> - `npm run build`: Compilación limpia sin errores.

---

## Roadmap de Implementación por Fases

### Fase 1: Cimientos del Sistema de Diseño (Design Tokens & Brand)
- [x] **1.1. Estandarización de Tipografía y Escala de Fuentes**
  - [x] Eliminar microtextos arbitrarios (`text-[7px]`, `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]`).
  - [x] Definir token `text-micro` (11px, exclusivo para badges y micro-etiquetas) en `tailwind.config.ts`.
  - [x] Normalizar pesos tipográficos (`font-semibold`, `font-bold`, `font-extrabold`).
- [x] **1.2. Escala Unificada de Radios de Borde (Border Radius)**
  - [x] Badges/Chips: `rounded-full` / `rounded-lg`.
  - [x] Inputs/Botones/Selects: `rounded-xl` (12px).
  - [x] Tarjetas secundarias y listas: `rounded-2xl` (16px).
  - [x] Modales y tarjetas principales: `rounded-3xl` (24px).
  - [x] Retirar valores dispares (`rounded-[28px]`, `rounded-[32px]`, `rounded-t-[40px]`).
- [x] **1.3. Consistencia de Branding y Logotipos**
  - [x] Crear componente unificado `BrandLogo` (`src/components/app/BrandLogo.tsx`) usando los assets oficiales `nuevo_logo.webp` y `app-icon.webp`.
  - [x] Reemplazar el icono provisorio de `<Wallet />` en DesktopSidebar, Login, Dashboard y NotFound.
- [x] **1.4. Tokens de Color y Contrastes WCAG**
  - [x] Reemplazar colores fijos (`text-yellow-500`, `text-gray-400`, `bg-red-500`, etc.) por tokens (`--primary`, `--warning`, `--success`, `--destructive`, `--muted-foreground`).
  - [x] Garantizar ratio mínimo de contraste de 4.5:1 para texto normal y 3:1 para controles UI.

---

### Fase 2: Nuevo Módulo de Accesibilidad en Configuración
- [x] **2.1. Definición de Modelo de Datos y Store**
  - [x] Extender `AppSettings` en `src/lib/finance.ts` con la interfaz `AccessibilitySettings`:
    - `textScale`: `"compact" | "normal" | "large" | "xlarge"`.
    - `highContrast`: `boolean` (alto contraste en bordes y textos).
    - `reduceMotion`: `boolean` (desactivación forzada de animaciones).
    - `dyslexicFont`: `boolean` (fuente hiperlegible / mayor tracking).
    - `underlineLinks`: `boolean` (subrayado visual de enlaces).
    - `largeTouchTargets`: `boolean` (mínimo 48x48px para controles interactivos).
    - `colorBlindMode`: `"none" | "protanopia" | "deuteranopia" | "tritanopia"`.
    - `enhancedFocusRing`: `boolean` (indicador de foco de 3px).
  - [x] Agregar acciones en `src/store/slices/settings-slice.ts` para mutar y persistir localmente.
  - [x] Integrar guardado en Supabase vía `src/services/settings.service.ts` si la nube está activa.
- [x] **2.2. Motor CSS en `src/index.css` y `AppShell.tsx`**
  - [x] Inyectar clases `a11y-*` en `document.documentElement` según las preferencias activas.
  - [x] Configurar variables CSS relativas para escala tipográfica, contrastes y paleta segura de daltonismo.
- [x] **2.3. Componente UI en Ajustes: `AccessibilitySettings.tsx`**
  - [x] Crear el panel interactivo con switches accesibles, selectores y descripciones legibles.
  - [x] Integrar el panel dentro de `src/pages/Ajustes.tsx`.

---

### Fase 3: Auditoría y Corrección de Pantallas Clave

- [x] **3.1. Reorganización Estructural de `src/pages/Ajustes.tsx`**
  - [x] Reordenar secciones lógicamente:
    1. Perfil y Moneda
    2. Cuentas Bancarias y Desglose de Efectivo (resituadas al inicio en vez del fondo)
    3. Conceptos Fijos (con encabezado explícito)
    4. Apariencia
    5. **Accesibilidad (Nueva sección)**
    6. Notificaciones
    7. Nube y Datos (Exportar/Importar/Recibos)
    8. Seguridad y Sistema (Restablecer, versión `v1.19.38`)
  - [x] Eliminar el bloque "Más" que duplicaba Metas, Deudas e Historial.
- [x] **3.2. Correcciones en `src/pages/Dashboard.tsx`**
  - [x] Eliminar "Neto acumulado" y "Resumen anual" duplicados en pantallas 2xl.
  - [x] Corregir asimetría de márgenes inferiores en mobile (`pb-28` uniforme).
  - [x] Añadir `aria-label` al botón de alternar visibilidad de montos (ojo).
  - [x] Ampliar touch target del botón de ojo a 44x44px.
  - [x] Sustituir emojis huérfanos por iconos con `aria-hidden="true"`.
- [x] **3.3. Correcciones en `src/pages/Movimientos.tsx`**
  - [x] Rediseñar selectores de cuenta en el modal para evitar duplicidades en ingresos y traspasos.
  - [x] Reemplazar input de archivo nativo de comprobante por un botón de subida integrado.
  - [x] Ampliar botones de fila (editar, eliminar, expandir) a 44x44px interactivos.
  - [x] Añadir `aria-label` a botones de iconos y chevron.
  - [x] Limpiar las barras de filtros para evitar botones diminutos (32px).
- [x] **3.4. Correcciones en `src/pages/Metas.tsx`**
  - [x] Corregir posición absoluta del botón de cerrar modal (`X`) para evitar colisiones.
  - [x] Añadir `aria-label` a botón de estrella (fijar) y aporte personalizado (`···`).
  - [x] Rediseñar `PaceBox` eliminando `text-[8px]` y `text-[10px]`.
  - [x] Ampliar botones de árbol de carpetas a touch target accesible.
- [x] **3.5. Correcciones en `src/pages/Deudas.tsx`**
  - [x] Normalizar tipografía en `SumCard` y lista "Por persona".
  - [x] Aumentar botones de eliminar abonos de `p-1` a 44px.
  - [x] Alinear badges de estado "Saldada".
- [x] **3.6. Correcciones en `Login.tsx`, Shell y Navegación**
  - [x] Integrar `BrandLogo` oficial en Login, DesktopSidebar y NotFound.
  - [x] Añadir etiquetas `<Label>` accesibles a los inputs de inicio de sesión y registro.
  - [x] BottomNav: asegurar altura táctil mínima de 48px con `aria-current="page"`.
  - [x] SyncIndicator: badge visible de 16x16px con `text-[10px]` en negrita y colores semánticos.

---

### Fase 4: Verificación y Cumplimiento WCAG 2.1 AA
- [x] **4.1. Pruebas Automatizadas**
  - [x] Ejecutar `npm run lint` (0 errores) y `npm run test` (23 suites, 66 tests pasando).
  - [x] Añadir tests unitarios para las mutaciones de accesibilidad en Zustand (`src/test/accessibility-slice.test.ts`).
  - [x] Verificar build de producción limpio (`npm run build`).
- [x] **4.2. Pruebas Manuales de Accesibilidad**
  - [x] Navegación 100% por teclado (`Tab`, `Shift+Tab`, `Enter`).
  - [x] Verificación de contraste cromático y legibilidad en temas claro y oscuro.
  - [x] Verificación en resoluciones móviles (360px, 390px, 768px, 1280px+).

---

## Archivo de Diagnóstico Previo (Metas Supabase Bug)
*(Para consulta histórica de sincronización de metas)*
- Diagnóstico confirmado: `addGoalContribution` en `goals.service.ts` no insertaba la fila correspondiente en la tabla `transactions`. Solución planificada lista para aplicarse en paralelo o posterior a la UI.