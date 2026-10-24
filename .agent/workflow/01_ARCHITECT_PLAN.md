# 📐 Arquitectura & Plan Maestro: Rediseño Integral Finance Pal v2 (Sprint 1: Fundación Dual, Identidad Warm Editorial & Logo FP Animado)

> **Fase:** 1 — Planificación y Orquestación Arquitectónica  
> **Agente Arquitecto:** Antigravity CLI (`agy` — Google Gemini 4 Argon)  
> **Agente Constructor (Fase 2):** Antigravity CLI (`agy` — Google Gemini 3.8 Flash)  
> **Estado:** 🟢 LISTO PARA CONSTRUCCIÓN  
> **Fecha:** 2026-10-24  
> **Rama / Worktree Principal:** `redesign/ui-v2` (con bloqueo `pushRemote = no_push`)  
> **Worktree Destino del Constructor:** `.worktrees/builder` (`builder/ui-v2-sprint-1`)

---

## 1. Resumen Ejecutivo y Hoja de Ruta Maestra (6 Sprints)

- **Propósito:** Rediseñar integralmente la experiencia visual e interactiva de **Finance Pal** bajo el arquetipo **Warm Editorial Wealth (`v2`)**, optimizada tanto para pantallas pequeñas de celulares (`360px–430px`) como para monitores de escritorio (`1024px–2560px`), preservando intacta la interfaz original como opción seleccionable por el usuario (**Diseño Clásico `classic`**).
- **Hoja de Ruta de Sprints:**
  - **Sprint 1 (ACTIVO EN ESTE PLAN):** Fundación de Convivencia Dual (`uiVersion: 'v2' | 'classic'`), Sistema Cromático y Tipográfico *Warm Editorial Wealth*, Nuevo Isotipo Vectorial *"El Compañero Próspero" (Monograma FP)*, `SplashScreen` con animación de trazado y brote elástico en Web/Android, Selector en `Ajustes > Apariencia` y Conmutador Flotante de Comparación en Vivo (`Alt + D`).
  - **Sprint 2:** `AppShellV2`, `BottomNavV2` ergonómica (`Inicio | Movimientos | [+] | Deudas | Metas`), `QuickTransactionSheet` (`vaul`), `DesktopSidebarV2` colapsable y `CommandPalette` (`⌘K` con `cmdk`).
  - **Sprint 3:** `DashboardV2` (Escenario Editorial de Patrimonio Neto con selector interactivo + Pulso Mensual + Layout Asimétrico `7+5` en PC y listas *de-boxed* con divisores `1px` en celular).
  - **Sprint 4:** `MovimientosV2` (Agrupación diaria con subtotales en `JetBrains Mono` + Inspector *Master-Detail* en PC y *Bottom Sheet* en celular).
  - **Sprint 5:** `DeudasV2` y `MetasV2` (Arquitectura *Master-Detail* en PC y *Bottom Sheet* en celular sin modales intrusivos).
  - **Sprint 6:** `AnualV2`, `HistorialV2`, `AjustesV2` y `LoginV2` bajo identidad *Warm Editorial Wealth*.

---

## 2. Razonamiento de Diseño Obligatorio (`frontend-ui-craft`)

1. **Intención UX y Punto Focal:**
   - Permitir que el usuario experimente desde el primer segundo (en el `SplashScreen` y en toda la app) una atmósfera financiera cálida, humana, amigable y confiable, con capacidad de conmutar en tiempo real entre el **Nuevo Diseño (`v2`)** y el **Diseño Clásico (`classic`)** sin recargar la página ni perder contexto.
