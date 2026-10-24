# 📐 Arquitectura & Plan Maestro: Rediseño Integral Finance Pal v2 (Sprint 3: Dashboard Principal v2 — Warm Editorial Wealth)

> **Fase:** 1 — Planificación y Orquestación Arquitectónica (Sprint 3)  
> **Agente Arquitecto:** Antigravity CLI (`agy` — Google Gemini 4 Argon)  
> **Agente Constructor (Fase 2):** Antigravity CLI (`agy` — Google Gemini 3.8 Flash)  
> **Estado:** 🟢 LISTO PARA CONSTRUCCIÓN  
> **Fecha:** 2026-10-24  
> **Rama / Worktree Principal:** `redesign/ui-v2` (bloqueada con `pushRemote = no_push`)  
> **Worktree Destino del Constructor:** `.worktrees/builder` (`builder/ui-v2-sprint-3`)

---

## 1. Resumen Ejecutivo del Sprint 3

En los sprints previos sentamos la identidad visual (Sprint 1: Tokens Warm Editorial, Monograma vectorial FP animado, conmutador dual) y la columna vertebral de interacción (Sprint 2: BottomNavV2 con botón central `+`, DesktopSidebarV2 colapsable con rail mode, QuickTransactionSheet drawer y CommandPalette ⌘K).

En este **Sprint 3**, rediseñamos la pantalla neurálgica de la aplicación: el **Dashboard Principal (`DashboardV2`)**.

Objetivos clave:
1. **Escenario Principal de Patrimonio Neto (*Warm Editorial Wealth*):**
   - Presentación clara y sofisticada del patrimonio neto acumulado (`cumulativeNet`).
   - Variación mensual absoluta (`+/- $X,XXX.XX`) y porcentual (`+/- X.X%`).
   - Desglose de activos líquidos (bancos, efectivo, metas ahorradas) vs pasivos (deudas pendientes de saldar, compromisos u obligaciones fijas).
   - Tipografía editorial `Fraunces` (`font-display-v2`) para cabeceras y `JetBrains Mono` (`font-mono-tabular` con `tabular-nums`) para todas las magnitudes financieras.
   - Modo de privacidad ("ocultar saldos" con persistencia local por sesión).
2. **Arquitectura Espacial Asimétrica en Escritorio:**
   - En PC (`lg:`), layout de 12 columnas:
     - `col-span-7`: Escenario de patrimonio neto, gráfico/indicador de flujo mensual (ingresos vs gastos y tasa de ahorro) y lista refinada de movimientos recientes.
     - `col-span-5`: Acciones rápidas ("+ Gasto" / "+ Ingreso" que activan `QuickTransactionSheet` vía `useQuickTxModal`), meta principal destacada con progreso tabular, y próximos pagos fijos organizados cronológicamente (`en Xd`).
3. **De-boxing Estricto (Anti-AI Law 1 - Cero "Card-itis"):**
   - Al menos 60% del contenido se apoya directamente sobre el canvas de fondo (`bg-background`).
   - Eliminación de cajitas cerradas con sombras pesadas por cada métrica individual.
   - Separación arquitectónica con divisores hairline de 1px (`#E4E0D8` en claro / `rgba(255,255,255,0.08)` en oscuro).
   - Micro-física táctil fluida (`active:scale-[0.98] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]`).
4. **Montaje Dual Transparente:**
   - Conmutación limpia: Si `uiVersion === "v2"`, se renderiza `DashboardV2`.
   - Si `uiVersion === "classic"`, se conserva intacto `DashboardClassic` (preservando el 100% de los snapshots y pruebas existentes).
   - Acceso a datos exclusivamente a través de la fachada Local-First `useFinanceData`.

---

## 2. Razonamiento de Diseño Obligatorio (`frontend-ui-craft`)

1. **Intención UX y Punto Focal:**
   - **Primeros 3 segundos:** El usuario comprende de un vistazo su **Patrimonio Neto real**, el flujo neto del mes en curso y los días que faltan para sus siguientes pagos.
   - **Punto Focal Dominante:** El *Escenario Editorial de Patrimonio Neto*, un área abierta con tipografía display `Fraunces` de alto calibre estético, contraste sobrio y números en `JetBrains Mono` con espaciado tabular para evitar saltos de layout.
   - **Divulgación Progresiva:** El detalle minucioso de transacciones, cuentas específicas y desglose por categorías se revela con enlaces directos (`/movimientos`, `/anual`, `/deudas`, `/metas`), mientras que el registro inmediato se resuelve con los botones táctiles o <kbd>⌘K</kbd>.
