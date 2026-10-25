# FinancePal v2.0.0 — Warm Editorial Wealth 🏛️✨

> **La evolución generacional de FinancePal:** Gestión patrimonial serena, privada y en alta fidelidad.  
> Diseñada bajo arquitectura **Local-First**, cifrado cliente con **WebCrypto AES-GCM 256-bit**, una estética editorial de alta gama y accesibilidad certificada **WCAG AAA/AA**.

---

## 🌟 Lo Nuevo en FinancePal v2.0.0

### 🏛️ 1. Sistema de Diseño V2: *Warm Editorial Wealth*
- **Nueva atmósfera visual:** Canvas cálido en alabastro (`#FAF8F5`) para el modo claro y obsidiana profundo (`#0C0C0B` / `#141413`) para el modo oscuro, con separadores milimétricos de 1px (`#E4E0D8` / `rgba(255,255,255,0.1)`).
- **Tipografía Editorial:** Encabezados en tipografía serif de alta jerarquía visual (`Instrument Serif`), cuerpo en `Plus Jakarta Sans` y cifras numéricas en `JetBrains Mono` con alineación tabular (`tabular-nums`) para evitar saltos de diseño.
- **Microfísica e Interacción Táctil:** Transiciones basadas en curvas cubic-bezier elásticas, retroalimentación al toque (`active:scale-[0.98]`), micro-física sin librerías pesadas y rendimiento optimizado a **60–120 fps**.
- **Alternancia V2 y Classic:** Quienes prefieran el diseño anterior pueden cambiar a la interfaz clásica en cualquier momento desde **Ajustes → Apariencia**.

---

### 🗂️ 2. Metas Financieras con Carpetas Jerárquicas y Drag & Drop
- **Subcarpetas multinivel:** Organiza tus metas en carpetas y subcarpetas ilimitadas (ej. *Vacaciones*, *Fondo de Emergencia*, *Inversiones*).
- **Reorganización táctil:** Soporte completo de arrastrar y soltar (Drag & Drop con HTML5 y puntero táctil) tanto en escritorio como en móviles.
- **Barra móvil simplificada:** En pantallas móviles, la barra superior muestra limpiamente 3 opciones fijas (`Todas`, `Sin carpeta` y `Carpetas`), abriendo un cajón lateral (*drawer*) completo para navegar sin que los botones se desborden.

---

### 🏷️ 3. Sistema de Categorías Cotidianas y Personalizadas
- **15 Categorías Universales por Defecto:** Selección renovada con categorías generales y cotidianas (*Alimentación*, *Transporte*, *Vivienda*, *Servicios*, *Salud*, *Educación*, *Entretenimiento*, *Compras*, *Familia y Mascotas*, *Trabajo / Sueldo*, *Negocio / Ventas*, *Ahorro e Inversión*, *Deudas*, *Regalos*, *Otros*).
- **Categorías Personalizadas con Límite Inteligente:** Crea tus propias categorías con nombre (máximo 20 caracteres para asegurar legibilidad perfecta en cualquier pantalla) y un emoji personalizado.
- **Creación Inline:** Opción rápida `+ Crear nueva categoría...` directamente en el selector de transacciones y movimientos recurrentes, sin tener que salir del formulario.
- **Administrador en Ajustes:** Sección dedicada en **Ajustes → Categorías** con edición, eliminación segura y confirmación elegante.
- **Retrocompatibilidad Histórica:** Las transacciones registradas con categorías de versiones anteriores conservan su ícono automáticamente.

---

### ⚡ 4. Arranque Estricto y Motor de Tema desde el Segundo 1
- **Cero destellos de luz (Zero-Flash):** Detección síncrona en el `<head>` del HTML que lee las preferencias del usuario o el tema del sistema operativo antes del primer renderizado de React, evitando parpadeos blancos.
- **Selector en Login y Registro:** Selector dinámico de tema (`Auto` / `Claro` / `Oscuro`) disponible inmediatamente en las pantallas de inicio de sesión y registro.
- **Secuencia de bienvenida:** Al abrir o recargar la aplicación, la animación de bienvenida (`SplashScreen`) se presenta desde el milisegundo 0; los esqueletos de carga (*skeletons*) únicamente se muestran si los datos aún continúan sincronizándose tras finalizar la bienvenida.

---

### 📊 5. Resumen Anual Macroeconómico Rediseñado
- **Navegación de Ancho Completo:** Selector segmentado de 4 columnas (*General*, *Categorías*, *Métodos*, *Metas*) con pastillas activas de alto contraste y botones táctiles holgados.
- **Desglose de Categorías:** Visualización de porcentajes, barras de progreso y emojis identificadores por cada rubro de gasto anual.
- **Detección de Anomalías:** Indicadores de mejor mes, mes con déficit y mayor gasto, con navegación directa en un solo toque.

---

### 🔐 6. Seguridad y Arquitectura Local-First
- **Almacenamiento Local Cifrado:** Toda la base de datos local en IndexedDB se cifra mediante WebCrypto con claves derivadas por PBKDF2 y salting/peppering.
- **Autenticación Fuerte:** Soporte de 2FA TOTP con verificación forzada, límite de intentos (*rate limiting*) y protección contra contraseñas filtradas mediante la API k-Anonymity de *Have I Been Pwned*.
- **Control de Sesiones Multi-dispositivo:** Detección de sesiones activas en otros equipos con diálogo de resolución de conflictos y migración segura.
- **Respaldo en la Nube Bajo Demanda:** Sincronización opcional con Supabase y respaldo exportable en JSON encriptado.

---

### 🎨 7. Nueva Identidad Visual y Tarjetas Sociales (OpenGraph)
- **Favicon Vectorial V2:** Nuevo isotipo oficial con el monograma continuo FP y la moneda dorada/esmeralda, disponible en SVG, ICO multi-resolución y PNG para PWA/Android.
- **Social Share Card (1200 x 630 px):** Tarjeta OpenGraph y Twitter Card integrada que genera previsualizaciones ricas y atractivas al compartir el enlace en WhatsApp, Telegram, Twitter/X, Discord, LinkedIn y Facebook.
- **Título Web Limpio:** El título de la pestaña ahora es conciso: **`FinancePal`**.

---

## 🧪 Métricas de Calidad y Testing

- **Tests Automatizados:** **40 suites de prueba · 299 tests pasando (100% en verde)** con Vitest y React Testing Library.
- **TypeScript:** Cero errores en modo estricto (`npx tsc --noEmit`).
- **Accesibilidad:** Pruebas automatizadas de contraste WCAG AAA/AA, áreas de toque mínimas de 44x44px y navegación por teclado con anillos de foco visibles.
- **Compilación de Producción:** Compilación limpia en Vite 8 con división óptima de módulos vendor (*bundle splitting*).

---

## 📦 Instrucciones de Actualización

Si tienes una versión anterior instalada:
1. **Web:** La actualización se aplica automáticamente al recargar. Los datos almacenados localmente se migran de forma transparente a los nuevos esquemas.
2. **PWA / Android:** La aplicación notificará la actualización disponible o actualizará el Service Worker en segundo plano.
3. Tus transacciones, cuentas, presupuestos y metas existentes se conservan intactos.

---

*FinancePal · Hecho con dedicación para darte soberanía sobre tu dinero.*