2. **Dirección Estética y Paleta a Medida (Arquetipo `--editorial` + `--saas` híbrido: *Warm Editorial Wealth*):**
   - **Modo Claro (`html.ui-v2`):**
     - **Canvas Background:** `#FAF8F5` (`40 33% 97%` — Warm Alabaster)
     - **Elevated Surface / Card:** `#F2EFE9` (`39 24% 93%` — Tactile Oat) / `#FFFFFF` para popovers e inspectores elevados
     - **Primary Ink:** `#191918` (`60 2% 10%` — Espresso Charcoal)
     - **Muted Ink:** `#6E6A63` (`38 5% 41%` — Warm Stone)
     - **Hairline Border:** `#E4E0D8` (`40 18% 87%` — `1px` arquitectónico)
   - **Modo Oscuro (`html.dark.ui-v2` — Luminancia Progresiva):**
     - **Canvas Background:** `#0C0C0B` (`60 4% 5%` — Warm Obsidian)
     - **Elevated Surface / Card:** `#141413` (`60 3% 8%` — Deep Graphite)
     - **Floating Popover / Sheet:** `#1E1E1C` (`60 3% 11%` — Smoked Charcoal con `border-t border-white/12`)
     - **Primary Ink:** `#EDEDEC` (`60 5% 93%` — Soft Chalk)
     - **Muted Ink:** `#8E8D8A` (`45 2% 55%` — Muted Zinc)
     - **Hairline Border:** `60 3% 16%` (`#2A2A28` / `rgba(255,255,255,0.08)`)
   - **5 Acentos Curados en Modo `v2`:**
     - `emerald` (Esmeralda Botánico — Acento insignia de `v2`): `#1F7A5A` (`159 59% 30%` en claro) / `#34D399` (`158 64% 52%` en oscuro)
     - `amber` (Terracota / Ámbar Editorial): `#C86446` (`14 54% 53%`) / `#F59E0B` (`38 92% 50%`)
     - `blue` (Cobalto Precisión): `#2383E2` (`210 76% 51%`) / `#60A5FA` (`213 94% 68%`)
     - `rose` (Arcilla Botánica): `#B84A62` (`347 44% 51%`) / `#FB7185` (`351 95% 71%`)
     - `violet` (Índigo Editorial): `#5B46E5` (`248 75% 59%`) / `#A78BFA` (`255 92% 76%`)
3. **Sistema Tipográfico:**
   - Inyección en `src/index.css` de Google Fonts:
     - `'Fraunces'` (pesos `600;700;800`, display editorial para saludos, encabezados héroe y el nombre de marca en `v2`).
     - `'Plus Jakarta Sans'` (pesos `400;500;600;700;800`, UI y cuerpo de lectura cálida y amigable).
     - `'JetBrains Mono'` (pesos `400;500;600;700`, cifras financieras, montos, porcentajes y fechas con `font-variant-numeric: tabular-nums`).
4. **Arquitectura Espacial e Interacción (Sprint 1):**
   - **Nuevo Logo Vectorial ("El Compañero Próspero"):** Isotipo SVG con monograma continuo `F + P` y semilla/moneda esmeralda con punto de luz especular.
   - **`SplashScreen` Animado (`v2`):** Animación con Framer Motion donde los trazos de la `F` y `P` se dibujan progresivamente (`pathLength: 0 -> 1` con curva `cubic-bezier(0.22, 1, 0.36, 1)`), la semilla/moneda brota con física de resorte (`spring`) y aparece una barra de progreso sutil sobre el lienzo `#FAF8F5` / `#0C0C0B`.

---

## 3. Alineación Arquitectónica (Finance Pal Local-First)

- **Capa UI (Vistas y Componentes):** Consumen `appSettings.uiVersion` y `setUIVersion` a través de `useFinanceData` (o `useFinance` en selectores atómicos de configuración como `AparienciaSection.tsx`, manteniendo el patrón exacto existente).
- **Capa de Estado (Zustand + React Query):** `uiVersion: UIVersion` vive dentro de `appSettings` en `src/store/slices/settings-slice.ts` con valor inicial `'v2'`.
- **Capa de Servicios (Supabase SDK):** `src/services/settings.service.ts` se mantiene 100% retrocompatible con la tabla `user_settings`.
- **Reglas de Seguridad:** Respeto absoluto a `.agentignore`. Prohibido tocar `.env*` o hacer `git push`.

---

## 4. Mapa de Archivos e Impacto (Sprint 1)