2. **Dirección Estética y Paleta a Medida (Warm Editorial Wealth):**
   - **Canvas Background:** `#FAF8F5` (Warm Alabaster) en modo claro / `#0C0C0B` (Obsidian) en modo oscuro.
   - **Elevated Surface:** `#F2EFE9` (Oat) o tintado sutil `rgba(255,255,255,0.03)` con bordes ultrafinos en oscuro.
   - **Primary Ink:** `#191918` (Espresso Charcoal) / `#EDEDED` (Soft Chalk).
   - **Muted Ink:** `#6E6A63` (Warm Stone) / `#8E8D8A` (Muted Zinc).
   - **Hairline Border:** `#E4E0D8` (1px) en claro / `rgba(255,255,255,0.08)` en oscuro.
   - **Intentional Accent:** Botanical Emerald (`#1F7A5A` / `hsl(var(--primary))`) para ingresos, balances positivos y progreso de metas; Terracotta / Crimson (`hsl(var(--destructive))` / `#C86446`) para egresos o pasivos.
3. **Sistema Tipográfico:**
   - Display / Títulos editoriales: `'Fraunces'` (`font-display-v2`, `tracking-[-0.035em]`, `leading-tight`).
   - UI Body & Etiquetas: `'Plus Jakarta Sans'` (`font-sans`, `tracking-[-0.01em]`).
   - Métricas, cifras monetarias y porcentajes: `'JetBrains Mono'` (`font-mono-tabular`, `font-variant-numeric: tabular-nums`).
4. **Arquitectura Espacial y Micro-física:**
   - Cero Card-itis: Espaciado vertical holgado (`space-y-6 lg:space-y-8`), líneas de corte nítidas de 1px.
   - Composición asimétrica `col-span-7` / `col-span-5` en desktop.
   - Micro-física táctil en botones de acción y listas: `active:scale-[0.98]` con transición desacelerada elástica.
   - Lucide Icons con trazo refinado: `strokeWidth={1.5}` o `1.75`.

---

## 3. Alineación Arquitectónica (Local-First & useFinanceData)

- Consumo integral y unificado vía `useFinanceData()`:
  - `accounts`, `transactions`, `fixedItems`, `goals`, `debts`, `activeYear`, `activeMonth`, `profile`, `ensureScheduledTransactions`, `appSettings`.
- Disparo de nuevo gasto o ingreso conectado al store en memoria `useQuickTxModal` de Sprint 2 (`openQuickTx("expense")`, `openQuickTx("income")`).
- Los cálculos financieros de balances, acumulados y próximas ocurrencias se memorizan con `useMemo` para evitar recomputaciones innecesarias durante la navegación.
- Cero acoplamiento a llamadas de red directas o librerías externas pesadas.

---

## 4. Mapa de Archivos e Impacto (Sprint 3)

| Acción | Archivo | Responsabilidad |
| :--- | :--- | :--- |
| `CREAR` | `src/pages/DashboardClassic.tsx` | Extracción intacta del Dashboard clásico original para garantizar preservación del modo `classic` y snapshots. |
| `CREAR` | `src/components/dashboard/DashboardV2.tsx` | Componente de Dashboard v2 con arquitectura Warm Editorial Wealth, de-boxing, layout asimétrico 12 columnas y métricas tabulares. |
| `MODIFICAR` | `src/pages/Dashboard.tsx` | Despachador dual inteligente: renderiza `DashboardV2` cuando `uiVersion === "v2"` y `DashboardClassic` cuando `uiVersion === "classic"`. |
| `CREAR` | `src/test/ui-version-dashboard.test.tsx` | Suite de pruebas exhaustivas para `DashboardV2` (cálculos de patrimonio, activos vs pasivos, ocultar saldos, variación mensual, y alternancia de versión). |

---

## 5. Tareas Secuenciales para el Constructor (Fase 2)

- **F3.1:** Extraer `DashboardClassic.tsx` preservando su implementación original y configurar el despachador condicional en `Dashboard.tsx`.
- **F3.2:** Implementar `DashboardV2.tsx` con el Escenario Principal de Patrimonio Neto (*Warm Editorial Wealth*), variación mensual (absoluta y porcentual), activos vs pasivos y control de privacidad (ojo de ocultar saldos).
- **F3.3:** Implementar el layout asimétrico (`col-span-7` flujo y transacciones recientes, `col-span-5` acciones rápidas vía `useQuickTxModal`, meta principal y próximos pagos).
- **F3.4:** Aplicar de-boxing riguroso (60% canvas), divisores hairline de 1px, tipografía `Fraunces` + `JetBrains Mono` con `tabular-nums` y micro-física táctil.
- **F3.5:** Crear la suite de pruebas automatizadas `src/test/ui-version-dashboard.test.tsx`.
- **F3.6:** Validar suite completa (`npx tsc --noEmit`, `npx vitest run`, `npm run lint`), actualizar el grafo de conocimiento (`graphify update .`) y registrar checkpoints.
