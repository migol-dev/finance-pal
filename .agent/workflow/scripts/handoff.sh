#!/usr/bin/env bash
# ==============================================================================
# handoff.sh — Monitor y Asistente de Traspaso Antigravity ↔ OpenCode
# ==============================================================================
# Uso:
#   ./.agent/workflow/scripts/handoff.sh status      Muestra el estado actual del flujo
#   ./.agent/workflow/scripts/handoff.sh next        Muestra la siguiente acción y el comando/prompt
#   ./.agent/workflow/scripts/handoff.sh prompt <1|2|3> Muestra el prompt listo para copiar
# ==============================================================================

set -euo pipefail

REPO_ROOT="$(git worktree list --porcelain | awk '/^worktree / {sub(/^worktree /, ""); print; exit}')"
WORKTREE_BUILDER="${REPO_ROOT}/.worktrees/builder"
if [[ -d "${WORKTREE_BUILDER}/.agent" ]]; then
  cp -ru "${WORKTREE_BUILDER}/.agent/." "${REPO_ROOT}/.agent/" 2>/dev/null || true
  cp -ru "${REPO_ROOT}/.agent/." "${WORKTREE_BUILDER}/.agent/" 2>/dev/null || true
fi
WORKFLOW_DIR="${REPO_ROOT}/.agent/workflow"
PLAN_FILE="${WORKFLOW_DIR}/01_ARCHITECT_PLAN.md"
TASKS_FILE="${WORKFLOW_DIR}/02_OPENCODE_TASKS.md"
REVIEW_FILE="${WORKFLOW_DIR}/03_ANTIGRAVITY_REVIEW.md"

function show_help() {
  cat << EOF
Asistente de Traspaso y Monitoreo del Flujo de Trabajo

Comandos:
  status         Analiza los archivos markdown y presenta el dashboard en consola
  next           Determina qué agente debe actuar y qué paso corresponde
  prompt <1|2|3> Imprime el prompt listo para invocar a Antigravity o OpenCode
EOF
}

function cmd_status() {
  echo "=============================================================================="
  echo "📊 ESTADO DEL FLUJO: ANTIGRAVITY (Google) ↔ OPENCODE (DeepSeek 4.1 Flash)"
  echo "=============================================================================="

  # 1. Plan Arquitectónico
  echo ""
  echo "1️⃣  FASE 1: PLAN ARQUITECTÓNICO (Antigravity: Gemini 3.8 Flash / Argon 4)"
  if [[ -f "${PLAN_FILE}" ]]; then
    local plan_status
    plan_status=$(grep -i "Estado:" "${PLAN_FILE}" | head -1 | sed 's/[>*]//g' | xargs || echo "No definido")
    echo "   Archivo: .agent/workflow/01_ARCHITECT_PLAN.md"
    echo "   Estado:  ${plan_status}"
  else
    echo "   ❌ Archivo 01_ARCHITECT_PLAN.md no encontrado."
  fi

  # 2. OpenCode Tasks
  echo ""
  echo "2️⃣  FASE 2: CONSTRUCCIÓN Y CHECKPOINTS (OpenCode: DeepSeek 4.1 Flash)"
  if [[ -f "${TASKS_FILE}" ]]; then
    local tasks_status
    tasks_status=$(grep -i "Estado General:" "${TASKS_FILE}" | head -1 | sed 's/[>*]//g' | xargs || echo "No definido")
    local total_done
    total_done=$(grep -c '\[✅\]' "${TASKS_FILE}" || true)
    local total_prog
    total_prog=$(grep -c '\[⏳\]' "${TASKS_FILE}" || true)
    local total_block
    total_block=$(grep -c '\[⚠️\]' "${TASKS_FILE}" || true)
    local total_todo
    total_todo=$(grep -c '\[ \]' "${TASKS_FILE}" || true)

    echo "   Archivo: .agent/workflow/02_OPENCODE_TASKS.md"
    echo "   Estado:  ${tasks_status}"
    echo "   Progreso: ✅ Completadas: ${total_done} | ⏳ En Progreso: ${total_prog} | ⚠️ Bloqueadas: ${total_block} | ⚪ Pendientes: ${total_todo}"
  else
    echo "   ❌ Archivo 02_OPENCODE_TASKS.md no encontrado."
  fi

  # 3. Antigravity Review
  echo ""
  echo "3️⃣  FASE 3: REVISIÓN Y FINALIZACIÓN (Antigravity: Gemini 3.8 Flash / Argon 4)"
  if [[ -f "${REVIEW_FILE}" ]]; then
    local review_status
    review_status=$(grep -i "Estado General:" "${REVIEW_FILE}" | head -1 | sed 's/[>*]//g' | xargs || echo "No definido")
    echo "   Archivo: .agent/workflow/03_ANTIGRAVITY_REVIEW.md"
    echo "   Estado:  ${review_status}"
  else
    echo "   ❌ Archivo 03_ANTIGRAVITY_REVIEW.md no encontrado."
  fi
  echo ""
  echo "=============================================================================="
}

