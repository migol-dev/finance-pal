# Plan de acción: adaptación de Finance Pal a pantallas de escritorio

**Repositorio analizado:** `migol-dev/finance-pal`
**Stack confirmado:** React 18 + Vite + TypeScript + Tailwind + shadcn/Radix + Zustand + Framer Motion + Capacitor (Android) + Supabase
**Objetivo:** que la versión web se vea y se sienta como una app de escritorio en pantallas grandes y horizontales, sin modificar la paleta de colores/estilo ni afectar en absoluto la experiencia en Android.

---

## 1. Diagnóstico

La causa raíz no es "falta de responsive" en general, son dos problemas concretos y localizados:

1. **`src/components/app/AppShell.tsx` (línea 93)**: todo el contenido de la app vive dentro de
   `<div className="mx-auto max-w-md min-h-screen pb-28 ...">`.
   `max-w-md` = 448px fijos, centrado. En un monitor de 1920px eso deja ~700px de espacio muerto a cada lado — es literalmente un teléfono flotando en medio de la pantalla.

2. **Cada página** (`Dashboard.tsx`, `Movimientos.tsx`, `Metas.tsx`, `Deudas.tsx`, `Anual.tsx`, `Ajustes.tsx`, `Historial.tsx`) está construida como una sola columna vertical de `<section className="px-5 mt-X">` con `grid-cols-2/3/4` fijos, pensada exclusivamente para 448px de ancho. Solo 12 de 82 archivos `.tsx` usan alguna clase responsive (`sm:`/`md:`/`lg:`), y solo `Movimientos.tsx` tiene un intento parcial (`hidden sm:grid grid-cols-1 sm:grid-cols-2`).

**Buenas noticias encontradas:**
- La paleta y el estilo (`src/index.css`, variables `--primary`, `--background`, gradientes, sombras) están totalmente desacoplados del layout. El rediseño se puede hacer sin tocar un solo color.
- Los modales (`components/ui/dialog.tsx`, Radix) ya hacen `portal` fuera del `max-w-md` y son centrados con `max-w-lg` — ya funcionan razonablemente bien en escritorio.
- Ya existe un hook `useIsMobile()` (`src/hooks/use-mobile.tsx`, umbral 768px) sin usar, y `Capacitor.isNativePlatform()` ya se usa en varios archivos (`AppShell.tsx`, `Movimientos.tsx`, `Ajustes.tsx`, `finance-store.ts`, `encrypted-storage.ts`) — hay precedente en el propio código para extender la detección de plataforma.
- `Login.tsx` y `MigracionNube.tsx` **no** están envueltos por `AppShell` y ya tienen su propia tarjeta centrada sobre fondo completo — patrón ya correcto para escritorio, cambios mínimos.

La corrección real **no es** cambiar `max-w-md` por `max-w-full` (eso solo produciría el mismo problema al revés: botones y tarjetas de teléfono estiradas a lo ancho). Es reestructurar la navegación y el grid de cada página para escritorio, dejando intacta la versión móvil.

---

## 2. Principios no negociables

- **Un solo bundle**: `capacitor.config.ts` apunta `webDir: 'dist'` — el mismo build que se sube a Vercel/web es el que se empaqueta para Android. No hay "build web" y "build Android" separados. Toda la estrategia de seguridad se diseña alrededor de este hecho.
- **Cero cambios de color/estilo**: no se toca `src/index.css` (variables `--primary`, `--gradient-*`, `--shadow-*`, `--radius`) ni la sección `colors` de `tailwind.config.ts`. Solo layout, espaciado y estructura de grid.
- **Cero cambios en la experiencia Android**: se garantiza con doble mecanismo (sección 3), no con promesas.
- **Aditivo, no destructivo**: cada clase nueva se agrega en variantes `lg:`/`xl:`/`2xl:` de Tailwind. Las clases base (sin prefijo) —las que ve hoy el teléfono y Android— no se modifican, solo se les agregan hermanas condicionales.

---

## 3. Estrategia de seguridad: por qué Android queda garantizado intacto

**Mecanismo 1 — Mobile-first real (base técnica).**
Tailwind ya trae los breakpoints estándar (`lg` = 1024px, `xl` = 1280px, `2xl` = 1536px) sin configuración custom en `tailwind.config.ts`. Un teléfono Android, incluso en horizontal, casi nunca supera los 1000px CSS de ancho. Si todo lo nuevo se escribe como `lg:flex lg:grid-cols-2`, etc. (nunca modificando la clase base), un teléfono Android **nunca dispara esas reglas** — sigue viendo exactamente el CSS de hoy, byte por byte.

