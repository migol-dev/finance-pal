# FinancePal v2.1.0 - Release Notes

Actualización enfocada en la experiencia nativa de Android, coherencia visual sin emojis bajo la estética Warm Editorial Wealth, registro rápido inteligente, comprobantes seguros en la nube y herramientas visuales para tus cuentas.

---

## Lo Nuevo en FinancePal v2.1.0

### 1. Actualización Automática In-App en Android y Descarga Directa (`financemate.apk`)
- **Detección exclusiva para Android nativo**: La app verifica automáticamente nuevas versiones estables en GitHub Releases únicamente cuando se ejecuta en Android (`Capacitor`), manteniendo la versión Web/PWA sin avisos innecesarios.
- **Comparación semántica y control de caché**: Compara la versión nativa instalada contra las releases publicadas de forma semántica (incluyendo pre-releases como `alpha`, `beta` y `rc`), ignora borradores o pre-releases en el canal estable, cachea resultados durante 6 horas para cuidar datos y batería, y respeta el descarte de una versión (`Luego`) hasta que salga una versión superior.
- **Descarga segura en un toque**: Identifica automáticamente el archivo `financemate.apk` de la última release, valida que el enlace pertenezca estrictamente a dominios HTTPS confiables de GitHub/CDN y abre la descarga directamente en el navegador del sistema.
- **Banner editorial integrado (`UpdateNotification`)**: Nuevo banner superior adaptado a la paleta `Warm Editorial Wealth` con margen seguro (`safe-area-inset-top`), logotipo oficial, transición de versiones en monospace, tamaño exacto del paquete APK, acordeón `Ver novedades` y acciones directas (`Descargar APK` y `Luego`), además de re-verificación al volver la app a primer plano.
- **Centro de actualizaciones en Ajustes -> Seguridad y Sistema**:
  - En **Android**: botón interactivo **Buscar actualización**, visualización de novedades, tamaño del APK y descarga directa de `financemate.apk`, junto con un distintivo de actualización en el hub de Ajustes.
  - En **Web / Escritorio**: tarjeta informativa con la versión activa de la aplicación web sin controles de APK.

### 2. Sistema Completo de Iconos Vectoriales SVG (Cero Emojis en Interfaz V2)
- **Registro tipado de iconos (`AppIcon`)**: Nueva biblioteca vectorial SVG con iconos financieros personalizados y categorías cotidianas adaptables automáticamente a modo claro, oscuro y alto contraste.
- **Selectores unificados sin emojis**: Tanto `IconPicker` al crear o editar categorías como el selector rápido de transacciones ahora utilizan iconos SVG limpios en lugar de emojis.
- **Limpieza integral y compatibilidad**: Eliminación completa de emojis en todas las vistas V2 (`Inicio`, `Movimientos`, `Deudas`, `Metas`, `Anual`, `Ajustes`) y en notificaciones locales/push, traduciendo al vuelo cualquier icono legado que el usuario tuviera guardado y respaldado por una verificación automática anti-emojis en el código V2.

### 3. Registro Rápido Inteligente (`QuickTransactionSheet`)
- **Métodos de pago guiados por cuenta**:
  - Las cuentas de **Efectivo** asignan automáticamente el método `Efectivo · Automático`.
  - Las cuentas **Bancarias** muestran únicamente opciones válidas (`Tarjeta` y `Transferencia`).
  - Otras cuentas habilitan `Tarjeta`, `Transferencia` y `Otro`.
- **Detalles de transferencia más limpios y colapsables**: Campos opcionales ordenados para destinatario/remitente, banco y cuenta de origen/destino (validando últimos 4 dígitos o CLABE de 18 dígitos), eliminando campos ruidosos como clave de rastreo y referencia.
- **Adjunto de comprobantes desde el flujo rápido**: Carga y vista previa inmediata sin salir de la hoja de registro.

### 4. Comprobantes Seguros y Almacenamiento Endurecido en Supabase
- **Pipeline de validación y compresión en el dispositivo**: Verifica la firma binaria real (*magic bytes*) para aceptar únicamente imágenes JPEG, PNG o WebP válidas (hasta 10 MB de entrada), las optimiza/redimensiona en el cliente y limita el archivo final a un máximo de 5 MB antes de subirlo.
- **Referencias persistentes sin caducidad**: Las transacciones guardan referencias lógicas estables (`sb:receipts/<userId>/...`) en lugar de URLs firmadas expirables; la aplicación genera y cachea URLs firmadas frescas bajo demanda al visualizar el comprobante (manteniendo lectura retrocompatible para comprobantes legados).
- **Bucket privado reforzado**: Migración aplicada en Supabase Storage que asegura el bucket privado `receipts` por usuario con límite estricto de 5 MB por objeto y restricción de tipos MIME permitidos a `image/webp`, `image/jpeg` e `image/png`.

### 5. Gráficos SVG Interactivos y Visibilidad de Cuentas
- **Gráfico `DonutChart` en SVG**: Nuevo componente vectorial tema-adaptativo con selección interactiva por segmento y cálculo de porcentajes exactos que suman `100.0%`.
- **Ajustes -> Cuentas mejorado**: Corrección de visibilidad del saldo de cuentas en pantallas móviles e integración de gráficos interactivos para visualizar la distribución del saldo entre cuentas positivas y el desglose del efectivo por denominaciones.

### 6. Navegación Móvil Refinada y Experiencia Nativa Android
- **Deudas en la navegación principal**: Promoción de **Deudas** a la barra inferior móvil junto con **Inicio**, **Movimientos** y **Metas**, facilitando el acceso directo en un toque.
- **Orden lógico de gestos *swipe***: Secuencia alineada entre vistas principales: `Inicio` -> `Movimientos` -> `Metas` -> `Deudas`.
- **Menú `Más opciones` en cabecera**: Nuevo botón compacto en la barra superior para pantallas móviles y tablets que abre el panel hacia `Anual`, `Historial` y `Ajustes`.
- **Pulido nativo Android y seguridad**: Desplazamiento táctil fluido en *drawers* y hojas inferiores sin bloqueos de WebView, corrección de encabezados truncados en móviles, icono de lanzador nativo v2 y publicación de la política de divulgación responsable de vulnerabilidades (`SECURITY.md`).

---

## Verificación y Calidad Técnica

- **Pruebas automatizadas**: 52 archivos de prueba y 382 pruebas unitarias e integradas pasando al 100% con Vitest y React Testing Library.
- **Compilación de producción**: Build de producción web/Capacitor verificado limpiamente con Vite 8.
- **Versionado sincronizado**: Identificadores actualizados a `2.1.0` (`versionCode 20100` en Android Gradle y `package.json`).

---

## Notas de Actualización y Publicación

1. **Web / PWA**: Disponible automáticamente al desplegar la rama principal (`main`) sin pérdida ni migración destructiva de datos locales.
2. **Android (`financemate.apk`)**:
   - Al generar e instalar el nuevo `financemate.apk` firmado correspondiente al tag `v2.1.0`, la aplicación reconocerá internamente la versión `2.1.0` (`20100`) y no volverá a mostrar el aviso hasta que exista una versión superior (como `v2.1.1` o `v2.2.0`).
   - Recuerda adjuntar el archivo compilado con el nombre exacto `financemate.apk` dentro de los assets de la release `v2.1.0` en GitHub.
