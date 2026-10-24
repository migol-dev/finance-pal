# 📐 Arquitectura & Plan Maestro: Rediseño Integral Finance Pal v2 (Sprint 4: Movimientos y Transacciones v2 — Warm Editorial Wealth & Master-Detail)

> **Fase:** 1 — Planificación y Orquestación Arquitectónica (Sprint 4)  
> **Agente Arquitecto:** Antigravity CLI (`agy` — Google Gemini 4 Argon)  
> **Agente Constructor (Fase 2):** Antigravity CLI (`agy` — Google Gemini 3.8 Flash)  
> **Estado:** 🟢 LISTO PARA CONSTRUCCIÓN  
> **Fecha:** 2026-10-24  
> **Rama / Worktree Principal:** `redesign/ui-v2` (bloqueada con `pushRemote = no_push`)  
> **Worktree Destino del Constructor:** `.worktrees/builder` (`builder/ui-v2-sprint-4`)

---

## 1. Resumen Ejecutivo del Sprint 4

Tras haber establecido la identidad de diseño (Sprint 1), los pilares de navegación e ingreso rápido (Sprint 2) y el Escenario de Patrimonio Neto en el Dashboard (Sprint 3), el **Sprint 4** aborda la pantalla de mayor densidad operativa y frecuencia de uso: **Movimientos y Transacciones (`MovimientosV2`)**.

Objetivos clave:
1. **Extracción Defensiva y Despachador Dual:**
   - Extracción completa del código histórico actual a `src/pages/MovimientosClassic.tsx`.
   - Implementación del despachador dual en `src/pages/Movimientos.tsx`: si `uiVersion === "v2"` renderiza `MovimientosV2`, si es `"classic"` renderiza `MovimientosClassic` (preservando el 100% de compatibilidad con snapshots preexistentes y modo clásico).
2. **Feed Cronológico Agrupado con Subtotales Diarios:**
   - Agrupación cronológica por fecha (día).
   - Cabeceras de sección por día que muestran la fecha y el **subtotal neto del día** (balance neto diario entre ingresos y gastos) en `JetBrains Mono` (`font-mono-tabular` con `tabular-nums`), con indicador cromático de flujo (verde positivo, terracota/rojo negativo, neutro en balance cero).
3. **Filtros Contextuales De-boxed (Anti-AI Law 1 & 2):**
   - Píldoras horizontales de desplazamiento fluido (*smooth pills*) para conmutar Tipo (Todos / Gastos / Ingresos / Ahorros / Traspasos), Cuenta bancaria/efectivo, Categoría y Presets de fecha (Hoy, Ayer, 7d, 30d, Mes).
   - Búsqueda en tiempo real por concepto, categoría o método de pago con botón de limpieza instantánea.
   - Cero cajas cerradas o tarjetas pesadas invasivas; integración natural sobre el lienzo de fondo con bordes hairline de 1px.
4. **Arquitectura Espacial Master-Detail en Escritorio (`lg:`):**
   - Layout de 12 columnas en pantallas grandes:
     - `col-span-7`: Feed cronológico de transacciones con selección activa interactiva.
     - `col-span-5`: Panel lateral inspector/editor en vivo fijo (sticky) que permite inspeccionar la transacción seleccionada, editar sus valores (monto, concepto, categoría, cuenta, fecha, notas, beneficiario) o eliminarla con confirmación sin tapar la lista cronológica ni perder el contexto de lectura.
     - Estado inicial/vacío refinado en el panel inspector cuando no hay transacción seleccionada ("Selecciona una transacción para inspeccionar o editar").
5. **Experiencia Móvil Nativa con Drawer Deslizante (`vaul`):**
   - En pantallas móviles (`< lg`), tap sobre cualquier transacción abre un Drawer inferior suave (`vaul` / `src/components/ui/drawer.tsx`) con los detalles completos y formulario de edición/eliminación en vivo.
6. **Estética Warm Editorial Wealth:**
   - Fondo Alabaster `#FAF8F5` en modo claro / Obsidian `#0C0C0B` en modo oscuro.
   - Títulos en tipografía editorial `Fraunces` (`font-display-v2`).
   - Magnitudes numéricas y subtotales en `JetBrains Mono` (`font-mono-tabular` con `tabular-nums`).
   - Divisores hairline de 1px (`#E4E0D8` / `rgba(255,255,255,0.08)`).
   - Iconos Lucide estilizados con trazo fino (`strokeWidth={1.5}` o `1.75`).
7. **Integración Local-First:**
   - Consumo riguroso mediante la fachada unificada `useFinanceData()` (`transactions`, `accounts`, `debts`, `activeYear`, `activeMonth`, `addTx`, `updateTx`, `removeTx`, etc.).

