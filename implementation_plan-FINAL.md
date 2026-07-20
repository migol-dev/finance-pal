# Plan de Acción: Transición a Supabase (Offline-First)

Este plan detalla la migración de Finance Pal hacia una arquitectura en la nube con Supabase, manteniendo el funcionamiento **Offline** y asegurando un proceso de transición **sin riesgos** para el código actual. Se han descartado las funciones de IA para ajustarse al presupuesto actual.

> [!IMPORTANT]
> Sigo sin modificar tu código fuente. Este es el plan maestro detallado. Revisa la estrategia de integración continua y el paso a paso. Si apruebas este plan, podemos empezar con el **Paso 0** y **Paso 1**.

---

## 1. 🛡️ Estrategia de Transición Segura (Cero Riesgos)

Para no romper el proyecto actual y poder volver atrás ("rollback") en caso de cualquier fallo, utilizaremos las siguientes técnicas profesionales:

- **Control de Versiones (Git Branching):**
  - No trabajaremos en la rama `main`. Crearemos una rama dedicada llamada `feature/supabase-migration`. Todo el desarrollo ocurrirá aquí. Si algo sale mal, `main` sigue intacto y funcional.
- **Feature Flags (Banderas de Funcionalidades):**
  - Crearemos una variable de entorno en Vite (ej. `VITE_ENABLE_SUPABASE=false`).
  - Durante el desarrollo, la app leerá esta bandera. Si es `false`, la app funcionará exactamente como ahora (Local-first, Zustand). Si es `true`, usará la nueva lógica de Supabase. Esto nos permite tener **ambos sistemas conviviendo** hasta que estemos 100% listos para apagar el viejo.
- **Lanzamiento Progresivo (Shadowing):**
  - Al principio, cuando guardes un movimiento, lo guardaremos tanto en el JSON local como en Supabase en segundo plano. Esto asegura que no pierdas tus datos locales mientras probamos que el servidor funciona correctamente.

---

## 2. 📶 Arquitectura Offline-First con Supabase

Para cumplir tu requisito de que la app funcione sin internet y avise sobre "cambios sin sincronizar", implementaremos este modelo:

- **La Fuente de Verdad Híbrida (Caché Persistente):**
  - Seguiremos usando el almacenamiento del teléfono como caché ultrarrápida.
- **Cola de Mutaciones Offline (Offline Queue):**
  - Si el usuario registra un gasto (mutación) y **no hay internet**, la app lo guarda en una lista local llamada `syncQueue` (Cola de sincronización).
  - La interfaz de usuario (UI) se actualiza inmediatamente (*Optimistic UI*), dándole la sensación al usuario de que la acción fue un éxito.
- **Indicador Visual de Sincronización:**
  - En el Dashboard superior, añadiremos un icono ☁️.
  - 🟢 **Sincronizado:** Todo está en la nube.
  - 🟡 **Offline:** "Tienes 3 cambios sin sincronizar".
  - 🔵 **Sincronizando:** Animación de carga cuando el internet vuelve y la `syncQueue` se vacía enviando los datos a Supabase.
- **Resolución de Conflictos:**
  - Al recuperar la conexión, la app subirá los datos locales y luego descargará el estado más reciente de la base de datos para asegurarse de que todo coincida (por si el usuario editó algo en su PC al mismo tiempo).

---

## 3. 🗺️ Ruta Sugerida Paso a Paso (Checkpoints)

Dividiremos el trabajo en fases pequeñas y comprobables. No pasaremos a la siguiente hasta que la actual funcione perfectamente.

### Paso 0: Preparación del Entorno
- Crear rama `feature/supabase-migration`.
- Configurar proyecto en el dashboard web de Supabase.
- Instalar dependencias (`@supabase/supabase-js`).
- Añadir Feature Flags (`VITE_ENABLE_SUPABASE`) en el `.env`.
- **Checkpoint 0:** La app compila y funciona exactamente igual que antes, pero ya tiene las dependencias listas.

### Paso 1: Autenticación (Auth)
- Implementar interfaz de Login y Registro (separada de las pantallas principales).
- Configurar sesión de usuario en un Contexto de React.
- **Checkpoint 1:** El usuario puede crearse una cuenta e iniciar sesión en Supabase. Si activa el Feature Flag, la app exige login; si no, entra directo a los datos locales.

### Paso 2: Diseño y Configuración de la Base de Datos
- Crear tablas en PostgreSQL (Supabase) idénticas a las interfaces actuales: `transactions`, `goals`, `fixed_items`, `debts`, etc.
- Configurar **RLS (Row Level Security)**: Política estricta donde `user_id == auth.uid()` para que nadie vea datos ajenos.
- **Checkpoint 2:** Base de datos lista para recibir información segura.

### Paso 3: Motor Offline y Sincronización (El núcleo)
- Crear el gestor de red (`NetworkManager`) que detecta si hay internet o no usando Capacitor Network API.
- Crear la `syncQueue` (Cola de sincronización) en Zustand para almacenar acciones fallidas temporalmente.
- Configurar React Query con Persistencia (para que guarde la lectura de Supabase en disco y cargue rápido sin internet).
- Implementar el indicador visual (Nube ☁️) en el Dashboard.
- **Checkpoint 3:** Puedes registrar un gasto en modo avión, la UI se actualiza, la nube se pone amarilla ("1 cambio sin sincronizar"), y al quitar el modo avión, se sube solo y la nube se pone verde.

### Paso 4: Migración de Módulos (Uno por uno)
Para evitar errores masivos, cambiaremos módulo por módulo:
- **Semana A:** Migrar solo `Cuentas` y `Movimientos`.
- **Semana B:** Migrar `Conceptos Fijos` y `Metas`.
- **Semana C:** Migrar `Deudas` y almacenamiento de **Recibos** (fotos) hacia Supabase Storage.
- **Checkpoint 4:** Toda la app lee y escribe de Supabase cuando el Feature Flag está encendido. La app es completamente funcional online y offline.

### Paso 5: Script de Migración Local -> Nube
- Cuando el usuario actualice la app por primera vez, necesitaremos subir sus datos locales viejos (del JSON actual) hacia Supabase para que no pierda su historial.
- Crearemos una pantalla de "Migrando tus datos a la nube... por favor no cierres la app".
- **Checkpoint 5:** Un usuario antiguo instala la actualización y en 10 segundos ve su historial intacto, pero ahora respaldado en servidores.

### Paso 6: Limpieza y Despliegue Final (Merge)
- Borrar todo el código viejo de persistencia de Zustand que ya no se use.
- Eliminar el Feature Flag.
- Unir (Merge) la rama `feature/supabase-migration` a `main`.
- Compilar para Android y desplegar versión web.
- **Checkpoint Final:** Proyecto migrado al 100%, limpio, seguro, escalable y con soporte Multi-dispositivo.

---

## 🗣️ Próximos Pasos

Esta ruta garantiza que en cualquier momento podemos pausar el desarrollo, desactivar el "Feature Flag" o cambiar de rama, y tú puedes compilar y usar tu app original sin que esté rota.

**Si el plan te parece sólido, avísame y comenzaremos inmediatamente a ejecutar el `Paso 0` y `Paso 1`.**