| Acción | Ruta del Archivo | Responsabilidad / Descripción |
| :--- | :--- | :--- |
| `MODIFICAR` | `src/lib/finance.ts` | Exportar `export type UIVersion = "classic" \| "v2";` y añadir `uiVersion?: UIVersion;` en `interface AppSettings`. |
| `MODIFICAR` | `src/store/slices/settings-slice.ts` | Añadir `setUIVersion: (v: UIVersion) => void;` y `toggleUIVersion: () => void;` en `SettingsSlice`, con `uiVersion: 'v2'` por defecto en `appSettings`. |
| `MODIFICAR` | `src/hooks/useFinanceData.ts` | Exponer `setUIVersion` y `toggleUIVersion` en el hook fachada `useFinanceData`. |
| `MODIFICAR` | `src/lib/accent-palette.ts` | Añadir paleta curada `ACCENT_PALETTES_V2` (*Warm Editorial Wealth*) y helper `getAccentPalette(theme, color, uiVersion)` sin alterar `ACCENT_PALETTES` clásico. |
| `MODIFICAR` | `src/index.css` | Importar `'Fraunces'`, `'Plus Jakarta Sans'` y `'JetBrains Mono'`. Añadir bloque `html.ui-v2` y `html.dark.ui-v2` con variables CSS *Warm Editorial Wealth* y utilidades `.font-display-v2` y `.font-mono-tabular`. |
| `MODIFICAR` | `src/components/app/BrandLogo.tsx` | Soportar `uiVersion`: cuando es `'v2'`, renderizar el nuevo isotipo SVG vectorial **"El Compañero Próspero" (Monograma FP + Semilla)** y tipografía editorial; cuando es `'classic'`, renderizar `nuevo_logo.webp` intacto. |
| `MODIFICAR` | `src/components/app/SplashScreen.tsx` | Cuando `uiVersion === 'v2'`, mostrar la animación vectorial del nuevo logo FP (trazo continuo + brote spring de la moneda/semilla + saludo cálido) en Web y Android; cuando es `'classic'`, mantener el splash clásico. |
| `CREAR` | `src/components/app/DesignCompareToggle.tsx` | Botón flotante compacto + atajo de teclado `Alt + D` para alternar en vivo entre **Nuevo Diseño (v2)** y **Diseño Clásico (v1)** en cualquier pantalla. |
| `MODIFICAR` | `src/components/app/AppShell.tsx` | Sincronizar la clase `ui-v2` / `ui-classic` en `document.documentElement`, aplicar `getAccentPalette(theme, accentColor, uiVersion)` e inyectar `<DesignCompareToggle />`. |
| `MODIFICAR` | `src/pages/ajustes/secciones/AparienciaSection.tsx` | Añadir selector visual interactivo **"Estilo de la Interfaz: Nuevo Diseño (Warm Editorial v2) vs. Diseño Clásico (v1)"** con vista previa de ambos estilos. |
| `CREAR` | `src/store/__tests__/ui-version-settings.test.ts` | Pruebas unitarias en Vitest validando `uiVersion` por defecto (`'v2'`), `setUIVersion`, `toggleUIVersion` y `getAccentPalette`. |

---

## 5. Tipos, Interfaces y Contratos de Datos Exactos

### 5.1. `src/lib/finance.ts`
```typescript
export type UIVersion = "classic" | "v2";

export interface AppSettings {
  uiVersion?: UIVersion;
  accentColor: AccentColor;
  compactMode: boolean;
  glassEffect: boolean;
  conflictResolved?: boolean;
  notifications: NotificationPreferences;
  accessibility: AccessibilitySettings;
}
```

### 5.2. `src/store/slices/settings-slice.ts`
```typescript
// En interface SettingsSlice:
setUIVersion: (v: UIVersion) => void;
toggleUIVersion: () => void;

// En createSettingsSlice:
appSettings: {
  uiVersion: 'v2',
  accentColor: 'emerald',
  compactMode: false,
  glassEffect: true,
  conflictResolved: false,
  notifications: DEFAULT_NOTIFICATION_PREFS,
  accessibility: DEFAULT_ACCESSIBILITY_SETTINGS,
},
setUIVersion: (uiVersion) =>
  set((s) => ({ appSettings: { ...s.appSettings, uiVersion } })),
toggleUIVersion: () =>
  set((s) => ({
    appSettings: {
      ...s.appSettings,
      uiVersion: (s.appSettings.uiVersion ?? 'v2') === 'v2' ? 'classic' : 'v2',
    },
  })),
```

### 5.3. `src/lib/accent-palette.ts`
- Mantener `ACCENT_PALETTES` intacto para `uiVersion === "classic"`.
- Exportar `ACCENT_PALETTES_V2: Record<"light" | "dark", Record<AccentColor, AccentPalette>>` con los tonos curados de *Warm Editorial Wealth* (donde `emerald` usa `159 59% 30%` en claro y `158 64% 52%` en oscuro, `amber` usa Terracota `14 54% 53%` en claro y `38 92% 50%` en oscuro, `blue` usa `210 76% 51%` / `213 94% 68%`, `rose` usa `347 44% 51%` / `351 95% 71%`, `violet` usa `248 75% 59%` / `255 92% 76%`).
- Exportar helper puro:
  ```typescript
  export function getAccentPalette(
    theme: "light" | "dark",
    color: AccentColor,
    uiVersion: "classic" | "v2" = "v2"
  ): AccentPalette {
    const source = uiVersion === "v2" ? ACCENT_PALETTES_V2 : ACCENT_PALETTES;
    return source[theme][color] ?? source[theme].emerald;
  }
  ```

