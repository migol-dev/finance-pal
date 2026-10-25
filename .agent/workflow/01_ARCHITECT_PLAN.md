# 📐 Arquitectura & Plan Maestro: Rediseño Integral Finance Pal v2 (Sprint 5: Deudas y Metas v2 — Warm Editorial Wealth & Master-Detail)

> **Fase:** 1 — Planificación y Orquestación Arquitectónica (Sprint 5)  
> **Agente Arquitecto:** Antigravity CLI (`agy` — Google Gemini 4 Argon)  
> **Agente Constructor (Fase 2):** Antigravity CLI (`agy` — Google Gemini 3.8 Flash)  
> **Estado:** 🟢 LISTO PARA CONSTRUCCIÓN  
> **Fecha:** 2026-10-24  
> **Rama / Worktree Principal:** `redesign/ui-v2` (bloqueada con `pushRemote = no_push`)  
> **Worktree Destino del Constructor:** `.worktrees/builder` (`builder/ui-v2-sprint-5`)

---

## 1. Resumen Ejecutivo del Sprint 5

Tras haber completado con éxito la base visual (Sprint 1), el flujo de captura rápida (Sprint 2), el patrimonio neto del Dashboard (Sprint 3) y el feed con subtotales de Movimientos (Sprint 4), el **Sprint 5** moderniza los dos módulos de seguimiento financiero a mediano y largo plazo: **Deudas (`DeudasV2`)** y **Metas de Ahorro (`MetasV2`)**.

Objetivos clave:
1. **Extracción Defensiva y Despachadores Duales:**
   - Extracción de `src/pages/Deudas.tsx` -> `src/pages/DeudasClassic.tsx`.
   - Extracción de `src/pages/Metas.tsx` -> `src/pages/MetasClassic.tsx`.
   - Despachadores duales en `src/pages/Deudas.tsx` y `src/pages/Metas.tsx`: renderizan `DeudasV2` y `MetasV2` si `uiVersion === "v2"`, o la versión clásica si es `"classic"` (o si `appSettings` es indefinido en tests legacy).
2. **DeudasV2 (Amortización, Dirección y Master-Detail):**
   - Distinción visual y filtro para **"Me deben"** (préstamos que otorgué / por cobrar) vs **"Yo debo"** (deudas contraídas / por pagar).
   - Barra de progreso de amortización y porcentaje de liquidación por deuda.
   - Totales globales de deuda (prestado, cobrado, pendiente por cobrar, deuda contraída, abonado, pendiente por pagar y balance neto).
   - Historial cronológico de abonos con tipografía tabular `JetBrains Mono` (`font-mono-tabular` con `tabular-nums`).
   - Registro ágil de abonos/préstamos con soporte de comprobantes, cuentas y métodos de pago.
   - Arquitectura espacial Master-Detail en PC (`col-span-7` lista de deudas + `col-span-5` inspector/abonos sticky) y Drawer táctil en móvil (`vaul`).
   - Soporte para navegación con query param `?id=<debtId>` desde `MovimientosV2`.
3. **MetasV2 (Hitos, Ritmo de Ahorro y Aportaciones Ágiles):**
   - Visualización de hitos (*milestones* 25%, 50%, 75%, 100%) alcanzados y próximos.
   - Cálculo y visualización en tiempo real del **ritmo mensual requerido** (`paceForGoal`) en `JetBrains Mono`.
   - Soporte nativo a carpetas y subcarpetas organizadoras de metas con chips y contadores.
   - Aportaciones ágiles directas sin modales invasivos (+100, +250, +500, +1000 o monto libre) desde el panel inspector y drawer táctil.
   - Arquitectura espacial Master-Detail en PC (`col-span-7` metas + `col-span-5` detalle/aportes sticky) y Drawer táctil en móvil (`vaul`).
4. **Estética Warm Editorial Wealth & Anti-AI Design Laws:**
   - Lienzo Alabaster `#FAF8F5` en modo claro / Obsidian `#0C0C0B` en modo oscuro.
   - Tipografía editorial `Fraunces` para títulos y nombres, `Plus Jakarta Sans` para controles y cuerpo, y `JetBrains Mono` para cifras, fechas y porcentajes.
   - Bordes hairline de 1px (`#E4E0D8` / `border-white/10`) y cero card-itis.
5. **Consumo Exclusivo vía `useFinanceData()`:**
   - Acceso riguroso a la fachada unificada Local-First.

---

## 2. Razonamiento de Diseño Obligatorio (`frontend-ui-craft`)

1. **Intención UX y Punto Focal:**
   - **DeudasV2:**
     - Primeros 3 segundos: El usuario visualiza su balance neto de deudas y la salud de sus cuentas por cobrar vs por pagar, con píldoras fluidas para alternar entre "Todas", "Me deben" y "Yo debo", así como estado "Pendientes" vs "Saldadas".
     - Punto Focal Dominante: En PC, el layout asimétrico Master-Detail 7/5 donde la lista izquierda expone el estado de amortización y la columna derecha fija permite registrar abonos y consultar el historial sin perder el contexto. En móvil, Drawer suave `vaul`.
     - Divulgación Progresiva: Datos de CLABE, comprobantes de pago y notas extensas se mantienen en el inspector/drawer secundario.
   - **MetasV2:**
     - Primeros 3 segundos: Progreso global de ahorro, avance porcentual hacia sueños financieros y ritmo mensual requerido para cada meta.
     - Punto Focal Dominante: En PC, la sincronización entre el catálogo de metas agrupadas por carpetas (`col-span-7`) y el inspector analítico con aportación instantánea de un toque (`col-span-5`). En móvil, Drawer contextual de ahorro.
     - Divulgación Progresiva: Hitos históricos, ritmo diario/semanal y URLs de compra se inspeccionan en el panel lateral o drawer.
