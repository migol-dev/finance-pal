# 📐 Arquitectura & Plan Maestro: Rediseño Integral Finance Pal v2 (Sprint 6: Vistas Secundarias, Pulido Final & Accesibilidad)

> **Fase:** 1 — Planificación y Orquestación Arquitectónica (Sprint 6 - Sprint Final)  
> **Agente Arquitecto:** Antigravity CLI (`agy` — Google Gemini 4 Argon)  
> **Agente Constructor (Fase 2):** Antigravity CLI (`agy` — Google Gemini 3.8 Flash)  
> **Estado:** 🟢 LISTO PARA CONSTRUCCIÓN  
> **Fecha:** 2026-10-24  
> **Rama / Worktree Principal:** `redesign/ui-v2` (bloqueada con `pushRemote = no_push`)  
> **Worktree Destino del Constructor:** `.worktrees/builder` (`builder/ui-v2-sprint-6`)

---

## 1. Resumen Ejecutivo del Sprint 6

Habiendo alcanzado 235+ pruebas unitarias e integración en verde con 100% de éxito en los Sprints 1 a 5, el **Sprint 6** culmina el rediseño integral de Finance Pal completando las vistas secundarias clave:
1. **`AnualV2` (Resumen Anual & Análisis Macroeconómico)**
2. **`HistorialV2` (Auditoría de Cambios & Eventos)**
3. **`AjustesV2` (Hub & Navegación Master-Detail de Configuración)**
4. **`LoginV2` (Autenticación Editorial, Seguridad Robusta & MFA)**

### Requerimiento Fundamental de Rendimiento
> *"Solo un cambio de estilo pero debe de estar excesivamente optimizado para evitar que la web y la aplicacion se vean ralentizadas."*
- Cero sobrecarga de CPU por partículas o efectos de renderizado continuo.
- Memoización estricta (`useMemo`, `useCallback`, `memo`) para evitar recomputaciones innecesarias de series anuales o historiales.
- Paginación incremental y disclosure progresivo para listas de eventos.
- Transiciones CSS aceleradas por GPU respetando `prefers-reduced-motion`.

---

## 2. Razonamiento de Diseño Obligatorio (`frontend-ui-craft`)

1. **Intención UX y Punto Focal:**
   - **`AnualV2`:**
     - Primeros 3 segundos: Visión holística del año en curso (tasa de ahorro global, neto anual y comparación con el año anterior), con selector ágil de año.
     - Punto Focal Dominante: En PC, arquitectura asimétrica 7/5 donde la columna izquierda (`col-span-7`) despliega la tabla mensual de-boxed con barras de flujo inline y el gráfico `SimpleAreaChart`, y la columna derecha (`col-span-5`) despliega el ranking de categorías y métodos de pago con barras proporcionales.
     - Divulgación Progresiva: Desglose de meses atípicos (mejor neto, peor neto, mayor gasto) y navegación a detalle mensual al hacer clic en un mes.
   - **`HistorialV2`:**
     - Primeros 3 segundos: Línea de tiempo limpia agrupada por días, identificando de inmediato la entidad (Movimiento, Fijo, Meta, Deuda) y la acción (Creado, Editado, Eliminado).
     - Punto Focal Dominante: Buscador reactivo y píldoras de filtro por entidad y acción sin recargar el DOM.
     - Divulgación Progresiva: Diff inline `from -> to` en tipografía monospace tabular con disclosure progresivo ("Ver cambios completos") y paginación incremental ("Cargar más").
   - **`AjustesV2`:**
     - Primeros 3 segundos: Reconocimiento claro del estado de la cuenta, moneda activa y versión de interfaz activa (`v2` vs `classic`).
     - Punto Focal Dominante: En PC, layout Master-Detail (`col-span-4` índice sticky con coordenadas de diseño `01 / PERFIL`, `02 / CUENTAS`... + `col-span-8` área de trabajo de la sección activa). En móvil, navegación fluida de-boxed con retorno instantáneo.
   - **`LoginV2`:**
     - Primeros 3 segundos: Identidad editorial sobria y confiable con el nuevo monograma `BrandLogo`, eliminando partículas flotantes pesadas que saturan el hilo de animación.
     - Punto Focal Dominante: Layout asimétrico 5/7 en pantallas grandes (5 columnas para narrativa de marca y seguridad + 7 columnas para formulario directo sobre lienzo abierto con bordes hairline).
     - Divulgación Progresiva: Medidor fino y no invasivo de robustez de contraseña durante el registro, pantalla de verificación 2FA TOTP con input numérico estilizado.

2. **Dirección Estética y Paleta a Medida (Warm Editorial Wealth):**
   - **Canvas Background:** `#FAF8F5` (Warm Alabaster) / `#0C0C0B` (Obsidian).
   - **Elevated Surface:** `#F2EFE9` (Oat) o `rgba(255,255,255,0.03)` con bordes hairline.
   - **Primary Ink:** `#191918` (Espresso Charcoal) / `#EDEDED` (Soft Chalk).
   - **Muted Ink:** `#6E6A63` (Warm Stone) / `#8E8D8A` (Muted Zinc).
   - **Hairline Border:** `#E4E0D8` (1px) / `rgba(255,255,255,0.08)` (1px).
   - **Intentional Accent:** Esmeralda `#1F7A5A` (ingresos y ahorro), Terracota `#C86446` (gastos y deudas), Cobalto `#2383E2` (cuentas e interacciones clave), Ámbar `#D9730D` (alertas y ritmo).