---

## 2. Razonamiento de Diseño Obligatorio (`frontend-ui-craft`)

1. **Intención UX y Punto Focal:**
   - **Primeros 3 segundos:** El usuario ubica inmediatamente los movimientos del mes, su subtotal neto del día y puede filtrar o buscar con un solo tap en las píldoras superiores.
   - **Punto Focal Dominante:** En PC, la interacción bidireccional entre la lista cronológica agrupada (`col-span-7`) y el inspector activo (`col-span-5`). En móvil, la lista táctil y el drawer de edición inferior contextual.
   - **Divulgación Progresiva:** Los datos técnicos secundarios (CLABE, cuenta destino, notas extensas, imagen del comprobante de transferencia y botones de acción destructiva) se exhiben en el panel inspector o drawer, dejando la lista principal limpia, escaneable y ágil.
2. **Dirección Estética y Paleta a Medida (Warm Editorial Wealth):**
   - **Canvas Background:** `#FAF8F5` (Warm Alabaster) / `#0C0C0B` (Obsidian).
   - **Elevated Surface:** `#F2EFE9` (Oat) o `rgba(255,255,255,0.03)` con bordes hairline.
   - **Primary Ink:** `#191918` (Espresso Charcoal) / `#EDEDED` (Soft Chalk).
   - **Muted Ink:** `#6E6A63` (Warm Stone) / `#8E8D8A` (Muted Zinc).
   - **Hairline Border:** `#E4E0D8` (1px) / `rgba(255,255,255,0.08)` (1px).
   - **Intentional Accent:** Emerald `#1F7A5A` para ingresos y balances netos positivos; Terracotta `#C86446` para gastos y balances negativos; Cobalt `#2383E2` para transferencias entre cuentas.
3. **Sistema Tipográfico:**
   - Display & Cabeceras: `'Fraunces'` (`font-display-v2`, `tracking-[-0.03em]`, `leading-tight`).
   - UI Body & Textos de control: `'Plus Jakarta Sans'` (`font-sans`).
   - Cifras monetarias, subtotales diarios y fechas tabulares: `'JetBrains Mono'` (`font-mono-tabular`, `font-variant-numeric: tabular-nums`).
4. **Arquitectura Espacial e Interacción:**
   - Cero Card-itis: 60%+ de espacio apoyado directamente en el lienzo.
   - Líneas de separación hairline de 1px entre transacciones y cabeceras de días.
   - Asimetría calculada 7/5 en escritorio para master-detail sin oclusiones modales.
   - Micro-física táctil `active:scale-[0.98]` con curvas cúbicas de desaceleración elástica.

---

## 3. Mapa de Archivos e Impacto (Sprint 4)

| Acción | Archivo | Responsabilidad |
| :--- | :--- | :--- |
| `CREAR` | `src/pages/MovimientosClassic.tsx` | Extracción intacta de la página de movimientos actual para preservar el modo clásico y snapshots. |
| `CREAR` | `src/components/movimientos/MovimientosV2.tsx` | Componente de Movimientos v2 con feed cronológico agrupado, subtotales diarios tabulares, filtros de-boxed, arquitectura Master-Detail en PC y Drawer móvil `vaul`. |
| `MODIFICAR` | `src/pages/Movimientos.tsx` | Despachador dual inteligente: renderiza `MovimientosV2` en `v2` y `MovimientosClassic` en `classic`. |
| `CREAR` | `src/test/ui-version-movimientos.test.tsx` | Suite exhaustiva de pruebas unitarias y de integración para `MovimientosV2` (despachador dual, agrupación por días, subtotales, filtros, selección master-detail, edición y borrado). |

---

## 4. Tareas Secuenciales para el Constructor (Fase 2)

- **F4.1:** Extraer `src/pages/MovimientosClassic.tsx` y configurar el despachador dual condicional en `src/pages/Movimientos.tsx`.
- **F4.2:** Implementar la lógica de agrupación cronológica por días y cálculo de subtotales netos diarios en `JetBrains Mono` con `tabular-nums`.
- **F4.3:** Implementar la barra de filtros contextuales *de-boxed* (smooth pills horizontales para tipo, cuenta, categoría, fechas y buscador reactivo).
- **F4.4:** Implementar la arquitectura espacial Master-Detail en PC (`col-span-7` lista + `col-span-5` inspector/editor en vivo) y Drawer inferior (`vaul`) en móvil.
- **F4.5:** Desarrollar la suite de pruebas automatizadas `src/test/ui-version-movimientos.test.tsx`.
- **F4.6:** Verificación integral (`npx tsc --noEmit`, `npx vitest run`, `npm run lint`), actualización del grafo (`graphify update .`) y registro de checkpoints.