---

## 6. Plan de Ejecución Secuencial para el Constructor (`agy` — Gemini 3.8 Flash)

> **Instrucciones para el Constructor:** Ejecutar en orden dentro de `.worktrees/builder` siguiendo `02_OPENCODE_TASKS.md`. Prohibido hacer `git push`.

### Fase F1: Fundación Dual, Identidad Warm Editorial & Logo Animado
- [ ] **Tarea F1.1 (Tipos y Store Zustand):** Actualizar `src/lib/finance.ts`, `src/store/slices/settings-slice.ts` y `src/hooks/useFinanceData.ts` agregando `UIVersion`, `appSettings.uiVersion` (default `'v2'`), `setUIVersion` y `toggleUIVersion`.
- [ ] **Tarea F1.2 (Paletas Curadas v2 y Tokens CSS):** Actualizar `src/lib/accent-palette.ts` con `ACCENT_PALETTES_V2` y `getAccentPalette`, y actualizar `src/index.css` con el `@import` de `'Fraunces'`, `'Plus Jakarta Sans'` y `'JetBrains Mono'`, las variables de `html.ui-v2` / `html.dark.ui-v2` (`#FAF8F5` / `#0C0C0B`), y las clases `.font-display-v2` y `.font-mono-tabular`.
- [ ] **Tarea F1.3 (Nuevo Isotipo Vectorial `BrandLogo.tsx`):** Actualizar `src/components/app/BrandLogo.tsx` para renderizar en modo `v2` el nuevo isotipo SVG **"El Compañero Próspero" (Monograma FP + Semilla/Moneda)** con soporte opcional de prop `animated?: boolean` y `forceVersion?: UIVersion`, manteniendo `nuevo_logo.webp` cuando `uiVersion === 'classic'`.
- [ ] **Tarea F1.4 (`SplashScreen.tsx` con Animación del Nuevo Logo):** Actualizar `src/components/app/SplashScreen.tsx` para que en modo `v2` ejecute una animación fluida del Monograma FP (trazado SVG de la `F` y `P` + aparición elástica de la moneda/semilla + tipografía `Fraunces`) tanto al abrir la web como la app de Android, respetando `prefers-reduced-motion` y el modo `classic`.
- [ ] **Tarea F1.5 (Conmutador Flotante `DesignCompareToggle.tsx` y `AppShell.tsx`):** Crear `src/components/app/DesignCompareToggle.tsx` (con atajo `Alt + D` y píldora interactiva para alternar `v2 ↔ classic` en tiempo real) e integrarlo en `src/components/app/AppShell.tsx` junto con la sincronización de la clase `html.ui-v2` y `getAccentPalette`.
- [ ] **Tarea F1.6 (Selector de Diseño en `AparienciaSection.tsx`):** Actualizar `src/pages/ajustes/secciones/AparienciaSection.tsx` añadiendo la tarjeta principal **"Versión de la Interfaz"** que permite al usuario elegir entre **Nuevo Diseño (Warm Editorial v2)** y **Diseño Clásico (v1)** en cualquier momento.
- [ ] **Tarea F1.7 (Pruebas Unitarias y Actualización de Grafo):** Crear `src/store/__tests__/ui-version-settings.test.ts`, verificar `npx tsc --noEmit`, `npx vitest run`, `npm run lint` y ejecutar `graphify update .`.

---

## 7. Criterios de Aceptación y Checklist de Calidad

- [ ] Compilación TypeScript limpia (`npx tsc --noEmit` sin errores).
- [ ] Pruebas unitarias pasando al 100% (`npx vitest run`).
- [ ] Al alternar con `Alt + D` o desde `Ajustes > Apariencia`, la app cambia instantáneamente entre el **Nuevo Diseño v2** (fondo `#FAF8F5` / `#0C0C0B`, tipografía `Fraunces` + `Plus Jakarta Sans` + `JetBrains Mono`, nuevo logo vectorial FP) y el **Diseño Clásico v1** (colores y logo anteriores intactos).
- [ ] El `SplashScreen` muestra la nueva animación vectorial del logo FP en `v2`.
- [ ] Grafo de conocimiento actualizado (`graphify update .`).
