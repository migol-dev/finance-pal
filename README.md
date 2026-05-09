# 💰 Finance Pal (Anteriormente My Finance Mate)

[![Versión](https://img.shields.io/badge/version-1.17.7-orange.svg)](https://github.com/migol-dev/finance-pal/releases)
[![Plataforma](https://img.shields.io/badge/platform-Android-green.svg)](https://capacitorjs.com/)
[![Tecnologías](https://img.shields.io/badge/tech-React%20%7C%20Vite%20%7C%20Capacitor-blue.svg)](https://vitejs.dev/)

**Finance Pal** es una aplicación integral de gestión financiera personal diseñada para ofrecer una experiencia intuitiva, moderna y privada. Construida con React, TypeScript y Capacitor, permite a los usuarios tomar el control total de su dinero directamente desde su dispositivo móvil, sin necesidad de servidores externos.

---

## ✨ Características Principales

*   **Panel de Control (Dashboard):** Visualización rápida de balances, gastos recientes y gráficas interactivas con **Recharts**.
*   **Gestión de Movimientos:** Control detallado de ingresos y gastos puntuales.
*   **Conceptos Fijos:** Automatiza el seguimiento de tus gastos e ingresos recurrentes (renta, suscripciones, sueldo).
*   **Seguimiento de Metas:** Define objetivos de ahorro con barras de progreso visuales y emojis personalizados.
*   **Control de Deudas:** Sistema avanzado para registrar préstamos y realizar un seguimiento de cada abono efectuado.
*   **Vista Anual:** Planificación financiera a largo plazo con un desglose por meses de todo el año.
*   **Historial y ChangeLog:** Registro detallado de cada cambio realizado en la aplicación para una máxima transparencia.
*   **Perfil de Usuario:** Personalización de nombre, avatar y moneda preferida (MXN, USD, EUR, etc.).
*   **Privacidad Total:** Los datos se almacenan localmente en el dispositivo. Incluye herramientas de **Importación/Exportación** en formato JSON.

---

## 🛠️ Stack Tecnológico

*   **Frontend:** React 18 con TypeScript.
*   **Estilos:** Tailwind CSS & shadcn/ui para una interfaz elegante y profesional.
*   **Animaciones:** Framer Motion para transiciones fluidas.
*   **Estado Global:** Zustand con persistencia local.
*   **Gráficas:** Recharts.
*   **Iconografía:** Lucide React.
*   **Móvil:** Capacitor 8 para el despliegue nativo en Android.

---

## 📂 Estructura del Proyecto

```text
/
├── android/            # Proyecto nativo de Android (Capacitor)
├── src/                # Código fuente principal
│   ├── components/     # Componentes de la interfaz
│   │   ├── ui/         # Componentes base (shadcn/ui)
│   │   └── app/        # Componentes específicos (Header, Nav, etc.)
│   ├── pages/          # Vistas principales (Dashboard, Anual, Metas, etc.)
│   ├── store/          # Estado global con Zustand (finance-store.ts)
│   ├── lib/            # Lógica de negocio, tipos y utilidades
│   ├── hooks/          # Hooks personalizados de React
│   └── assets/         # Recursos estáticos (Imágenes, Iconos)
├── public/             # Archivos públicos y manifiestos
└── scripts/            # Scripts de automatización (Iconos, optimización)
```

---

## 🚀 Desarrollo y Compilación

### Requisitos Previos
*   Node.js (v18+)
*   Android Studio

### Instalación
```bash
# Instalar dependencias
npm install
```

### Comandos de Desarrollo
```bash
# Iniciar servidor de desarrollo (Navegador)
npm run dev

# Compilar versión web
npm run build

# Sincronizar con Android
npm run android:copy

# Abrir en Android Studio
npx cap open android
```

### Generación de Recursos
```bash
# Generar iconos de la app
npm run generate-icons
```

---

## 📄 Licencia y Contribuciones
Este proyecto es propiedad de **migol-dev**. Siéntete libre de explorar el código y realizar aportaciones mediante Pull Requests.

*Desarrollado con ❤️ para transformar tus finanzas personales.*
