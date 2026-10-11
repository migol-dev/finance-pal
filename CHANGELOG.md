# Changelog

## [1.21.0] - 2026-10-11

### Sistema Integral de Notificaciones Inteligentes y Autonomas (Web/PWA, Android y Nube)
- **Motor autonomo de programacion y entrega (`useNotificationScheduler`)**: Reprogramacion reactiva con debounce ante cambios en metas, conceptos fijos, movimientos o preferencias, evaluacion periodica en segundo plano cada 15 minutos, re-evaluacion al recuperar foco (`visibilitychange`) y registro de deduplicacion en almacenamiento local con TTL de 45 dias.
- **Alertas de gastos, ingresos y ahorros recurrentes (9 frecuencias)**: Soporte completo para calculo de ocurrencias en frecuencias `monthly`, `biweekly` (quincenal), `weekly`, `bimonthly`, `quarterly`, `fourmonthly`, `biannual`, `yearly` y `one_time`, respetando cierres de mes (dias 29, 30 y 31), filtros independientes por tipo de movimiento, dias de anticipacion configurables (`0` a `60` dias antes) y omision opcional cuando el movimiento ya fue registrado.
- **Alertas de limites y atraso lineal en Metas de Ahorro**: Calculo matematico real del ritmo esperado vs ahorro acumulado (`expectedGoalAt`, `actualGoalAt`, `statusForGoal`, `paceForGoal`) considerando tanto el saldo inicial como el historial de aportaciones. Incluye alertas por cercania de fecha limite, metas vencidas y atraso respecto al plan con sensibilidad configurable (`2%`, `5%`, `10%`) y frecuencia de repeticion (`daily`, `every_3_days`, `weekly`, `once`).
- **Solicitud de permisos con gesto de usuario y panel 100% personalizable**: Nuevo banner flotante `NotificationPermissionPrompt` y rediseño completo de `NotificacionesSection` en 6 tarjetas modulares (estado del permiso en tiempo real, canales de entrega local/push/in-app toast, privacidad con ocultacion de montos `$•••`, configuracion granular de recurrentes y metas, horario preferido, desplazamiento inteligente fuera del horario silencioso y boton de prueba inmediata).
- **Entrega nativa en Android y Service Worker en Web/PWA**: Creacion del recurso vectorial `ic_stat_notification`, canal de alta importancia `finance_pal_reminders`, soporte para Android Doze Mode (`allowWhileIdle: true`), permisos `RECEIVE_BOOT_COMPLETED`, `VIBRATE` y `SCHEDULE_EXACT_ALARM`, y despacho en Web mediante `ServiceWorkerRegistration.showNotification()`.
- **Sincronizacion de preferencias en Supabase y Edge Function `send-reminders`**: Persistencia de `notification_prefs` en `user_settings` con fallback automatico de columnas, soporte de autenticacion para `pg_cron` y respeto estricto de las preferencias y horario silencioso de cada usuario en envios Web Push.

### Conceptos Fijos y Auto-Registro de Movimientos Recurrentes
- **Reconciliacion automatica de movimientos programados vencidos (`getDueOccurrencesForFixedItem`)**: Registro idempotente mediante UUID deterministico (`buildScheduledTxId`) tanto en modo local (Zustand) como con sesion activa en Supabase (React Query), garantizando que los cargos o ingresos recurrentes se asienten aunque la aplicacion se abra dias despues de la fecha de cobro.
- **Unificacion de frecuencias y proyecciones anuales**: Soporte completo de frecuencia quincenal (`biweekly`), normalizacion de `annual` a `yearly`, ampliacion de `payDay` hasta el dia `31` en validadores Zod y prevencion de doble conteo entre proyecciones fijas y transacciones registradas en el balance anual (`Anual.tsx`) y `Dashboard.tsx`.
- **Correccion visual de iconos personalizados y tipografia**: Incorporacion de tokens fraccionarios (`4.5`, `5.5`, `8.5`) en Tailwind CSS para evitar el desborde de imagenes `192x192px` en `FijosSection.tsx` y `PerfilSection.tsx`, correccion del calculo de monto mensual equivalente (`monthlyAmount`) y eliminacion del hash SRI estatico en Google Fonts (`index.html`).

### Calidad, Arquitectura y Pruebas
- **Cumplimiento estricto de la fachada `useFinanceData`**: Migracion de `AppShell.tsx`, `AjustesHub.tsx` y `NotificacionesSection.tsx` para consumir exclusivamente `useFinanceData` e hidratacion profunda (`merge`) en Zustand v5.
- **Suite de pruebas ampliada**: 29 archivos de prueba y 109 tests unitarios y de integracion pasando al 100% (incluyendo las nuevas suites `notifications.test.ts` y `ensureScheduled.test.ts`).

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
