# 📐 Arquitectura & Plan Maestro: Rediseño Integral Finance Pal v2 (Sprint 2: Navegación Ergonómica, AppShell v2, Quick Transaction Sheet y Command Palette)

> **Fase:** 1 — Planificación y Orquestación Arquitectónica (Sprint 2)  
> **Agente Arquitecto:** Antigravity CLI (`agy` — Google Gemini 4 Argon)  
> **Agente Constructor (Fase 2):** Antigravity CLI (`agy` — Google Gemini 3.8 Flash)  
> **Estado:** 🟢 LISTO PARA CONSTRUCCIÓN  
> **Fecha:** 2026-10-24  
> **Rama / Worktree Principal:** `redesign/ui-v2` (bloqueada con `pushRemote = no_push`)  
> **Worktree Destino del Constructor:** `.worktrees/builder` (`builder/ui-v2-sprint-2`)

---

## 1. Resumen Ejecutivo del Sprint 2

En el Sprint 1 completamos la fundación de identidad visual (*Warm Editorial Wealth*), el nuevo monograma vectorial FP en `BrandLogo`, el `SplashScreen` cinemático y el selector dual con conmutador rápido `Alt + D`.

En este **Sprint 2**, modernizamos la columna vertebral de interacción de **Finance Pal**:
1. **`BottomNavV2.tsx` (Móvil):** Dock flotante ergonómico adaptado a una sola mano en pantallas celulares (`360px–430px`) con 4 pestañas directas (`/` Inicio, `/movimientos` Movimientos, `/deudas` Deudas, `/metas` Metas) y un **botón central táctil elevado `(+)`** ("Registrar").
2. **`QuickTransactionSheet.tsx`:** Bottom sheet deslizante táctil (`vaul` / `Drawer`) disparado por el botón central `(+)` o <kbd>⌘K</kbd>, permitiendo capturar un gasto o ingreso en menos de 3 segundos con tipografía grande en `JetBrains Mono` (`tabular-nums`) y conexión a `useFinanceData`.
3. **`DesktopSidebarV2.tsx` (Escritorio):** Barra lateral estilizada con modo colapsable (Rail de 72px vs Expandido de 240px), integración del nuevo `BrandLogo`, gatillo visual de búsqueda rápida (<kbd>⌘K</kbd>), enlaces principales y secundarios (`/anual`, `/historial`, `/ajustes`), selector de tema y estado de sincronización.
4. **`CommandPalette.tsx` (<kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd>):** Buscador y paleta de comandos rápida basada en `cmdk`, con navegación instantánea entre rutas, cambio de tema, alternancia de versión de diseño y acción de nuevo movimiento.
5. **`AppShell.tsx`:** Integración condicional: cuando `uiVersion === "v2"`, se renderiza la suite de navegación v2 con soporte completo de accesibilidad; cuando `uiVersion === "classic"`, se conserva la navegación clásica intacta.

---

## 2. Razonamiento de Diseño Obligatorio (`frontend-ui-craft`)

1. **Intención UX y Punto Focal:**
   - Reducir el tiempo de registro financiero a **menos de 3 segundos** desde cualquier pantalla.
   - En móviles: el pulgar alcanza naturalmente el botón central `(+)` flotante con retroalimentación háptica táctil (`active:scale-95`).
   - En PC: <kbd>⌘K</kbd> (o <kbd>Ctrl+K</kbd>) permite saltar a cualquier módulo o registrar transacciones sin levantar las manos del teclado.
2. **Dirección Estética y Paleta a Medida (Warm Editorial Wealth):**
   - **Canvas Background:** `#FAF8F5` (claro) / `#0C0C0B` (oscuro).
   - **Surface Dock / Sidebar:** `#F2EFE9` con transparencia sutil y desenfoque (`backdrop-blur-md bg-card/85`) / `#141413` en oscuro.
   - **Hairline Dividers:** `1px` crisp border (`#E4E0D8` en claro / `rgba(255,255,255,0.08)` en oscuro).
   - **Acento Central (+):** Gradiente o tono esmeralda botánico `#1F7A5A` (`hsl(var(--primary))`) con brillo sutil y contraste accesible (`text-primary-foreground`).