2. **Dirección Estética y Paleta a Medida (Warm Editorial Wealth):**
   - **Canvas Background:** `#FAF8F5` (Warm Alabaster) / `#0C0C0B` (Obsidian).
   - **Elevated Surface:** `#F2EFE9` (Oat) o `rgba(255,255,255,0.03)` con bordes hairline.
   - **Primary Ink:** `#191918` (Espresso Charcoal) / `#EDEDED` (Soft Chalk).
   - **Muted Ink:** `#6E6A63` (Warm Stone) / `#8E8D8A` (Muted Zinc).
   - **Hairline Border:** `#E4E0D8` (1px) / `rgba(255,255,255,0.08)` (1px).
   - **Intentional Accent:** Emerald `#1F7A5A` para saldado/ahorro completado; Terracotta `#C86446` para deudas pendientes/por pagar; Cobalt `#2383E2` para aportaciones e interacción bancaria; Amber `#D9730D` para ritmo y alertas de vencimiento.
3. **Sistema Tipográfico:**
   - Display & Cabeceras: `'Fraunces'` (`font-display-v2`, `tracking-[-0.03em]`, `leading-tight`).
   - UI Body & Textos de control: `'Plus Jakarta Sans'` (`font-sans`).
   - Cifras monetarias, amortizaciones, ritmo y porcentajes tabulares: `'JetBrains Mono'` (`font-mono-tabular`, `font-variant-numeric: tabular-nums`).
4. **Arquitectura Espacial e Interacción:**
   - Cero Card-itis: 60%+ de espacio apoyado directamente en el lienzo.
   - Asimetría calculada 7/5 en escritorio para master-detail sin oclusiones modales.
   - Drawer inferior táctil (`vaul`) en móvil.
   - Micro-física táctil `active:scale-[0.98]` con curvas cúbicas de desaceleración elástica.

---

## 3. Mapa de Archivos e Impacto (Sprint 5)

| Acción | Archivo | Responsabilidad |
| :--- | :--- | :--- |
| `CREAR` | `src/pages/DeudasClassic.tsx` | Extracción intacta de la página de deudas actual para preservar el modo clásico y snapshots. |
| `CREAR` | `src/pages/MetasClassic.tsx` | Extracción intacta de la página de metas actual para preservar el modo clásico y snapshots. |
| `CREAR` | `src/components/deudas/DeudasV2.tsx` | Componente de Deudas v2 con distinción "yo debo" vs "me deben", amortización, Master-Detail 7/5, Drawer `vaul` y abonos ágiles. |
| `CREAR` | `src/components/metas/MetasV2.tsx` | Componente de Metas v2 con hitos, ritmo mensual requerido, soporte a carpetas organizadoras, aportaciones rápidas sin modales y Master-Detail. |
| `MODIFICAR` | `src/pages/Deudas.tsx` | Despachador dual inteligente: renderiza `DeudasV2` en `v2` y `DeudasClassic` en `classic`. |
| `MODIFICAR` | `src/pages/Metas.tsx` | Despachador dual inteligente: renderiza `MetasV2` en `v2` y `MetasClassic` en `classic`. |
| `MODIFICAR` | `src/lib/finance.ts` | Extensión opcional de la interfaz `Debt` con `type?: "me_deben" | "yo_debo"`. |
| `MODIFICAR` | `src/lib/validators.ts` | Actualización de `debtSchema` con `type: z.enum(["me_deben", "yo_debo"]).optional()`. |
| `CREAR` | `src/test/ui-version-deudas-metas.test.tsx` | Suite exhaustiva de pruebas unitarias y de integración para `DeudasV2` y `MetasV2`. |

---

## 4. Tareas Secuenciales para el Constructor (Fase 2)

- **F5.1:** Extraer `src/pages/DeudasClassic.tsx` y `src/pages/MetasClassic.tsx`. Configurar despachadores duales condicionales en `src/pages/Deudas.tsx` y `src/pages/Metas.tsx`.
- **F5.2:** Implementar el módulo `DeudasV2` con distinción "yo debo" vs "me deben", barras de amortización, totales globales de balance y registro de préstamos/deudas.
- **F5.3:** Implementar en `DeudasV2` la arquitectura Master-Detail en PC (`col-span-7` lista + `col-span-5` inspector/abonos) y Drawer móvil (`vaul`), con historial de pagos en `JetBrains Mono` y abonos rápidos.
- **F5.4:** Implementar el módulo `MetasV2` con visualización de hitos (25%, 50%, 75%, 100%), ritmo mensual requerido (`paceForGoal`), soporte a carpetas organizadoras y Master-Detail con aportaciones ágiles.
- **F5.5:** Desarrollar la suite de pruebas automatizadas `src/test/ui-version-deudas-metas.test.tsx`.
- **F5.6:** Verificación integral (`npx tsc --noEmit`, `npx vitest run`, `npm run lint`), actualización del grafo (`graphify update .`) y registro de checkpoints.
