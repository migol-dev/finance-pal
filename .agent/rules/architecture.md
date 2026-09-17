# Finance Pal - Reglas de Arquitectura y Configuración

## Stack Tecnológico
- **Frontend Framework:** React 18
- **Lenguaje:** TypeScript
- **Bundler / Dev Server:** Vite 8
- **Mobile (Híbrido):** Capacitor 8 (Android)
- **Estilos:** Tailwind CSS, Radix UI (shadcn/ui), Framer Motion
- **Backend / Auth / BD:** Supabase
- **Estado Global:** Zustand
- **Estado de Servidor / Caché:** TanStack React Query (con persistencia local)
- **Formularios y Validación:** React Hook Form + Zod
- **Testing:** Vitest + React Testing Library

## Estructura de Directorios Principal

### Directorios Raíz
- `/src`: Código fuente principal de la aplicación.
- `/android`: Proyecto nativo de Android gestionado por Capacitor.
- `/supabase`: Configuración de base de datos, Edge Functions y migraciones de Supabase.
- `/scripts`: Scripts utilitarios (Node.js) para compilación, generación de iconos y mantenimiento.
- `/public`: Archivos estáticos públicos y `index.html`.
- `/dist`: Archivos compilados listos para producción.

### Directorios de `/src`
- `/src/pages`: Vistas principales y componentes enlazados al enrutamiento (React Router).
- `/src/components`: Componentes reutilizables de UI (incluyendo los base de shadcn/ui).
- `/src/store`: Archivos para la gestión del estado global utilizando Zustand.
- `/src/context`: Proveedores de estado utilizando React Context (ej. temas, auth base).
- `/src/hooks`: Custom hooks de React para lógica reutilizable y manejo de APIs.
- `/src/lib`: Utilidades, funciones puras e inicialización de clientes externos (ej. instancia de Supabase).
- `/src/assets`: Recursos estáticos (CSS global, imágenes, fuentes locales).
- `/src/test`: Utilidades y configuraciones compartidas de testing.

## Reglas de Codificación y Buenas Prácticas

1. **Tipado Estricto:** Todo el código debe estar escrito en TypeScript. Define interfaces o tipos explícitos para todas las variables, props, entidades de Supabase y respuestas de API. Evita siempre el uso de `any`.
2. **Gestión de Estado:** 
   - Utiliza **TanStack React Query** para interactuar con la API (Supabase), realizar llamadas asíncronas y cachear datos en el cliente.
   - Utiliza **Zustand** estrictamente para el estado global de la interfaz o preferencias de usuario.
   - Utiliza el estado local (`useState`) sólo para el control interno de un componente aislado.
3. **Componentes y Estilizado:** 
   - Sigue el enfoque de componentes funcionales.
   - Estiliza utilizando clases utilitarias de **Tailwind CSS**. Evita escribir CSS a mano a menos que sea estrictamente necesario.
   - Mantén la coherencia visual reutilizando los componentes creados con Radix UI / shadcn/ui.
4. **Formularios y Validación:** Usa siempre `react-hook-form` para la gestión de formularios y `zod` para validar fuertemente los esquemas de datos antes de enviarlos a Supabase.
5. **Arquitectura Multiplataforma (Mobile-First):** Dado que el proyecto usa **Capacitor** para desplegar en Android, el diseño debe ser 100% responsivo y pensado primero para móviles.
   - Para interactuar con características del dispositivo (notificaciones, sistema de archivos, compartir, red), utiliza siempre los plugins oficiales de Capacitor (ej. `@capacitor/local-notifications`, `@capacitor/filesystem`).
6. **Backend e Integración:** El acceso a datos se debe centralizar a través del SDK de `@supabase/supabase-js`. Estas interacciones deben estar preferiblemente abstraídas mediante custom hooks y envueltas en React Query.

## Flujo de Trabajo Híbrido (OpenCode + Antigravity)

1. **Sinergia y División de Responsabilidades:**
   - **Antigravity (IA):** Automatiza la generación y refactorización de código, realiza análisis estructurales, opera la terminal (ej. Capacitor, migraciones) y asegura que las convenciones definidas en este documento se respeten.
   - **OpenCode (Desarrollador):** Provee el contexto de negocio profundo, toma las decisiones finales de arquitectura, orquesta los requerimientos de cada tarea y valida/testea visual y funcionalmente el resultado final.

2. **Metodología de Interacción:**
   - **Contexto Previo:** Al abrir una nueva sesión, Antigravity debe consultar implícita o explícitamente estas directrices para alinearse con el stack y las decisiones arquitectónicas previas.
   - **Instrucciones Claras:** Las tareas enviadas a Antigravity deben ser enfocadas y modulares (ej. "Refactoriza el hook de autenticación en `/src/hooks` usando la configuración actual de Supabase").
   - **Validación Continua:** Tras los cambios realizados por Antigravity, el desarrollador verifica los resultados en su entorno local (OpenCode) antes de avanzar al siguiente bloque lógico, garantizando un desarrollo iterativo y sin regresiones.

3. **Mantenimiento del Conocimiento:**
   - Cualquier cambio importante en la arquitectura, integración de nuevas librerías base, o ajuste en las convenciones de codificación deberá ser documentado actualizando este mismo archivo (`architecture.md`), manteniéndolo como la única fuente de verdad para el comportamiento del agente.
