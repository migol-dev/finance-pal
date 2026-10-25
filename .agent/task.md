# Especificación de Tarea Activa (`.agent/task.md`)

> **Estado:** ✅ FASE 2 CONCLUIDA (LISTO PARA AUDITORÍA FASE 3 POR GEMINI 4 ARGON)  
> **Arquitecto y Auditor (Fase 1 & 3):** Antigravity CLI (`agy` — Google Gemini 4 Argon)  
> **Constructor (Fase 2):** Antigravity CLI (`agy` — Google Gemini 3.8 Flash)  
> **Rama Protegida:** `redesign/ui-v2` (bloqueo `pushRemote = no_push` activo)  
> **Plan Maestro Detallado:** Ver [`.agent/workflow/01_ARCHITECT_PLAN.md`](file:///run/media/migol/Files/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/.agent/workflow/01_ARCHITECT_PLAN.md) y [`.agent/workflow/02_OPENCODE_TASKS.md`](file:///run/media/migol/Files/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/.agent/workflow/02_OPENCODE_TASKS.md).

---

## 1. Estructura de Archivos a Crear / Modificar (Sprint 8)

### Bloque 1 — Primeras Observaciones (UI en Resumen Anual y Metas Móvil)
- **`MODIFICAR`** `src/components/anual/AnualV2.tsx`:
  - Reemplazar el selector de pestañas estrecho (`flex justify-start`) por un control segmentado de ancho completo (`w-full grid grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-[#F2EFE9] dark:bg-[#141413] border border-[#E4E0D8] dark:border-white/10`).
  - Mostrar etiquetas con tildes y buen padding: `"General"`, `"Categorías"`, `"Métodos"`, `"Metas"`.
- **`MODIFICAR`** `src/components/app/PillTabs.tsx`:
  - Mejorar el padding horizontal (`px-3.5 py-2`), soporte opcional de `labels` y contraste de superficies activas/inactivas.
- **`MODIFICAR`** `src/pages/metas/FolderChips.tsx`:
  - Eliminar el renderizado de carpetas individuales (`folderTree.map(...)` y `selectedSubfolder`) en la barra horizontal móvil.
  - Renderizar únicamente `"Todas"`, `"Sin carpeta"` y `"Carpetas"` (que abre el drawer del explorador de carpetas) para que los 3 botones siempre se vean completos sin taparse.

### Bloque 2 — Segundas Observaciones (Categorías Generales + Creación Personalizada, Orden de Boot y Tema desde el Segundo 1)
- **`MODIFICAR`** `src/lib/finance.ts`:
  - Actualizar `CATEGORY_EMOJI` con categorías universales y cotidianas (*Alimentación*, *Transporte*, *Vivienda*, *Servicios*, *Salud*, *Educación*, *Entretenimiento*, *Compras*, *Familia y Mascotas*, *Trabajo / Sueldo*, *Negocio / Ventas*, *Ahorro e Inversión*, *Deudas*, *Regalos*, *Otros*) + `LEGACY_CATEGORY_EMOJI` para retrocompatibilidad.
  - Definir `MAX_CUSTOM_CATEGORY_NAME_LENGTH = 20` y `CustomCategory { id: string; name: string; emoji: string; createdAt?: string }`.
  - Añadir `customCategories?: CustomCategory[]` en `AppSettings` y helper `getCategoriesMap(customCategories)`.
- **`MODIFICAR`** `src/store/slices/settings-slice.ts` y `src/hooks/useFinanceData.ts`:
  - Agregar `customCategories`, `addCustomCategory`, `updateCustomCategory` y `removeCustomCategory`.
- **`CREAR`** `src/pages/ajustes/secciones/CategoriasSection.tsx`:
  - Nuevo apartado en Ajustes para crear, editar y eliminar categorías personalizadas con selector de emoji y nombre de máximo 20 caracteres.
- **`CREAR`** `src/components/app/CategorySelectWithCreate.tsx`:
  - Selector de categoría reutilizable con la opción directa `"+ Crear nueva categoría..."` que permite elegir nombre (`<= 20` caracteres) y emoji sin salir del formulario de movimiento.
- **`MODIFICAR`** `src/pages/ajustes/types.ts`, `src/pages/ajustes/AjustesV2.tsx`, `src/pages/Ajustes.tsx`, `src/pages/ajustes/AjustesHub.tsx`:
  - Integrar el apartado `"categorias"` en Ajustes.
- **`MODIFICAR`** `src/components/movimientos/MovimientosV2.tsx`, `src/components/app/QuickTransactionSheet.tsx`, `src/pages/ajustes/secciones/FijosSection.tsx`:
  - Integrar `CategorySelectWithCreate` y `getCategoriesMap`.
- **`MODIFICAR`** `src/App.tsx` y `src/components/app/AppShell.tsx`:
  - Garantizar que al recargar la página se muestre **primero** `SplashScreen` (1.5s) desde el milisegundo 0, y **solo después** de terminar la animación aparezca `PageSkeleton` si aún no han cargado los datos.
- **`CREAR`** `src/lib/theme-sync.ts` y **`MODIFICAR`** `index.html`, `src/store/finance-store.ts`:
  - Sincronizar la preferencia de tema en `localStorage` (`"fp-theme-pref"`) e inyectar script síncrono en `<head>` de `index.html` para aplicar el tema del dispositivo o del usuario desde el segundo 1 sin flash claro.
- **`MODIFICAR`** `src/pages/LoginV2.tsx` y `src/pages/LoginClassic.tsx`:
  - Añadir selector dinámico de tema (`Claro` / `Oscuro` / `Sistema`) en el panel de Login y Register.

### Bloque 3 — Suite de Pruebas
- **`CREAR`** `src/test/sprint8-categories-theme-boot.test.tsx`:
  - Cobertura unitaria completa de los Bloques 1 y 2.

---

## 2. Interfaces de Datos Requeridas

```ts
export const MAX_CUSTOM_CATEGORY_NAME_LENGTH = 20;

export interface CustomCategory {
  id: string;
  name: string; // 1..20 caracteres
  emoji: string;
  createdAt?: string;
}
```

---

## 3. Criterios de Aceptación

1. `npx tsc --noEmit` finaliza con 0 errores.
2. `npx vitest run` pasa el 100% de las suites.
3. `npm run build` genera el bundle de producción limpiamente.
4. En Resumen Anual, los botones `General`, `Categorías`, `Métodos` y `Metas` ocupan el ancho disponible con diseño limpio y espaciado cómodo.
5. En Metas móvil, la barra superior solo muestra `"Todas"`, `"Sin carpeta"` y `"Carpetas"` sin que ninguna carpeta individual tape el botón `"Carpetas"`.
6. Las categorías por defecto son generales y el usuario puede crear categorías personalizadas (máx. 20 caracteres + emoji) tanto desde el nuevo apartado en Ajustes como desde `"Crear nueva"` en el selector del movimiento.
7. Al recargar la página, primero aparece `SplashScreen` y solo después (si sigue cargando) `PageSkeleton`.
8. El tema del dispositivo o el seleccionado por el usuario se aplica desde el milisegundo 0 sin parpadeo claro, y puede cambiarse dinámicamente desde Login y Register.