**Mecanismo 2 — Guardia de plataforma nativa (cinturón de seguridad).**
El único caso límite son tablets/foldables Android grandes en horizontal (una tablet de 10" puede llegar a ~1100–1280px). Para cerrar ese hueco al 100%, se aprovecha algo que el código ya hace: `AppShell.tsx` ya importa `Capacitor` y llama `Capacitor.isNativePlatform()`. Se añadirá una marca (por ejemplo un atributo `data-platform="native"` en el `<html>`, seteada una sola vez al arrancar) cuando la app corre dentro del WebView de Capacitor. Todas las reglas de escritorio nuevas se condicionan también a la ausencia de esa marca.

**Resultado:** si es la app Android empaquetada, siempre ve el layout de hoy, sin importar el tamaño de pantalla del dispositivo. Punto.

---

## 4. Sistema de breakpoints (niveles de experiencia)

En vez de un salto binario móvil/escritorio, se proponen 3 niveles progresivos:

| Rango | Nivel | Qué cambia |
|---|---|---|
| 0–1023px (`base`) | Móvil / Android nativo | Exactamente la app de hoy. Sin cambios. |
| 1024–1535px (`lg`/`xl`) | Escritorio | Aparece la barra lateral, se reemplaza el bottom nav, el contenido pasa a grids multi-columna según cada página. |
| ≥1536px (`2xl`) | Monitor grande | Se limita el ancho máximo del área de contenido (~1440–1600px centrado) para que no se estiren tarjetas y botones al infinito en monitores 4K/ultrawide; en Dashboard aparece espacio para una columna lateral adicional de widgets. |

---

## 5. Arquitectura de navegación

- **`BottomNav.tsx`**: se le agrega `lg:hidden`. Es el único cambio que necesita ese archivo. Sigue siendo idéntico en móvil/Android.
- **Nuevo componente `DesktopSidebar.tsx`**: barra lateral fija (~260px), visible solo con `hidden lg:flex`. Contiene logo/nombre de la app, los mismos 5 destinos (Inicio, Movimientos, Deudas, Metas, Ajustes) como lista vertical con ícono + etiqueta, y en el pie: selector de tema y el indicador de sincronización con Supabase que hoy vive en `Header.tsx`.
- **Fuente única de rutas**: hoy el arreglo `items` (ícono, ruta, label) está hardcodeado dentro de `BottomNav.tsx`. Se mueve a `src/components/app/nav-items.ts` para que `BottomNav` y `DesktopSidebar` lean del mismo lugar — cero duplicación, cero riesgo de que diverjan con el tiempo.
- **`AppShell.tsx`**: en vez de un único `mx-auto max-w-md`, pasa a ser un contenedor flex que en `base` se comporta exactamente igual que hoy, y en `lg:` monta `[Sidebar][Área de contenido]` en fila. Toda la lógica existente (splash screen, gestos de swipe, botón atrás de Android, tema) se mantiene intacta — Android sigue entrando por la misma rama de código de siempre.
- **`Header.tsx`**: se mantiene igual en móvil; en escritorio gana más padding horizontal (`lg:px-10`) y el título puede crecer un poco (`lg:text-4xl`), ya que ahora vive dentro del área de contenido junto al sidebar, no en pantalla completa.

---

## 6. Plan por pantalla

### Dashboard.tsx
Hoy: una sola columna — pills de saldo → desglose efectivo/cuentas → tasa de ahorro → acciones rápidas → meta principal → próximos pagos → movimientos recientes, todo apilado.
Escritorio: grid de 2 columnas — **columna principal** (movimientos recientes con más filas visibles, barra de tasa de ahorro) + **columna lateral** (acciones rápidas, meta principal, próximos pagos). Patrón estándar de dashboards financieros.

### Movimientos.tsx
Ya tiene un intento de responsive en los filtros (`hidden sm:grid grid-cols-1 sm:grid-cols-2`), confirma el patrón correcto a extender. Escritorio: la barra de filtros deja de colapsarse; las filas de transacciones ganan columnas visibles (fecha | concepto | categoría | método | cuenta | monto) en vez de tarjeta apilada; el formulario del `Dialog` de alta/edición pasa a 2 columnas internamente.

### Metas.tsx
Las tarjetas de meta (gradiente, ícono, barra de progreso) hoy se apilan una debajo de otra. Escritorio: grid `lg:grid-cols-2 xl:grid-cols-3` para ver varias metas a la vez sin scroll interminable.

### Deudas.tsx
Los grupos "Por persona" se reorganizan en grid `lg:grid-cols-2`. Mejora opcional de fase 2: patrón maestro-detalle (lista de personas a la izquierda, detalle a la derecha).

### Anual.tsx
La de mayor beneficio potencial: múltiples secciones con gráficos de Recharts apiladas verticalmente. Escritorio: grid `lg:grid-cols-2`, mostrando dos gráficos lado a lado (ej. "ingresos vs gastos" junto a "distribución por categoría"). Bajo riesgo: `ResponsiveContainer` de Recharts ya se adapta al ancho del contenedor, solo cambia el contenedor que lo envuelve.

### Ajustes.tsx
Hoy usa una barra de "chips" con scroll horizontal (`overflow-x-auto no-scrollbar`), un patrón exclusivamente táctil. Dos opciones:
- **(a) Mínimo viable**: quitar el scroll horizontal en `lg:` y mostrar todas las pestañas visibles.
- **(b) Ideal**: patrón de configuración de escritorio clásico — lista de secciones (Apariencia / Cuenta / Datos / Seguridad) fija a la izquierda, panel de contenido a la derecha.

(b) da mejor resultado pero requiere tocar el manejo de estado de la pestaña activa → se marca como fase 2.

### Historial.tsx
Pequeña (86 líneas), un log simple. Solo necesita más ancho cómodo en `lg:`, sin restructurar grid.

### Login.tsx / MigracionNube.tsx
No están envueltos por `AppShell` (se renderizan directo desde `AuthGuard` en `App.tsx`) y ya tienen su propia tarjeta centrada (`max-w-md` sobre fondo completo) — patrón ya correcto para escritorio. Cambio mínimo o nulo; pulido opcional: enriquecer el fondo con el `gradient-mesh` que ya existe en `index.css`.

### Modales (`components/ui/dialog.tsx`)
Ya están bien resueltos (portal fuera del shell, centrados, `max-w-lg`). Único ajuste: dentro de formularios largos (alta de transacción, meta, deuda), reordenar los campos en 2 columnas a partir de `sm:`/`md:` dentro del propio diálogo para reducir el scroll interno.

---

## 7. Fases de implementación sugeridas

1. **Fase 0 — Cimientos** (bajo riesgo, habilita todo lo demás): guardia de plataforma nativa, extracción de `nav-items.ts`, ajuste de `AppShell.tsx` para el grid base sidebar + contenido.
2. **Fase 1 — Navegación**: `DesktopSidebar.tsx` + ocultar `BottomNav` en `lg:`.
3. **Fase 2 — Dashboard y Movimientos** (pantallas de mayor uso).
4. **Fase 3 — Metas, Deudas, Anual**.
5. **Fase 4 — Ajustes** (mayor esfuerzo si se opta por el patrón ideal de sub-navegación).
6. **Fase 5 — Pulido**: límite de ancho en monitores 4K/ultrawide, columna lateral extra en Dashboard para `2xl:`.

---

## 8. Plan de pruebas / QA

- **Regresión Android (crítica)**: compilar el APK (`android:build:release`) tras cada fase y verificar en un emulador/dispositivo real que absolutamente nada cambió — mismo bottom nav, mismo ancho, mismo comportamiento de swipe y botón atrás.
- **Matriz de anchos de navegador**: 375px (móvil), 768px (tablet), 1024px, 1280px, 1440px, 1920px, 2560px (monitor grande).
- **Caso límite explícito**: probar una tablet Android grande en horizontal dentro de la app nativa (no en Chrome) para confirmar que la guardia de plataforma la mantiene en modo móvil.
- **Modo PWA de escritorio**: como el `manifest.webmanifest` permite instalar la web como PWA, probar también esa vía en Chrome/Edge de escritorio.

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Que un cambio en `AppShell.tsx` rompa la lógica de swipe entre rutas (`SWIPE_ROUTES`) o el listener del botón atrás. | Esa lógica no depende del ancho ni de las clases CSS, solo de `location.pathname`; no se toca su implementación, solo el JSX de layout alrededor. |
| Duplicar la lista de navegación entre sidebar y bottom nav y que con el tiempo diverjan. | Fuente única en `nav-items.ts` desde el día 1. |
| Que Recharts no respete el nuevo contenedor de 2 columnas en `Anual.tsx`. | Bajo riesgo, ya usa `ResponsiveContainer`; se valida en fase 3 antes de continuar. |

---

## 10. Próximo paso

Empezar por la **Fase 0** (guardia de plataforma + shell base) y la **Fase 1** (barra lateral), que son las de menor riesgo y las que habilitan visualmente el resto del plan.
