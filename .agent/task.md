# Especificación de Tarea Activa (`.agent/task.md`)

> **Estado:** ⚪ EN ESPERA DE NUEVA TAREA  
> **Flujo de Trabajo Multi-Agente:** Ver [`.agent/workflow/README.md`](file:///run/media/migol/Files/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/.agent/workflow/README.md) y [`.agent/workflow/protocol.md`](file:///run/media/migol/Files/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/.agent/workflow/protocol.md).

---

## Cómo Iniciar un Nuevo Sprint

1. **Fase 1 — Planificación Arquitectónica (`Antigravity CLI` — Gemini 3.8 Flash / Argon 4):**
   - Define el diseño técnico en `.agent/workflow/01_ARCHITECT_PLAN.md`.
   - Desglosa las tareas secuenciales y checkpoints en `.agent/workflow/02_OPENCODE_TASKS.md`.
   - Prepara los criterios de revisión en `.agent/workflow/03_ANTIGRAVITY_REVIEW.md`.
2. **Fase 2 — Construcción e Implementación (`OpenCode CLI` — DeepSeek 4.1 Flash):**
   - Ejecuta `./.agent/workflow/scripts/handoff.sh next` y `./.agent/workflow/scripts/handoff.sh prompt 2`.
   - Implementa las tareas y registra cada commit atómico (`CP-XX`) en `.agent/workflow/02_OPENCODE_TASKS.md`.
3. **Fase 3 — Revisión, Resolución de Escalaciones y Cierre (`Antigravity CLI`):**
   - Ejecuta `./.agent/workflow/scripts/handoff.sh prompt 3`.
   - Audita los cambios, resuelve ítems `[⚠️]` y firma el cierre en `.agent/workflow/03_ANTIGRAVITY_REVIEW.md`.
