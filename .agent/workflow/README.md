# 🔄 Flujo de Trabajo Colaborativo: Antigravity ↔ OpenCode

Sistema de orquestación, desarrollo y aseguramiento de calidad multi-agente para **Finance Pal**.

Este entorno divide el desarrollo de software entre dos agentes altamente especializados utilizando **Git Worktrees** y archivos de registro markdown coordinados:

1. **Antigravity CLI** (*Arquitecto & Auditor Lead*): Operando bajo modelos de **Google (Gemini 3.8 Flash / Argon 4)**.
2. **OpenCode CLI** (*Constructor & Implementador*): Operando bajo **DeepSeek 4.1 Flash**.

---

## 📁 Estructura del Directorio `.agent/workflow/`

```text
.agent/workflow/
├── README.md                           # Guía rápida e índice general (este archivo)
├── protocol.md                         # Protocolo detallado, máquina de estados y reglas
├── 01_ARCHITECT_PLAN.md                # 📐 Plan arquitectónico activo (Antigravity)
├── 02_OPENCODE_TASKS.md                # 🛠️ Registro de tareas, checkpoints y bloqueos (OpenCode)
├── 03_ANTIGRAVITY_REVIEW.md            # 🔍 Registro de revisión activa, revisada y pendiente (Antigravity)
├── templates/                          # Plantillas reutilizables para cada ciclo
│   ├── 01_ARCHITECT_PLAN.template.md
│   ├── 02_OPENCODE_TASKS.template.md
│   └── 03_ANTIGRAVITY_REVIEW.template.md
├── prompts/                            # Prompts de sistema listos para inyectar en las CLIs
│   ├── 01_antigravity_architect.prompt.md
│   ├── 02_opencode_builder.prompt.md
│   └── 03_antigravity_reviewer.prompt.md
└── scripts/                            # Herramientas de automatización bash
    ├── worktree-manager.sh             # Administrador de git worktrees (.worktrees/builder)
    └── handoff.sh                      # Asistente de estado, transiciones y prompts
```

---

## ⚡ Guía Paso a Paso: Ciclo Completo de una Tarea

### Paso 1: Planificación (Antigravity CLI — Gemini 3.8 Flash / Argon 4)
1. Antigravity analiza el requerimiento y redacta `.agent/workflow/01_ARCHITECT_PLAN.md`.
2. Antigravity define tipos exactos, componentes, servicios y la lista de tareas numeradas.
3. Al terminar, Antigravity cambia el estado a `🟢 LISTO PARA CONSTRUCCIÓN`.

### Paso 2: Configuración del Worktree & Construcción (OpenCode CLI — DeepSeek 4.1 Flash)
1. Crear el espacio de trabajo aislado para OpenCode:
   ```bash
   ./.agent/workflow/scripts/worktree-manager.sh create nombre-de-la-feature
   ```
2. Iniciar OpenCode en el nuevo worktree:
   ```bash
   cd .worktrees/builder
   opencode
   ```
3. Cargar el prompt correspondiente:
   ```bash
   ../../.agent/workflow/scripts/handoff.sh prompt 2
   ```
4. OpenCode va marcando sus tareas (`[⏳]`, `[✅]`) y registrando commits en `02_OPENCODE_TASKS.md`.
5. Si OpenCode no puede resolver una tarea, la marca `[⚠️]` y la reporta en el **Escalation Log** (Sección 3).
6. Al finalizar, OpenCode marca el estado general como `🟢 COMPLETADO` o `⚠️ COMPLETADO CON BLOQUEOS`.

### Paso 3: Revisión y Cierre (Antigravity CLI — Gemini 3.8 Flash / Argon 4)
1. Antigravity regresa al worktree principal:
   ```bash
   ./.agent/workflow/scripts/handoff.sh status
   ./.agent/workflow/scripts/handoff.sh prompt 3
   ```
2. Antigravity abre `.agent/workflow/03_ANTIGRAVITY_REVIEW.md` y mantiene al día las 3 listas requeridas:
   - 🔍 **Cosas que está revisando actualmente**
   - ✅ **Cosas que ya revisó**
   - ⏳ **Cosas que va a revisar**
3. Antigravity revisa el **Escalation Log** de OpenCode e implementa directamente el código complejo o las correcciones faltantes.
4. Antigravity valida compilación (`tsc`), ejecuta pruebas (`npm test`) y emite el dictamen final (`🟢 APROBADO PARA MERGE`).

### Paso 4: Limpieza y Merge
```bash
# Fusionar rama de builder o cambios
git merge builder/nombre-de-la-feature

# Eliminar worktree secundario
./.agent/workflow/scripts/worktree-manager.sh remove
```

---

## 🛠️ Comandos Rápidos

| Acción | Comando |
| :--- | :--- |
| Ver estado global del flujo | `./.agent/workflow/scripts/handoff.sh status` |
| Saber quién debe actuar ahora | `./.agent/workflow/scripts/handoff.sh next` |
| Obtener prompt de OpenCode | `./.agent/workflow/scripts/handoff.sh prompt 2` |
| Obtener prompt de Antigravity Revisor | `./.agent/workflow/scripts/handoff.sh prompt 3` |
| Crear worktree aislado | `./.agent/workflow/scripts/worktree-manager.sh create <feature>` |
| Ver estado de worktrees | `./.agent/workflow/scripts/worktree-manager.sh status` |
| Eliminar worktree | `./.agent/workflow/scripts/worktree-manager.sh remove` |