3. **Sistema Tipográfico:**
   - Display / Branding: `'Fraunces'` (`.font-display-v2`).
   - UI / Navegación: `'Plus Jakarta Sans'`.
   - Montos y atajos de teclado: `'JetBrains Mono'` (`.font-mono-tabular`).
4. **Arquitectura Espacial y Micro-física:**
   - Botón central `(+)` con micro-física de pulsación elástica: `active:scale-90 transition-transform duration-100`.
   - Transiciones de expansión de sidebar: `cubic-bezier(0.22, 1, 0.36, 1)`.
   - Iconografía Lucide proporcional: `strokeWidth={1.5}` o `1.75`, tamaño `w-5 h-5` en móvil y `w-4 h-4` en desktop.

---

## 3. Alineación Arquitectónica (Local-First & useFinanceData)

- Consumo exclusivo de datos a través de `useFinanceData()` (`addTransaction`, `accounts`, `categories`).
- Desacoplamiento del estado modal de Quick Add mediante un hook/store atómico `useQuickTxModal` sin ensuciar la base de datos de Supabase.
- Cero dependencias nuevas: se aprovechan `vaul` y `cmdk` que ya están instaladas en el repositorio.
- Preservación íntegra de la experiencia v1 (`classic`) cuando `uiVersion === "classic"`.

---

## 4. Mapa de Archivos e Impacto (Sprint 2)

| Acción | Archivo | Responsabilidad |
| :--- | :--- | :--- |
| `CREAR` | `src/store/ui-quick-tx-store.ts` | Store atómico Zustand en memoria para controlar la apertura de `QuickTransactionSheet` (`isOpen`, `openQuickTx`, `closeQuickTx`). |
| `CREAR` | `src/components/app/CommandPalette.tsx` | Paleta de comandos <kbd>⌘K</kbd> con navegación difusa y acciones rápidas. |
| `CREAR` | `src/components/app/QuickTransactionSheet.tsx` | Drawer deslizante para registro rápido de transacciones con validación básica y feedback `toast`. |
| `CREAR` | `src/components/app/BottomNavV2.tsx` | Dock móvil flotante con 4 tabs y botón central táctil `(+)`. |
| `CREAR` | `src/components/app/DesktopSidebarV2.tsx` | Sidebar de escritorio colapsable (Rail de 72px ↔ Expandido de 240px). |
| `MODIFICAR` | `src/components/app/AppShell.tsx` | Montaje condicional: en `v2` usa `DesktopSidebarV2`, `BottomNavV2`, `CommandPalette` y `QuickTransactionSheet`. En `classic` mantiene los componentes originales. |
| `CREAR` | `src/test/ui-version-navigation.test.tsx` | Suite de pruebas unitarias y de componentes para la navegación v2, apertura de drawer y paleta de comandos. |

---

## 5. Tareas Secuenciales para el Constructor (Fase 2)

- **F2.1:** Store en memoria `useQuickTxModal` y `CommandPalette.tsx` con atajo <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd>.
- **F2.2:** `QuickTransactionSheet.tsx` integrado con `useFinanceData().addTransaction`.
- **F2.3:** `BottomNavV2.tsx` con disposición ergonómica móvil y botón central `(+)`.
- **F2.4:** `DesktopSidebarV2.tsx` con modo rail colapsable, `⌘K` trigger y nuevo logo.
- **F2.5:** Integración en `src/components/app/AppShell.tsx` respetando `uiVersion`.
- **F2.6:** Pruebas automatizadas en `src/test/ui-version-navigation.test.tsx`.
- **F2.7:** Verificación de tipos (`npx tsc --noEmit`) y ejecución de tests (`npx vitest run`).
