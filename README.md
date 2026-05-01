# 💰 My Finance Mate (MI FINANZAS MATE)

[![Versión](https://img.shields.io/badge/version-beta-orange.svg)](https://github.com/migol-dev/my-finance-mate/releases/tag/beta)
[![Plataforma](https://img.shields.io/badge/platform-Android-green.svg)](https://capacitorjs.com/)
[![Tecnologías](https://img.shields.io/badge/tech-React%20%7C%20Vite%20%7C%20Capacitor-blue.svg)](https://vitejs.dev/)

**My Finance Mate** es una aplicación multiplataforma (diseñada principalmente para Android) que permite gestionar tus finanzas personales de manera intuitiva, moderna y eficiente. Desarrollada con tecnologías web de vanguardia y empaquetada con Capacitor, ofrece una experiencia de usuario fluida con una interfaz estética basada en **shadcn/ui** y **Tailwind CSS**.

---

## 🚀 Instalación (Android)

Para disfrutar de la aplicación en tu dispositivo Android, sigue estos pasos:

1.  **Descarga el APK:** Ve a la sección de lanzamientos oficial: [Release Beta - My Finance Mate](https://github.com/migol-dev/my-finance-mate/releases/tag/beta).
2.  **Permitir Fuentes Desconocidas:** Si es la primera vez que instalas un APK fuera de la Play Store, tu teléfono te pedirá permiso para "Instalar aplicaciones de fuentes desconocidas". Actívalo para tu navegador o explorador de archivos.
3.  **Instala y Disfruta:** Abre el archivo `.apk` descargado y sigue las instrucciones en pantalla.

---

## 🛠️ Estructura del Proyecto

El proyecto está organizado siguiendo las mejores prácticas de desarrollo web moderno, separando la lógica de negocio de la interfaz de usuario.

### Carpetas Principales

*   **`/android`**: Proyecto nativo de Android generado por Capacitor. Contiene la configuración de Gradle, el manifiesto de la app y los recursos nativos (iconos, splash screen).
*   **`/src`**: Código fuente de la aplicación web.
    *   **`/components`**: Componentes reutilizables.
        *   **`/ui`**: Componentes base de diseño (botones, inputs, tarjetas) usando **shadcn/ui**.
        *   **`/app`**: Componentes específicos de la lógica de la app (Header, BottomNav, MonthSwitcher).
    *   **`/pages`**: Vistas principales de la aplicación (Dashboard, Metas, Deudas, Historial).
    *   **`/store`**: Gestión del estado global utilizando **Zustand**. El archivo `finance-store.ts` es el corazón de la lógica de datos.
    *   **`/hooks`**: Hooks personalizados de React para encapsular lógica repetitiva.
    *   **`/lib`**: Utilidades, tipos de TypeScript y funciones de ayuda para cálculos financieros.
*   **`/public`**: Activos estáticos como el icono de la aplicación y manifiestos.

---

## 🧠 Funcionamiento Interno

### 1. Gestión de Datos (Zustand)
La aplicación utiliza un almacenamiento persistente en el dispositivo. No necesitas conexión a internet para usarla. El estado global maneja:
*   **Conceptos Fijos:** Ingresos o gastos recurrentes (renta, suscripciones, sueldo).
*   **Transacciones:** Movimientos puntuales de dinero.
*   **Metas de Ahorro:** Seguimiento de objetivos con barras de progreso.
*   **Deudas:** Registro de préstamos y abonos realizados.
*   **Registro de Cambios (ChangeLog):** Historial detallado de cada acción realizada.

### 2. Flujo de Usuario
*   **Dashboard:** Una vista general con gráficas de tus gastos, balance actual y acceso rápido a los movimientos del mes activo.
*   **Selector de Mes/Año:** Permite navegar entre diferentes periodos para ver proyecciones o registros pasados.
*   **Personalización:** Soporta múltiples monedas (MXN, USD, EUR, etc.) y modo oscuro/claro.

### 3. Seguridad y Privacidad
Tus datos son **tuyos**. La aplicación no envía información a servidores externos. Todo se guarda localmente y tienes la opción de **Exportar/Importar** tu base de datos en formato JSON para copias de seguridad manuales.

---

## 💻 Desarrollo y Compilación

Si eres desarrollador y quieres modificar el proyecto:

### Requisitos
*   Node.js (v18+)
*   Android Studio (para compilar el APK)

### Comandos Clave
```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo (Navegador)
npm run dev

# Construir la versión web
npm run build

# Sincronizar cambios con el proyecto Android
npx cap sync android

# Abrir el proyecto en Android Studio
npx cap open android
```

---

## ✨ Características Destacadas
*   **Interfaz Adaptativa:** Se ve increíble tanto en móviles como en tablets.
*   **Gestión de Deudas Avanzada:** No solo anotas cuánto debes, sino que puedes registrar cada abono individual.
*   **Metas Visuales:** Usa emojis y gradientes personalizados para motivarte a ahorrar.
*   **Notificaciones Locales:** Integración con `@capacitor/local-notifications` para recordatorios financieros (en desarrollo).

---

## 📄 Licencia
Este proyecto es publico y propiedad de **migol-dev**. Todos los derechos reservados. aún asi, sientete libre de realizar tu aportación.

---
*Desarrollado con ❤️ para mejorar tu salud financiera.*
