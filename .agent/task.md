# Especificación de Tarea Activa (`.agent/task.md`)

> **Estado:** 🟢 LISTO PARA CONSTRUCCIÓN (SPRINT 1 — FUNDACIÓN UI V2)  
> **Arquitecto (Fase 1 & 3):** Antigravity CLI (`agy` — Gemini 4 Argon)  
> **Constructor (Fase 2):** Antigravity CLI (`agy` — Gemini 3.8 Flash) en `.worktrees/builder`  
> **Rama Protegida:** `redesign/ui-v2` (bloqueo `pushRemote = no_push` activo)  
> **Plan Maestro Detallado:** Ver [`.agent/workflow/01_ARCHITECT_PLAN.md`](file:///run/media/migol/Files/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/.agent/workflow/01_ARCHITECT_PLAN.md) y [`.agent/workflow/02_OPENCODE_TASKS.md`](file:///run/media/migol/Files/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/.agent/workflow/02_OPENCODE_TASKS.md).

---

## 1. Estructura de Archivos a Crear / Modificar (Sprint 1)

- **`MODIFICAR`** `src/lib/finance.ts` — Tipo `UIVersion = "classic" | "v2"` y campo `uiVersion?: UIVersion` en `AppSettings`.
- **`MODIFICAR`** `src/store/slices/settings-slice.ts` — Estado `appSettings.uiVersion: 'v2'` y acciones `setUIVersion`, `toggleUIVersion`.
- **`MODIFICAR`** `src/hooks/useFinanceData.ts` — Exponer `setUIVersion` y `toggleUIVersion`.
- **`MODIFICAR`** `src/lib/accent-palette.ts` — `ACCENT_PALETTES_V2` (*Warm Editorial Wealth*) y `getAccentPalette(theme, color, uiVersion)`.
- **`MODIFICAR`** `src/index.css` — `@import` de `'Fraunces'`, `'Plus Jakarta Sans'` y `'JetBrains Mono'`; tokens `html.ui-v2` y `html.dark.ui-v2`; clases `.font-display-v2` y `.font-mono-tabular`.
- **`MODIFICAR`** `src/components/app/BrandLogo.tsx` — Nuevo isotipo SVG *"El Compañero Próspero" (Monograma FP + Semilla)* en `v2`, manteniendo `nuevo_logo.webp` en `classic`.
- **`MODIFICAR`** `src/components/app/SplashScreen.tsx` — Animación de bienvenida vectorial del Monograma FP en `v2` para Web y Android.
- **`CREAR`** `src/components/app/DesignCompareToggle.tsx` — Conmutador flotante en vivo (`v2 ↔ classic`) con soporte de atajo `Alt + D`.
- **`MODIFICAR`** `src/components/app/AppShell.tsx` — Sincronización de clase `html.ui-v2` / `html.ui-classic`, `getAccentPalette` y renderizado de `<DesignCompareToggle />`.
- **`MODIFICAR`** `src/pages/ajustes/secciones/AparienciaSection.tsx` — Selector interactivo **"Nuevo Diseño (Warm Editorial v2) vs. Diseño Clásico (v1)"**.
- **`CREAR`** `src/store/__tests__/ui-version-settings.test.ts` — Pruebas unitarias en Vitest.

---

## 2. Dependencias e Imports Requeridos

- No requiere instalar paquetes externos nuevos (usa `lucide-react`, `@/lib/framer`, `sonner`, `zustand` y `vitest` ya presentes en `package.json`).

---

## 3. Criterios de Aceptación

1. `npx tsc --noEmit` finaliza con 0 errores.
2. `npx vitest run` pasa el 100% de las suites incluyendo `ui-version-settings.test.ts`.
3. `npm run lint` sin errores nuevos.
4. Conmutación instantánea en vivo entre `v2` (*Warm Editorial Wealth* + nuevo logo FP) y `classic` (diseño v1 intacto) mediante `Alt + D`, el botón flotante y `Ajustes > Apariencia`.
5. `SplashScreen` ejecuta la animación del nuevo logo FP al iniciar la app en modo `v2`.
