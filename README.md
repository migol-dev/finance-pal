<div align="center">

<br/>

<img src="public/icon-512.webp" alt="Finance Pal Logo" width="110" style="border-radius: 24px;" />

<br/><br/>

# Finance Pal

### Tu gestor de finanzas personales — 100% privado, 100% tuyo.

<br/>

[![Version](https://img.shields.io/badge/versión-1.17.8-F43F5E?style=for-the-badge&logo=semantic-release&logoColor=white)](https://github.com/migol-dev/finance-pal/releases)
[![Platform](https://img.shields.io/badge/Android-nativo-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://capacitorjs.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)

<br/>

> **Finance Pal** es una aplicación móvil de gestión financiera personal construida con React, TypeScript y Capacitor.  
> Sin servidores · Sin suscripciones · Sin compromisos. Tus datos viven en tu dispositivo.  
> *Sincronización opcional a la nube mediante Supabase con cifrado de extremo a extremo.*

<br/>

---

</div>

<br/>

## Tabla de Contenidos

- [Características](#características)
- [Autenticación y Sincronización en la Nube](#autenticación-y-sincronización-en-la-nube)
- [Cifrado y Seguridad](#cifrado-y-seguridad)
- [Arquitectura](#arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Stack Tecnológico](#stack-tecnológico)
- [Desarrollo y Compilación](#desarrollo-y-compilación)
- [Despliegue en Android](#despliegue-en-android)
- [Exportación e Importación de Datos](#exportación-e-importación-de-datos)
- [Testing y Calidad](#testing-y-calidad)
- [Comportamiento Nativo y Migraciones](#comportamiento-nativo-y-migraciones)
- [Scripts Disponibles](#scripts-disponibles)
- [Licencia](#licencia)

<br/>

---

<br/>

## Características

Finance Pal está diseñado para darte una **visión 360° de tus finanzas**, con herramientas que van desde el resumen diario hasta la planificación anual.

<br/>

### Dashboard — Centro de Mando

El panel principal es tu cuartel general financiero. De un solo vistazo tienes todo lo importante:

| Widget | Descripción |
|---|---|
| **Balance neto acumulado** | Saldo total hasta el mes activo, con animación de entrada |
| **Estadísticas del mes** | Ingresos · Gastos · Ahorros del período seleccionado |
| **Desglose Efectivo / Cuentas** | Separación instantánea entre tu dinero en mano y en banco |
| **Tasa de ahorro** | Barra de progreso animada con porcentaje real |
| **Meta principal pinneada** | Progreso visual de tu objetivo de ahorro más importante |
| **Próximos pagos** | Alerta de conceptos fijos a vencer en los próximos días |
| **Movimientos recientes** | Últimas 4 transacciones del mes activo |
| **Accesos rápidos** | Botones directos para registrar gasto o ingreso |
| **Selector de mes** | Navega entre meses sin perder el contexto |
| **Modo privado** | Oculta todos los importes con un solo toque |
| **Indicador de sincronización** | Estado de conexión con Supabase y cola de cambios pendientes |

> El dashboard respeta el **mes activo global** — todos los cálculos se ajustan al período que hayas seleccionado.

<br/>

### Movimientos — Registro Completo

Gestión detallada de cada transacción económica:

- **4 tipos de movimiento**: Ingreso · Gasto · Ahorro · Traspaso interno
- **Recibos fotográficos**: Adjunta imagen de comprobante a cualquier transacción (almacenada en `Directory.Data/receipts/` en Android)
- **Categorías con emoji** personalizadas para identificar el concepto a simple vista
- **Iconos personalizados**: Emoji o foto recortada (crop) por movimiento
- **Método de pago**: Efectivo · Transferencia · Tarjeta · Otro
- **Vinculación a cuenta**: Asocia cada movimiento a una cuenta específica
- **Traspasos internos**: Mueve dinero entre tus propias cuentas sin alterar las estadísticas
- **Transferencia externa con CLABE**: Detalla destinatario, banco y nombre para transferencias bancarias
- **Referencia a concepto fijo** (`fixedId`): Vincula automáticamente movimientos generados desde conceptos fijos
- **Búsqueda y filtros avanzados**:
  - Por texto libre
  - Por tipo (ingreso/gasto/ahorro/traspaso)
  - Por categoría
  - Por cuenta
  - Por método de pago
  - Por rango de fechas (hoy, ayer, últimos 7 días, últimos 30 días, personalizado)
- **Sincronización de filtros a URL**: Opción para compartir/guardar vistas filtradas mediante parámetros de consulta
- **Navegación directa**: Desde el dashboard se puede crear un movimiento pre-tipado (`?new=expense`)

<br/>

### Conceptos Fijos — Automatiza tu Presupuesto

Registra todos tus ingresos y gastos recurrentes para que el presupuesto se calcule solo:

| Campo | Opciones disponibles |
|---|---|
| **Tipo** | Ingreso fijo · Gasto fijo · Gasto variable · Ahorro fijo |
| **Frecuencia** | Mensual · Semanal · Bimestral · Trimestral · Cuatrimestral · Semestral · Anual · Una vez |
| **Día de pago** | Día del mes (1–28) o día de la semana (Lun–Dom) |
| **Prioridad** | Alta · Media · Baja |
| **Método de pago** | Efectivo · Transferencia · Tarjeta · Otro |
| **Cuenta vinculada** | Cualquiera de tus cuentas registradas |
| **Período activo** | Fecha de inicio y fin (con soporte de rangos multi-año) |
| **Icono / Emoji** | Personalización visual completa |
| **Nota** | Descripción libre adjunta |

Los conceptos fijos se proyectan automáticamente en el **Dashboard**, la **Vista Anual** y los cálculos de balance — deduciendo las ocurrencias que ya tienen transacción registrada para evitar doble conteo.

<br/>

### Metas — Ahorro con Propósito

Sistema completo de seguimiento de objetivos financieros:

- **Paletas de color**: 5 gradientes visuales (sunset, ocean, primary, success, secondary)
- **Icono personalizado** por meta (emoji o imagen recortada)
- **Deadline / Fecha objetivo**: Plazo para alcanzar la meta
- **Progreso ideal vs real**: Gráfica de área (`SimpleAreaChart`) con línea de lo que "debería llevar" vs lo que realmente has ahorrado
- **Estado automático**: La app calcula si vas adelantado, en camino, atrasado o completado
- **Ritmo necesario**: Muestra cuánto necesitas ahorrar por día / semana / mes para llegar a tiempo
- **Historial de contribuciones**: Cada aporte queda registrado con fecha y monto
- **Enlace de compra**: URL opcional hacia el producto que quieres comprar
- **Pinear meta principal**: La meta destacada aparece directamente en el Dashboard
- **Contribuir desde Dashboard**: Acceso rápido para añadir aportes
- **Pestañas**: Activas · Completadas

<br/>

### Deudas — Quién Te Debe

Lleva un registro claro de préstamos realizados y cobros pendientes:

- **Tarjetas de resumen**: Total prestado · Total cobrado · Pendiente
- **Agrupación por persona**: Vista consolidada de todo lo que te debe cada contacto
- **Historial de abonos**: Cada pago recibido queda registrado con fecha, monto y método
- **Filtros**: Todas · Pendientes · Liquidadas · Búsqueda por nombre o concepto
- **Fecha de vencimiento**: Campo opcional de due date por deuda
- **Estado visual**: Indicador de liquidado cuando el saldo es ≤ 0
- **Método de cobro y cuenta**: Registra cómo y dónde te pagaron cada abono
- **Integración con estadísticas**: Los préstamos se contabilizan como "gasto" y los cobros como "ingreso"

<br/>

### Vista Anual — Planificación a Largo Plazo

Análisis financiero de todo el año en cuatro pestañas:

| Pestaña | Contenido |
|---|---|
| **General** | Tabla mes a mes con Ingresos · Gastos · Ahorros · Neto · Tasa de ahorro. Gráfica de área comparativa |
| **Categorías** | Desglose de gasto por categoría a lo largo del año |
| **Métodos** | Distribución del gasto según método de pago (efectivo, transferencia, tarjeta) |
| **Metas** | Contribuciones a metas mes a mes |

- **Navegación de año**: Flechas para cambiar de año sin afectar el mes activo global
- **Exportar CSV**: Descarga la tabla del año actual en formato CSV
- **Click en mes**: Navega directamente al mes seleccionado en el resto de la app
- **Comparativa inter-anual**: Los datos incluyen tanto transacciones reales como proyecciones de conceptos fijos

<br/>

### Cuentas — Gestiona tu Patrimonio

Sistema multi-cuenta con soporte de tipos y metadata bancaria:

| Tipo de cuenta | Características especiales |
|---|---|
| **Banco** | CLABE interbancaria · Institución · Titular |
| **Efectivo** | Editor de denominaciones (billetes y monedas) con conteo físico |
| **Otra** | Balance libre sin metadata adicional |

- **Balance calculado en tiempo real**: Suma de saldo inicial más todas las transacciones vinculadas
- **Fusión de cuentas**: Herramienta para unificar dos cuentas en una sola (`mergeAccounts`)
- **Denominaciones de efectivo**: Especifica cuántos billetes/monedas tienes de cada valor para un conteo exacto
- **Desglose en Dashboard**: Efectivo vs. Cuentas bancarias separados visualmente

<br/>

### Ajustes — Control Total

El centro de configuración de Finance Pal:

- **Perfil de usuario**:
  - Nombre y correo electrónico
  - Moneda preferida: `MXN · USD · EUR · COP · ARS · CLP · PEN · BRL`
  - Avatar personalizado (emoji o foto recortada)
- **Modo oscuro / claro**: Cambio instantáneo con `next-themes`
- **Gestión de conceptos fijos**: Alta, edición, eliminación y activar/desactivar
- **Exportar datos**: JSON granular — elige exactamente qué secciones exportar
- **Importar datos**: Detecta automáticamente qué secciones contiene el archivo
- **Limpiar recibos huérfanos**: Detecta y elimina archivos de recibos sin transacción asociada
- **Restablecer todo**: Borrado completo con confirmación doble
- **Sincronización de filtros a URL**: Preferencia persistente para compartir vistas filtradas

<br/>

### Historial de Cambios

Cada creación, edición y eliminación queda registrada en un changelog inmutable:

- **Entidades auditadas**: Transacciones · Conceptos fijos · Metas · Deudas
- **Campos de cambio**: Nombre del campo · Valor anterior · Valor nuevo
- **Timestamp ISO** de cada entrada
- **Limpieza manual**: Opción para borrar el historial completo desde Ajustes

<br/>

### Experiencia de Usuario

- **Animaciones Framer Motion**: Transiciones de página con fade + blur, animaciones de entrada por sección
- **Splash screen** con gradiente y logo al iniciar
- **Bottom navigation** con iconos y rutas animadas
- **Carga diferida** (`lazy`) en todas las páginas — sin bloqueo en el inicio
- **Confirmaciones elegantes** (`ElegantConfirm`) en lugar de `window.confirm`
- **Toast notifications** con `sonner` para feedback inmediato
- **Selector de iconos** (`IconPicker`): acceso a emojis y crop de imágenes en el mismo picker
- **Selector de mes** (`MonthSwitcher`) global con control de año
- **Botón atrás de Android**: Capturado con Capacitor — doble toque para salir desde la raíz
- **Navegación por gestos**: Deslizamiento lateral entre páginas principales
- **Error Boundary**: Captura y recuperación de errores de React con UI de depuración

<br/>

---

<br/>

## Autenticación y Sincronización en la Nube

Finance Pal opera **offline-first**: todos tus datos residen localmente en el dispositivo. De forma **opcional**, puedes habilitar la sincronización con Supabase para tener una copia de seguridad en la nube y usar la misma configuración en múltiples dispositivos.

### Funcionalidades

| Característica | Descripción |
|---|---|
| **Autenticación** | Registro e inicio de sesión con email/contraseña, Google OAuth y GitHub OAuth |
| **Indicador de fortaleza** | Medidor visual de seguridad al crear contraseñas |
| **Sesión persistente** | Token de sesión con renovación automática cada 5 min antes de expirar |
| **Inactividad** | Cierre de sesión automático tras 30 min de inactividad |
| **Migración local → nube** | Asistente paso a paso para subir datos locales a Supabase |
| **Cola offline** | Las mutaciones realizadas sin conexión se encolan y sincronizan al恢复ar conectividad |
| **Reintentos** | Hasta 3 reintentos con backoff exponencial ante fallos de sincronización |
| **Rate limiting** | Límite de 10 ops/s para sincronización, 5/s para autenticación, 3/s para storage |
| **Detector de red** | Monitoreo de conectividad mediante Capacitor Network plugin |
| **Indicador visual** | Header muestra estado de sincronización y número de cambios pendientes |

### Stack de Sincronización

| Componente | Tecnología |
|---|---|
| **Backend** | Supabase (PostgreSQL + Auth + Storage) |
| **Queries en servidor** | TanStack React Query (stale 5 min, gc 24 h, persistido a localStorage) |
| **Mutaciones offline** | Sync engine con cola en Zustand + procesamiento diferido |
| **Seguridad** | Row Level Security (RLS) en todas las tablas, URLs firmadas para Storage |
| **Cifrado** | AES-GCM 256-bit con PBKDF2 para almacenamiento local cifrado |

<br/>

---

<br/>

## Cifrado y Seguridad

Finance Pal implementa múltiples capas de seguridad para proteger tu información financiera:

### Cifrado en Dispositivo

- **AES-GCM 256-bit** para cifrado de datos locales
- **PBKDF2** con 100,000 iteraciones para derivación de clave
- **Consciente de plataforma**: Filesystem nativo en Android, localStorage en web

### Seguridad en Supabase

- **Row Level Security (RLS)**: Políticas granulares por usuario en todas las tablas
- **URLs firmadas**: Acceso temporal y seguro a recibos almacenados
- **Validación de imágenes**: Verificación de magic bytes para evitar subidas maliciosas

### Prácticas de Desarrollo

- **Sanitización** de todos los datos importados
- **Error Boundary** con UI de recuperación sin exponer información sensible
- **Auditoría** completa de seguridad y optimización (`AUDITORIA-SEGURIDAD-OPTIMIZACION.md`)

<br/>

---

<br/>

## Arquitectura

```
┌──────────────────────────────────────────────────────────┐
│                      Finance Pal                          │
│             React 18 + TypeScript + Vite                  │
├──────────────────────────────────────────────────────────┤
│              ESTADO LOCAL (Zustand + persist)             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │               finance-store.ts                       │ │
│  │  transactions · fixedItems · goals · debts           │ │
│  │  accounts · changeLog · profile · theme              │ │
│  │  activeMonth · activeYear · syncFiltersToURL         │ │
│  │  Persistencia: localStorage + cifrado AES-GCM        │ │
│  └───────────────────────┬──────────────────────────────┘ │
│                          │ sync engine                    │
│  ┌───────────────────────▼──────────────────────────────┐ │
│  │               sync-store.ts (cola offline)            │ │
│  │   Cola de mutaciones → Supabase (cuando hay red)     │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │          React Query (TanStack Query)                 │ │
│  │  useAccounts · useTransactions · useGoals             │ │
│  │  useFixedItems · useDebts                             │ │
│  │  STALE: 5 min · GC: 24 h · Persistido a LS           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │          CAPA HÍBRIDA (useHybridData)                 │ │
│  │   Fusión automática: datos locales ↔ Supabase        │ │
│  └──────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│                PÁGINAS (Lazy Loaded)                      │
│  Dashboard · Movimientos · Metas · Anual · Deudas        │
│  Ajustes · Historial · Login · AuthCallback              │
│  MigracionNube · NotFound                                │
├──────────────────────────────────────────────────────────┤
│           COMPONENTES DE APLICACIÓN                       │
│  AppShell · BottomNav · Header · MonthSwitcher           │
│  IconPicker · IconDisplay · PillTabs · StatPill          │
│  ElegantConfirm · SplashScreen · ErrorBoundary           │
├──────────────────────────────────────────────────────────┤
│            CAPA NATIVA (Capacitor 8)                      │
│  Filesystem · LocalNotifications · Share · App · Network │
└──────────────────────────────────────────────────────────┘
```

### Modelo de Datos (Schema v5)

```typescript
// Tipos principales del store
transactions: Transaction[]   // Movimientos (ingreso/gasto/ahorro/transfer)
fixedItems:   FixedItem[]     // Conceptos recurrentes con frecuencia configurable
goals:        Goal[]          // Metas de ahorro con historial de contribuciones
debts:        Debt[]          // Deudas con historial de abonos
accounts:     Account[]       // Cuentas bancarias, efectivo y otras
changeLog:    ChangeLogEntry[] // Auditoría completa de cambios
profile:      UserProfile     // Nombre, email, moneda, avatar
theme:        "light" | "dark"
auth:         AuthState       // Sesión Supabase (user, session, loading)
```

### Frecuencias Soportadas

| Constante | Descripción | Factor mensual |
|---|---|---|
| `monthly` | Mensual | ×1 |
| `weekly` | Semanal | ×4.345 |
| `bimonthly` | Bimestral | ÷2 |
| `quarterly` | Trimestral | ÷3 |
| `fourmonthly` | Cuatrimestral | ÷4 |
| `biannual` | Semestral | ÷6 |
| `yearly` | Anual | ÷12 |
| `one_time` | Una vez | 0 |

<br/>

---

<br/>

## Estructura del Proyecto

```
finance-pal/
├── android/                        # Proyecto nativo Android (Capacitor)
│   ├── app/src/main/               # Código Java/Kotlin y recursos nativos
│   └── build.gradle
│
├── .github/workflows/
│   ├── ci.yml                      # Pipeline de integración continua
│   └── bundle-analysis.yml         # Análisis de tamaño del bundle
│
├── supabase/
│   └── schema.sql                  # Esquema de base de datos Supabase (6 tablas + RLS)
│
├── src/
│   ├── App.tsx                     # Router principal + lazy loading + animaciones
│   ├── main.tsx                    # Punto de entrada React
│   ├── index.css                   # Variables CSS, design tokens, gradientes
│   │
│   ├── pages/                      # Vistas principales (11 páginas)
│   │   ├── Dashboard.tsx           # Panel de control con stats, metas y recientes
│   │   ├── Movimientos.tsx         # CRUD de transacciones con filtros avanzados
│   │   ├── Metas.tsx               # Gestión de objetivos de ahorro con gráficas
│   │   ├── Anual.tsx               # Resumen anual multi-tab con exportación CSV
│   │   ├── Deudas.tsx              # Seguimiento de préstamos y cobros
│   │   ├── Ajustes.tsx             # Config, conceptos fijos, cuentas, import/export
│   │   ├── Historial.tsx           # Changelog de cambios auditables
│   │   ├── Login.tsx               # Autenticación (email, Google, GitHub)
│   │   ├── AuthCallback.tsx        # Callback OAuth
│   │   ├── MigracionNube.tsx       # Asistente de migración local → nube
│   │   ├── NotFound.tsx            # Página 404
│   │   └── Index.tsx               # Redirect a Dashboard
│   │
│   ├── components/
│   │   ├── app/                    # Componentes de aplicación
│   │   │   ├── AppShell.tsx        # Layout principal + bottom nav + back button
│   │   │   ├── BottomNav.tsx       # Navegación inferior con rutas activas
│   │   │   ├── Header.tsx          # Cabecera con título, acciones y estado sync
│   │   │   ├── MonthSwitcher.tsx   # Selector de mes/año global
│   │   │   ├── IconPicker.tsx      # Picker de emoji + crop de imagen
│   │   │   ├── IconDisplay.tsx     # Renderizado de IconRef (emoji o imagen)
│   │   │   ├── PillTabs.tsx        # Tabs de navegación estilo píldora
│   │   │   ├── SplashScreen.tsx    # Pantalla de carga inicial
│   │   │   ├── StatPill.tsx        # Píldora de estadística
│   │   │   └── ElegantConfirm.tsx  # Confirmación modal elegante
│   │   │
│   │   ├── ui/                     # Componentes base (shadcn/ui + Radix UI)
│   │   │   ├── button, input, label, select, textarea...
│   │   │   ├── dialog, sheet, drawer (vaul), alert-dialog
│   │   │   ├── chart, SimpleAreaChart, DenominationsEditor
│   │   │   └── ... (30+ componentes reutilizables)
│   │   │
│   │   └── ErrorBoundary.tsx       # Captura de errores React con recuperación
│   │
│   ├── store/
│   │   ├── finance-store.ts        # Zustand store con persistencia + lógica financiera
│   │   └── sync-store.ts           # Cola de mutaciones offline para Supabase
│   │
│   ├── context/
│   │   └── AuthContext.tsx         # Proveedor de autenticación (sesión, refresh, timeout)
│   │
│   ├── lib/
│   │   ├── finance.ts              # Tipos, constantes y utilidades de dominio
│   │   ├── framer.tsx              # Re-exports de Framer Motion
│   │   ├── supabase.ts             # Cliente Supabase + toggle de sincronización
│   │   ├── supabase-storage.ts     # Subida/descarga de recibos a Supabase Storage
│   │   ├── sync-engine.ts          # Procesamiento de cola offline con reintentos
│   │   ├── migration.ts            # Migración de datos locales → Supabase
│   │   ├── encrypted-storage.ts    # Cifrado AES-GCM para almacenamiento local
│   │   ├── rate-limiter.ts         # Rate limiter en memoria para sync/auth/storage
│   │   ├── validators.ts           # Esquemas Zod de validación para todas las entidades
│   │   ├── thumbnail.ts            # Generación de thumbnails de recibos
│   │   ├── useRecharts.tsx         # Hook para safe-import de Recharts
│   │   ├── utils.ts                # cn() helper (clsx + tailwind-merge)
│   │   └── web-vitals.ts           # Métricas de rendimiento
│   │
│   ├── hooks/
│   │   ├── useFinanceData.ts       # Hook híbrido: datos locales + Supabase
│   │   ├── useHybridData.ts        # Hook simplificado para componentes de página
│   │   ├── useSupabaseQueries.ts   # React Query hooks por entidad
│   │   ├── useNetwork.ts           # Detección de conectividad (Capacitor)
│   │   ├── use-mobile.tsx          # Detección de viewport móvil
│   │   └── use-toast.ts            # Hook de notificaciones toast
│   │
│   └── test/                       # Suite de tests (Vitest + Testing Library)
│       ├── computeBalances.test.ts
│       ├── computeBalances.transfer.test.ts
│       ├── ensureScheduled.test.ts
│       ├── importMigration.test.ts
│       ├── receipt.fs.test.ts
│       └── setup.ts
│
├── scripts/
│   ├── generate-icons.js           # Genera iconos Android desde logo fuente
│   ├── optimize-images.js          # Compresión de imágenes con Sharp
│   ├── cleanup-receipts.cjs        # Limpieza de recibos huérfanos
│   └── find-unused-deps.cjs        # Análisis de dependencias no usadas
│
├── public/                         # Assets públicos (favicon, icons, manifests)
├── capacitor.config.ts             # Configuración de Capacitor
├── vite.config.ts                  # Build config + terser + compresión brotli/gzip
├── tailwind.config.ts              # Design tokens, gradientes, variables CSS
├── vitest.config.ts                # Configuración de tests
└── package.json                    # Scripts y dependencias
```

<br/>

---

<br/>

## Stack Tecnológico

### Core

| Tecnología | Versión | Rol |
|---|---|---|
| **React** | 18.3 | Framework UI con Suspense + lazy loading |
| **TypeScript** | 5.8 | Tipado estático total en toda la app |
| **Vite** | 8 | Build tool con HMR ultrarrápido |
| **Capacitor** | 8 | Bridge nativo para Android |

### UI & Estilo

| Tecnología | Versión | Rol |
|---|---|---|
| **Tailwind CSS** | 3.4 | Utility-first CSS con tokens personalizados |
| **shadcn/ui** | latest | Componentes accesibles sobre Radix UI |
| **Radix UI** | 1–2 | Primitivas de UI accesibles y headless |
| **Framer Motion** | 12 | Animaciones y transiciones de página |
| **Recharts** | 3.8 | Gráficas de área para metas y vista anual |
| **Lucide React** | 0.462 | Iconografía limpia y consistente |

### Estado & Datos

| Tecnología | Versión | Rol |
|---|---|---|
| **Zustand** | 5.0 | Estado global reactivo y persistido |
| **TanStack React Query** | 5.83 | Estado servidor y caché de Supabase |
| **React Hook Form** | 7.61 | Manejo de formularios con validación |
| **Zod** | 3.25 | Esquemas de validación en tiempo de ejecución |
| **date-fns** | 4.1 | Manipulación y formato de fechas |

### Backend (Opcional)

| Tecnología | Versión | Rol |
|---|---|---|
| **Supabase JS** | 2.110 | Cliente para autenticación, base de datos y storage |
| **Supabase PostgreSQL** | — | Base de datos con RLS y políticas de seguridad |

### Capacitor Plugins

| Plugin | Rol |
|---|---|
| `@capacitor/filesystem` | Guardar recibos y archivos en almacenamiento interno |
| `@capacitor/share` | Compartir archivos de exportación |
| `@capacitor/local-notifications` | Notificaciones locales programables |
| `@capacitor/app` | Captura del botón atrás y ciclo de vida |
| `@capacitor/network` | Detección de conectividad a internet |

### Herramientas de Desarrollo

| Herramienta | Rol |
|---|---|
| **Vitest** | Tests unitarios e integración |
| **Testing Library** | Utilidades de test para React |
| **ESLint** | Lint con reglas para React Hooks |
| **Sharp** | Optimización y generación de imágenes |
| **rollup-plugin-visualizer** | Análisis del bundle resultante |
| **vite-plugin-compression** | Compresión brotli + gzip del bundle |
| **Terser** | Minificación avanzada de JS |

<br/>

---

<br/>

## Desarrollo y Compilación

### Requisitos Previos

- **Node.js** v18 o superior
- **Android Studio** (para builds nativos)
- **JDK 17+** (requerido por Gradle)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/migol-dev/finance-pal.git
cd finance-pal

# Instalar dependencias
npm install
```

### Configuración de Supabase (Opcional)

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_ENABLE_SUPABASE=true
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

> Sin estas variables, la app funciona en modo **100% local** sin pérdida de funcionalidad.

### Desarrollo en Navegador

```bash
# Iniciar servidor de desarrollo con HMR
npm run dev
```

La app estará disponible en `http://localhost:5173`

### Compilación para Producción

```bash
# Build optimizado (terser + brotli/gzip + tree-shaking + code splitting)
npm run build

# Preview del build de producción
npm run preview

# Build en modo desarrollo (source maps, sin minificar)
npm run build:dev

# Analizar el bundle generado
npm run analyze
```

<br/>

---

<br/>

## Despliegue en Android

### Flujo Completo

```bash
# 1. Compilar la app web
npm run build

# 2. Sincronizar assets con el proyecto Android
npm run android:copy

# 3. Abrir Android Studio para depurar o compilar
npx cap open android
```

### Build de Release (APK firmado)

```bash
# En sistemas Unix/macOS
npm run android:build:release

# En Windows
npm run android:build:release:win
```

> Los comandos de release ejecutan `cap copy android` y luego `./gradlew assembleRelease` en la carpeta `android/`.

### Generación de Iconos

```bash
# Genera todos los iconos Android desde la imagen fuente
npm run generate-icons
```

<br/>

---

<br/>

## Exportación e Importación de Datos

Finance Pal utiliza un formato **JSON con schema versionado** (actualmente `schemaVersion: 5`) para las copias de seguridad.

### Exportación

La exportación es **granular** — puedes elegir exactamente qué secciones incluir:

```
 Conceptos fijos     Transacciones     Cuentas
 Metas             Deudas           Historial de cambios
 Perfil            Tema
```

El archivo generado se llama `finance-pal-YYYY-MM-DD.json`.

**Estrategias de guardado por plataforma:**

| Plataforma | Método |
|---|---|
| Android nativo | Escribe en `Directory.Cache` y abre el selector de compartir |
| Desktop Chrome/Edge | File System Access API con selector de carpeta |
| Mobile web | Web Share API con archivo adjunto |
| Fallback | Descarga directa al directorio `Descargas` |

### Importación

Al seleccionar un archivo, la app:
1. **Detecta automáticamente** qué secciones contiene el JSON
2. Muestra un selector para elegir qué importar
3. Solicita confirmación antes de sobrescribir

> La importación es **no destructiva por sección** — solo se reemplaza lo que el usuario selecciona.

### Migración Local → Nube

Desde la página **Migración a la Nube** (visible solo con Supabase habilitado), puedes:
1. Iniciar sesión con tu cuenta de Supabase
2. Seleccionar qué secciones migrar (transacciones, cuentas, metas, deudas, conceptos fijos)
3. Subir recibos fotográficos al Storage de Supabase
4. Elegir entre **fusionar** con datos existentes o **reemplazar** los remotos

### Limpieza de Recibos Huérfanos

En Android, las fotos de recibos se guardan como archivos. Con el tiempo pueden acumularse archivos de transacciones ya eliminadas:

```bash
# Listar recibos huérfanos sin eliminar
npm run cleanup-receipts -- --dry-run

# Eliminar recibos huérfanos
npm run cleanup-receipts -- --delete
```

También disponible desde la UI en **Ajustes → Limpiar recibos**.

<br/>

---

<br/>

## Testing y Calidad

### Ejecutar Tests

```bash
# Ejecutar suite completa (una vez)
npm run test

# Modo watch (re-ejecuta al guardar cambios)
npm run test:watch
```

### Verificación de Tipos

```bash
# Comprobación de tipos sin emitir JS
node ./node_modules/typescript/bin/tsc --noEmit
```

### Lint

```bash
# Revisar estilo y detectar errores estáticos
npm run lint
```

### Análisis de Dependencias

```bash
# Encontrar dependencias declaradas pero no usadas
node scripts/find-unused-deps.cjs

# Analizar el tamaño del bundle (abre visualizador en el browser)
npm run analyze
```

### Integración Continua

El repositorio incluye flujos de trabajo de GitHub Actions:
- **CI** (`ci.yml`): Ejecuta lint, typecheck y tests en cada push/PR
- **Bundle Analysis** (`bundle-analysis.yml`): Analiza el tamaño del bundle generado

<br/>

---

<br/>

## Comportamiento Nativo y Migraciones

### Botón Atrás de Android

En plataforma nativa, `AppShell` captura el evento del botón de hardware:

- **Pantalla secundaria** → navega hacia atrás en la pila de React Router
- **Pantalla raíz (`/`)** → doble toque para cerrar la aplicación con confirmación

### Recibos en Android vs Web

| Plataforma | Almacenamiento | Valor en store |
|---|---|---|
| Android / iOS | `Directory.Data/receipts/<uuid>.jpg` | Ruta relativa `receipts/<uuid>.jpg` |
| Web | Embebido como `data:` URL | Data URL completa |

La función `migrateReceiptsInPlace()` convierte cualquier `data:` URL antigua a archivo en el dispositivo.

### Migración de Schema

El schema se versiona con `SCHEMA_VERSION = 5`. Al importar un archivo de versión anterior, el store aplica las migraciones necesarias de forma transparente.

### Cifrado Local

El almacenamiento local puede cifrarse con AES-GCM 256-bit mediante `encrypted-storage.ts`. La clave se deriva con PBKDF2 (100,000 iteraciones) y el cifrado es consciente de la plataforma (Filesystem nativo en Android, localStorage en web).

<br/>

---

<br/>

## Scripts Disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo Vite con HMR |
| `npm run build` | Build de producción optimizado (brotli + gzip + code splitting) |
| `npm run build:dev` | Build de desarrollo (con source maps) |
| `npm run preview` | Preview del bundle compilado |
| `npm run lint` | ESLint sobre toda la base de código |
| `npm run test` | Vitest en modo CI (una sola ejecución) |
| `npm run test:watch` | Vitest en modo watch interactivo |
| `npm run analyze` | Build + visualizador de bundle |
| `npm run android:copy` | `cap copy android` — sincroniza assets |
| `npm run android:build:release` | Build + `gradlew assembleRelease` (Unix) |
| `npm run android:build:release:win` | Build + `gradlew.bat assembleRelease` (Windows) |
| `npm run generate-icons` | Genera iconos Android desde el logo fuente |
| `npm run optimize-images` | Comprime imágenes de assets con Sharp |
| `npm run cleanup-receipts` | Detecta/elimina recibos huérfanos en Android |
| `npm run browserslist:update-db` | Actualiza la base de datos de browserslist |

### Monedas Soportadas

| Código | Moneda |
|---|---|
| `MXN` | Peso mexicano |
| `USD` | Dólar estadounidense |
| `EUR` | Euro |
| `COP` | Peso colombiano |
| `ARS` | Peso argentino |
| `CLP` | Peso chileno |
| `PEN` | Sol peruano |
| `BRL` | Real brasileño |

<br/>

---

<br/>

## Licencia

Este proyecto es propiedad de **migol-dev**. Siéntete libre de explorar el código, hacer fork y contribuir mediante Pull Requests.

<br/>

---

<br/>

<div align="center">

<br/>

**Finance Pal** — Hecho con ❤️ para transformar tus finanzas personales.

*Sin servidores · Sin nube · Sin compromisos · 100% tuyo.*

<br/>

[![migol-dev](https://img.shields.io/badge/by-migol--dev-F43F5E?style=flat-square)](https://github.com/migol-dev)
[![Schema](https://img.shields.io/badge/schema-v5-6366F1?style=flat-square)](#)
[![Privacidad](https://img.shields.io/badge/datos-100%25%20locales-10B981?style=flat-square)](#)
[![Sync](https://img.shields.io/badge/cloud-sync%20optional-8B5CF6?style=flat-square)](#)

<br/>

</div>
