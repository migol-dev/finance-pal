# Changelog

## [1.20.2] - 2026-10-10

### ♿ Accesibilidad Universal (WCAG AAA) & GUI Refinada
- **Motor de accesibilidad integral**: 8 nuevas opciones de accesibilidad en Ajustes (escala continua de tipografía del 80% al 150% con reescalado `rem` dinámico, modo Alto Contraste con bordes sólidos y tonos puros bajo estándar WCAG AAA, fuentes para dislexia Atkinson Hyperlegible y Lexend con espaciado adaptable, reducción de animaciones, subrayado forzado de enlaces, áreas táctiles ampliadas de 44-48px, filtro para daltonismo y anillo de foco reforzado).
- **Nuevo Hub Modular de Ajustes**: Pantalla dividida en categorías claras y 8 subsecciones modulares con navegación por query params (`?seccion=...`), optimizando la experiencia y reduciendo la sobrecarga cognitiva.
- **Identidad de marca unificada**: Integración y estandarización del componente `BrandLogo` oficial en Sidebar, Login, Dashboard y NotFound.
- **Micro-tipografía y consistencia UI**: Estandarización de micro-textos (`text-micro`), eliminación de doble 'X' de cierre en modales mediante `hideCloseButton` y áreas táctiles de 40-44px en toda la interfaz.

### 📱 Experiencia Móvil & Responsiva (Pantallas Pequeñas desde 360px)
- **Rediseño completo de Metas**:
  - Navegación horizontal táctil mediante `FolderChips` en móviles y panel deslizable inferior (Drawer / Vaul).
  - Menú contextual `...` en carpetas para liberar espacio en pantallas reducidas.
  - Indicadores visuales y barras de acento lateral para jerarquía de subcarpetas.
  - Corrección de fechas inválidas `NaN/NaN/NaN` mediante `parseGoalDeadline` y soporte robusto de fechas ISO.
- **Desglose de efectivo responsivo**: Rediseño de `DenominationsEditor` en cuadrícula adaptable, eliminando desbordes horizontales en dispositivos de 360px-376px.
- **Operaciones y Deudas**: Listados de movimientos optimizados para evitar compresión de conceptos; formularios con scroll interno `max-h-[90dvh]` y tarjetas de resumen fluidas (1 a 3 columnas).
- **Gráficos y Dashboards adaptables**: Eliminación de anchos fijos en `SimpleAreaChart`, soporte táctil pointer, tooltips delimitados para evitar desbordes y hero de saldo fluido.
- **Shell & Navegación móvil**: Margen seguro (`safe-bottom`) en `BottomNav`, textos truncados protegidos en cabeceras y soporte táctil en `MonthSwitcher`.
- **Login y Teclados virtuales**: Desplazamiento automático para evitar bloqueo de campos al abrir el teclado en móviles.

### ⚡ Arquitectura, React Query & Estado
- **Migración a React Query + Zustand desacoplado**: Centralización de estado asíncrono con React Query, fábrica de query keys (`queryKeys`) y suscripciones atómicas en Zustand para evitar re-renderizados innecesarios.
- **Modularización del Store**: Descomposición del almacén de finanzas en slices atómicos y tipados estrictos (`accountsSlice`, `transactionsSlice`, `categoriesSlice`, `goalsSlice`, `debtsSlice`, `tagsSlice`).
- **Sincronización en la nube robusta**: Eliminación de condiciones de carrera en mutaciones, generación previa de UUIDs en cliente para actualizaciones optimistas instantáneas y estabilización de upserts y dependencias entre cuentas.
- **Gestor de Recibos y Detalles Extendidos**: Panel expandible para cualquier transacción con soporte de comprobantes, beneficiarios/remitentes y filtros de métodos de pago en efectivo.

### 🔒 Seguridad & Hardening
- **Mitigación IDOR**: Blindaje estricto de todos los servicios mediante validación y filtrado forzado de `user_id`.
- **Edge Functions protegidas**: Verificación obligatoria de secreto bearer en funciones del servidor y restricción de purga de sesiones.
- **RLS y Limpieza de Caché**: Refuerzo de políticas de Row-Level Security en base de datos y vaciado automático de cachés locales y de consultas al cerrar sesión.
- **Almacenamiento privado**: Bucket de Supabase Storage para recibos configurado como privado y migración de registros de auditoría a hashes SHA-256.

### 📦 Mantenimiento & Dependencias
- Actualización masiva de dependencias críticas del ecosistema (TanStack React Query 5.102, Zustand 5.0, Framer Motion 12.43, Recharts 3.10, Capacitor plugins 8, React Hook Form 7.87).
- Suite de pruebas con cobertura del 100% pasando (28 suites, 85 tests unitarios e integrados).

## [1.19.38] - 2026-08-28 (Security & Performance Audit)

### Security
- **CSP**: Implementada Política de Seguridad de Contenido (CSP) estricta.
- **RLS**: Se corrigieron las políticas de Row Level Security (RLS) en `push_subscriptions` y se establecieron vistas seguras (`accounts_safe`, `transactions_safe`, `debt_payments_safe`) en Supabase.
- **Network**: Se desactivó el tráfico en texto plano (cleartext) en Android.
- **Secrets**: Las claves VAPID ahora se gestionan de forma segura vía variables de entorno.
- **Auth**: Validación de fortaleza de contraseñas integrada en el registro.
- **Storage**: Implementado fallback seguro con advertencia visual para el almacenamiento cifrado cuando no hay soporte nativo.

### Bug Fixes
- Correcciones en el motor de sincronización (Sync Engine) y el manejo de persistencia offline.
- Resolución de inconsistencias de UI al sincronizar estados.

### Performance
- Optimización en el tiempo de carga y tamaño del bundle.
- Mejoras en la persistencia local de React Query.

### UX
- Manejo elegante de errores con avisos al usuario en caso de fallos de cifrado.

### Tests
- Activado el reporte de cobertura en las pruebas automatizadas (CI).

### Infrastructure
- **CI**: Actualizado el flujo de GitHub Actions para usar Node.js 20.
- **CI**: Añadido paso de seguridad con `npm audit --audit-level=high`.
- **Scripts**: Añadido `scripts/health-check.js` para validación rápida de calidad y seguridad local.
