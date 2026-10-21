#!/usr/bin/env bash
# ==============================================================================
# worktree-manager.sh — Gestor de Git Worktrees para Finance Pal (Antigravity + OpenCode)
# ==============================================================================
# Uso:
#   ./.agent/workflow/scripts/worktree-manager.sh create <nombre-feature>
#   ./.agent/workflow/scripts/worktree-manager.sh list
#   ./.agent/workflow/scripts/worktree-manager.sh status
#   ./.agent/workflow/scripts/worktree-manager.sh sync
#   ./.agent/workflow/scripts/worktree-manager.sh remove
# ==============================================================================

set -euo pipefail

REPO_ROOT="$(git worktree list --porcelain | awk '/^worktree / {sub(/^worktree /, ""); print; exit}')"
WORKTREE_DIR="${REPO_ROOT}/.worktrees/builder"

function show_help() {
  cat << EOF
Gestor de Worktree para colaboración Antigravity (Arquitecto) + OpenCode (Constructor)

Comandos disponibles:
  create <feature>   Crea el worktree en .worktrees/builder con la rama builder/<feature>
  list               Lista todos los git worktrees activos en el repositorio
  status             Muestra el estado de la rama actual y del worktree de builder
  sync               Sincroniza y commitea el progreso entre worktrees
  remove             Elimina de forma segura el worktree .worktrees/builder
EOF
}

function cmd_create() {
  local feature_name="${1:-}"
  if [[ -z "${feature_name}" ]]; then
    echo "❌ Error: Debes proporcionar un nombre para la rama/feature."
    echo "Ejemplo: $0 create dark-mode"
    exit 1
  fi

  local branch_name="builder/${feature_name}"

  if [[ -d "${WORKTREE_DIR}" ]]; then
    echo "⚠️ El directorio de worktree ${WORKTREE_DIR} ya existe."
    echo "Usa '$0 status' para inspeccionarlo o '$0 remove' para limpiarlo antes de recrear."
    exit 1
  fi

  mkdir -p "${REPO_ROOT}/.worktrees"
  echo "🚀 Creando rama y worktree en: ${WORKTREE_DIR} (Rama: ${branch_name})..."

  # Si la rama ya existe, usarla; si no, crearla desde HEAD actual
  if git show-ref --verify --quiet "refs/heads/${branch_name}"; then
    git worktree add "${WORKTREE_DIR}" "${branch_name}"
  else
    git worktree add -b "${branch_name}" "${WORKTREE_DIR}" HEAD
  fi

  # Configurar symlink de node_modules para evitar reinstalaciones pesadas
  if [[ -d "${REPO_ROOT}/node_modules" && ! -e "${WORKTREE_DIR}/node_modules" ]]; then
    ln -s "${REPO_ROOT}/node_modules" "${WORKTREE_DIR}/node_modules"
    echo "🔗 Enlace simbólico configurado: node_modules -> ${REPO_ROOT}/node_modules"
  fi

  # Inicializar directorios de auditoría y sincronizar .agent/, reglas y config al worktree
  mkdir -p "${REPO_ROOT}/.agent/audit/evidence" "${REPO_ROOT}/.agent/audit/scratch"
  cp -a "${REPO_ROOT}/.agent/." "${WORKTREE_DIR}/.agent/"
  for item in AGENTS.md GEMINI.md .agentignore .agents supabase/config.toml graphify-out/.graphify_python graphify-out/.graphify_root; do
    if [[ -e "${REPO_ROOT}/${item}" ]]; then
      mkdir -p "$(dirname "${WORKTREE_DIR}/${item}")"
      cp -a "${REPO_ROOT}/${item}" "${WORKTREE_DIR}/${item}"
    fi
  done
  echo "🔄 Archivos de .agent/workflow, .agent/audit y reglas de agentes sincronizados en ${WORKTREE_DIR}"

  echo "✅ Worktree creado exitosamente."
  echo "📂 Directorio asignado para OpenCode CLI (DeepSeek 4.1 Flash):"
  echo "   ${WORKTREE_DIR}"
  echo ""
  echo "👉 Para iniciar OpenCode en el nuevo worktree ejecuta:"
  echo "   cd ${WORKTREE_DIR} && opencode"
}

function cmd_list() {
  echo "📋 Git Worktrees activos:"
  git worktree list
}

function cmd_status() {
  echo "========================================================"
  echo "📍 WORKTREE PRINCIPAL (Antigravity / Lead)"
  echo "   Ruta: ${REPO_ROOT}"
  echo "   Rama: $(git branch --show-current)"
  echo "--------------------------------------------------------"
  if [[ -d "${WORKTREE_DIR}" ]]; then
    echo "📍 WORKTREE BUILDER (OpenCode / DeepSeek 4.1 Flash)"
    echo "   Ruta: ${WORKTREE_DIR}"
    echo "   Rama: $(cd "${WORKTREE_DIR}" && git branch --show-current)"
    echo "   Último commit builder:"
    (cd "${WORKTREE_DIR}" && git log -1 --oneline)
  else
    echo "⚪ WORKTREE BUILDER: No inicializado (.worktrees/builder no existe)"
  fi
  echo "========================================================"
}

function cmd_sync() {
  if [[ ! -d "${WORKTREE_DIR}" ]]; then
    echo "❌ Error: No existe el worktree en ${WORKTREE_DIR}."
    exit 1
  fi

  echo "🔄 Sincronizando archivos más recientes de .agent/ entre worktree principal y builder..."
  mkdir -p "${REPO_ROOT}/.agent" "${WORKTREE_DIR}/.agent"
  cp -ru "${WORKTREE_DIR}/.agent/." "${REPO_ROOT}/.agent/" 2>/dev/null || true
  cp -ru "${REPO_ROOT}/.agent/." "${WORKTREE_DIR}/.agent/" 2>/dev/null || true
  echo "✅ Sincronización bidireccional de .agent/ completada."
  echo ""
  echo "📋 Estado de cambios pendientes en worktree builder:"
  (cd "${WORKTREE_DIR}" && git status --short)
}

function cmd_remove() {
  if [[ ! -d "${WORKTREE_DIR}" ]]; then
    echo "ℹ️ El worktree ${WORKTREE_DIR} no existe o ya fue eliminado."
    exit 0
  fi

  echo "🗑️ Limpiando enlaces simbólicos y eliminando worktree ${WORKTREE_DIR}..."
  rm -f "${WORKTREE_DIR}/node_modules" 2>/dev/null || true
  git worktree remove --force "${WORKTREE_DIR}" || git worktree remove "${WORKTREE_DIR}"
  echo "✅ Worktree eliminado correctamente."
}

case "${1:-}" in
  create)
    cmd_create "${2:-}"
    ;;
  list)
    cmd_list
    ;;
  status)
    cmd_status
    ;;
  sync)
    cmd_sync
    ;;
  remove)
    cmd_remove
    ;;
  *)
    show_help
    exit 1
    ;;
esac