3. **Sistema Tipográfico:**
   - Display & Cabeceras: `'Fraunces'` (`font-display-v2`, `tracking-[-0.03em]`, `leading-tight`).
   - UI Body & Textos de control: `'Plus Jakarta Sans'` (`font-sans`).
   - Cifras monetarias, tasas, diffs de cambios y códigos: `'JetBrains Mono'` (`font-mono-tabular`, `tabular-nums`).

4. **Arquitectura Espacial e Interacción:**
   - Cero Card-itis: 60%+ de espacio apoyado directamente en el lienzo.
   - Asimetría calculada 7/5 en Anual y 5/7 en Login; Master-Detail 4/8 en Ajustes PC.
   - Micro-física táctil `active:scale-[0.98]` con curvas cúbicas de desaceleración elástica.

---

## 3. Mapa de Archivos e Impacto (Sprint 6)

| Acción | Archivo | Responsabilidad |
| :--- | :--- | :--- |
| `CREAR` | `src/pages/AnualClassic.tsx` | Extracción intacta de la vista anual histórica para retrocompatibilidad. |
| `MODIFICAR` | `src/pages/Anual.tsx` | Despachador dual inteligente (`uiVersion === "v2"` -> `AnualV2`, `"classic"` -> `AnualClassic`). |
| `CREAR` | `src/components/anual/AnualV2.tsx` | Resumen anual de alto rendimiento con héroe editorial, tabla hairline 7/5 y SimpleAreaChart de-boxed. |
| `CREAR` | `src/pages/HistorialClassic.tsx` | Extracción intacta del historial histórico. |
| `MODIFICAR` | `src/pages/Historial.tsx` | Despachador dual inteligente (`uiVersion === "v2"` -> `HistorialV2`, `"classic"` -> `HistorialClassic`). |
| `CREAR` | `src/components/historial/HistorialV2.tsx` | Historial de-boxed con agrupación por día, filtros reactivos, diffs tabulares y paginación incremental. |
| `CREAR` | `src/pages/AjustesClassic.tsx` | Extracción intacta del hub de ajustes clásico. |
| `MODIFICAR` | `src/pages/Ajustes.tsx` | Despachador dual inteligente (`uiVersion === "v2"` -> `AjustesV2`, `"classic"` -> `AjustesClassic`). |
| `CREAR` | `src/pages/ajustes/AjustesV2.tsx` | Ajustes v2 con arquitectura Master-Detail 4/8 en PC y navegación ágil de-boxed en móvil. |
| `CREAR` | `src/pages/login/auth-helpers.ts` | Módulo compartido de validación de redirecciones, sanitización de errores y cálculo de contraseña. |
| `CREAR` | `src/pages/LoginClassic.tsx` | Extracción intacta del Login clásico para retrocompatibilidad. |
| `MODIFICAR` | `src/pages/Login.tsx` | Despachador dual inteligente (`uiVersion === "v2"` -> `LoginV2`, `"classic"` -> `LoginClassic`). |
| `CREAR` | `src/pages/LoginV2.tsx` | Login editorial de alto rendimiento, asimétrico 5/7, sin partículas pesadas, soporte OAuth y MFA 2FA. |
| `CREAR` | `src/test/ui-version-secondary.test.tsx` | Suite exhaustiva de pruebas para vistas secundarias, despachadores, preservación de snapshots y flujos. |

---

## 4. Tareas Secuenciales para el Constructor (Fase 2)

- **F6.1:** Extracción defensiva y despachador dual de `Anual` (`AnualClassic.tsx` + `Anual.tsx`).
- **F6.2:** Implementación de `AnualV2.tsx` (Warm Editorial Wealth, asimetría 7/5, de-boxed, rendimiento optimizado).
- **F6.3:** Extracción defensiva y despachador dual de `Historial` (`HistorialClassic.tsx` + `Historial.tsx`).
- **F6.4:** Implementación de `HistorialV2.tsx` (agrupación por día, filtros reactivos, diffs tabulares, paginación incremental).
- **F6.5:** Extracción defensiva y despachador dual de `Ajustes` (`AjustesClassic.tsx` + `Ajustes.tsx` + `AjustesV2.tsx` con Master-Detail 4/8 y optimización de piel).
- **F6.6:** Extracción defensiva de `Login`, módulo `auth-helpers.ts`, despachador dual y desarrollo de `LoginV2.tsx` (asimétrico 5/7, alta eficiencia).
- **F6.7:** Suite de pruebas automatizadas `src/test/ui-version-secondary.test.tsx` cubriendo las 4 vistas, despachadores, snapshots y flujos interactivos.
- **F6.8:** Verificación integral (`npx tsc --noEmit`, `npx vitest run`, `npm run lint`, `npm run build`), actualización de grafo (`graphify update .`) y reporte final.
