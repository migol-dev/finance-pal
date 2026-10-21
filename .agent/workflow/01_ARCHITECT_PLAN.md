# 📐 Arquitectura & Plan Maestro: [PENDIENTE DE ASIGNAR TAREA]

> **Fase:** 1 — Planificación y Orquestación Arquitectónica  
> **Agente:** Antigravity CLI (`agy`)  
> **Modelos Autorizados:** Google Gemini 3.8 Flash / Argon 4  
> **Estado:** 🟡 EN PLANIFICACIÓN  
> **Fecha:** [AAAA-MM-DD]  
> **Rama / Worktree Base:** `main`  
> **Worktree Destino de OpenCode:** `.worktrees/builder`

---

## 1. Resumen Ejecutivo y Objetivos

- **Propósito:** *[Pendiente de definir en el próximo sprint]*
- **Objetivo Principal:** *[Pendiente de definir]*
- **Alcance (In Scope):**
  - [ ] *[Por definir]*
- **Fuera de Alcance (Out of Scope):**
  - [ ] *[Por definir]*

---

## 2. Alineación Arquitectónica (Finance Pal Local-First)

> Referencia obligatoria: `.agent/rules/architecture.md` y `.agent/contract.md`.

- **Capa UI (Vistas y Componentes):** Consumo exclusivo a través de la fachada `useFinanceData`.
- **Capa de Estado (Zustand + React Query):** *[Por definir]*
- **Capa de Servicios (Supabase SDK):** *[Por definir]*
- **Reglas de Seguridad y Secretos:**
  - Respetar `.agentignore` (prohibido acceder o exponer `.env*`, credenciales o tokens).
  - Políticas RLS aplicables en Supabase.
  - Sanitización y validaciones con Zod / `sanitizers.ts`.

---

## 3. Mapa de Archivos e Impacto

| Acción | Ruta del Archivo | Responsabilidad / Descripción |
| :--- | :--- | :--- |
| `MODIFICAR` | `src/...` | *[Por definir]* |

---

## 4. Tipos, Interfaces y Contratos de Datos

```typescript
// Pendiente de especificar por Antigravity en Fase 1
```

---

## 5. Plan de Ejecución Secuencial para OpenCode CLI (DeepSeek 4.1 Flash)

> **Instrucciones para OpenCode:** Ejecutar en el orden indicado en `02_OPENCODE_TASKS.md`. Si una tarea presenta bloqueo, marcarla como `[⚠️]` y documentarla en la sección de escalación.

### Fase F0: Preparación
- [ ] **Tarea F0.1:** *[Pendiente de definir]*

---

## 6. Criterios de Aceptación y Checklist de Calidad

- [ ] Compilación TypeScript limpia (`npx tsc --noEmit` sin errores).
- [ ] Pruebas unitarias pasando al 100% (`npm test`).
- [ ] Sin regresiones en el flujo Local-First (funciona offline y sincroniza online).
- [ ] Ningún secreto ni endpoint sensible expuesto en frontend (`gitleaks`).
- [ ] Grafo de conocimiento actualizado (`graphify update .`).