function cmd_next() {
  cmd_status

  echo "🎯 SIGUIENTE PASO RECOMENDADO:"
  if grep -q "EN PLANIFICACIÓN" "${PLAN_FILE}" 2>/dev/null; then
    echo "👉 [FASE 1] Antigravity debe completar y validar el plan en: .agent/workflow/01_ARCHITECT_PLAN.md"
    echo "   Usa el modelo Gemini 3.8 Flash o Argon 4."
    echo "   Al terminar, cambia el estado a: 🟢 LISTO PARA CONSTRUCCIÓN"
  elif grep -q "LISTO PARA CONSTRUCCIÓN" "${PLAN_FILE}" 2>/dev/null && grep -q "EN ESPERA" "${TASKS_FILE}" 2>/dev/null; then
    echo "👉 [FASE 2] OpenCode CLI (DeepSeek 4.1 Flash) debe arrancar la construcción."
    echo "   1. Crea o activa el worktree: ./.agent/workflow/scripts/worktree-manager.sh create <nombre>"
    echo "   2. Ejecuta opencode en .worktrees/builder"
    echo "   3. Copia el prompt con: ./.agent/workflow/scripts/handoff.sh prompt 2"
  elif grep -q "EN PROGRESO" "${TASKS_FILE}" 2>/dev/null; then
    echo "👉 [FASE 2] OpenCode está construyendo. Continúa actualizando checkpoints en 02_OPENCODE_TASKS.md."
  elif grep -q "COMPLETADO" "${TASKS_FILE}" 2>/dev/null && grep -q "EN ESPERA" "${REVIEW_FILE}" 2>/dev/null; then
    echo "👉 [FASE 3] Antigravity debe auditar y cerrar la tarea."
    echo "   1. Antigravity revisa los diffs de OpenCode."
    echo "   2. Antigravity atiende la tabla de bloqueos (Sección 3 de 02_OPENCODE_TASKS.md)."
    echo "   3. Copia el prompt con: ./.agent/workflow/scripts/handoff.sh prompt 3"
  else
    echo "👉 Consulta los archivos de workflow en .agent/workflow/ para verificar el estado actual."
  fi
}

function cmd_prompt() {
  local phase="${1:-}"
  case "${phase}" in
    1)
      cat "${WORKFLOW_DIR}/prompts/01_antigravity_architect.prompt.md"
      ;;
    2)
      cat "${WORKFLOW_DIR}/prompts/02_opencode_builder.prompt.md"
      ;;
    3)
      cat "${WORKFLOW_DIR}/prompts/03_antigravity_reviewer.prompt.md"
      ;;
    *)
      echo "Uso: $0 prompt <1|2|3>"
      echo "  1 = Antigravity Arquitecto (Planificación)"
      echo "  2 = OpenCode Constructor (Construcción con DeepSeek 4.1 Flash)"
      echo "  3 = Antigravity Revisor (Auditoría y Cierre con Gemini 3.8 Flash / Argon 4)"
      exit 1
      ;;
  esac
}

case "${1:-}" in
  status)
    cmd_status
    ;;
  next)
    cmd_next
    ;;
  prompt)
    cmd_prompt "${2:-}"
    ;;
  *)
    show_help
    exit 1
    ;;
esac
