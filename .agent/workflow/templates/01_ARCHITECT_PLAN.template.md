# 📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA]

> **Fase:** 1 — Planificación y Orquestación Arquitectónica  
> **Agente:** Antigravity CLI  
> **Modelos Autorizados:** Google Gemini 3.8 Flash / Argon 4  
> **Estado:** 🟡 EN PLANIFICACIÓN | 🟢 LISTO PARA CONSTRUCCIÓN | 🔴 REVISIÓN REQUERIDA  
> **Fecha:** [AAAA-MM-DD]  
> **Rama / Worktree Base:** `main` (o `feature/[nombre]`)  
> **Worktree Destino de OpenCode:** `.worktrees/builder` (rama `builder/[nombre]`)

---

## 1. Resumen Ejecutivo y Objetivos

- **Propósito:** Breve descripción de la necesidad de negocio o técnica.
- **Objetivo Principal:** Qué problema resuelve y cuál es el resultado esperado.
- **Alcance (In Scope):**
  - [ ] Alcance 1
  - [ ] Alcance 2
- **Fuera de Alcance (Out of Scope):**
  - [ ] Elemento 1
  - [ ] Elemento 2

---

## 2. Alineación Arquitectónica (Finance Pal Local-First)

> Referencia obligatoria: `.agent/rules/architecture.md` y `.agent/contract.md`.

- **Capa UI (Vistas y Componentes):** Consumo exclusivo a través de la fachada `useFinanceData`.
- **Capa de Estado (Zustand + React Query):**
  - Store local involucrado: [ej. `src/store/slices/transaction-slice.ts`]
  - Mutaciones/Queries React Query: [ej. `src/hooks/mutations/useTransactionMutations.ts`]
- **Capa de Servicios (Supabase SDK):** [ej. `src/services/transactions.service.ts`]
- **Reglas de Seguridad y Secretos:**
  - Respetar `.agentignore` (prohibido acceder o exponer `.env*`, credenciales o tokens).
  - Políticas RLS aplicables en Supabase.
  - Sanitización y validaciones con Zod / `sanitizers.ts`.

---

## 3. Mapa de Archivos e Impacto

| Acción | Ruta del Archivo | Responsabilidad / Descripción |
| :--- | :--- | :--- |
| `CREAR` | `src/...` | Nueva interfaz o componente |
| `MODIFICAR` | `src/...` | Integración con fachada o store |
| `ELIMINAR` | `src/...` | Archivo deprecado o no utilizado |
| `TEST` | `src/test/...` | Pruebas unitarias o de integración |

---

## 4. Tipos, Interfaces y Contratos de Datos

```typescript
// Especificar tipos exactos para que OpenCode no invente estructuras
export interface ExamplePayload {
  id: string;
  amount: number;
  createdAt: string;
}
```

---

## 5. Plan de Ejecución Secuencial para OpenCode CLI (DeepSeek 4.1 Flash)

> **Instrucciones para OpenCode:** Ejecutar en el orden indicado. Registrar cada tarea y checkpoint en `02_OPENCODE_TASKS.md`. Si una tarea presenta complejidad inmanejable o falla, marcarla como `[⚠️ BLOCKED]` y documentarla en la sección de escalación.

### Fase A: Tipado y Modelado de Datos
- [ ] **A.1:** Crear/actualizar interfaces en `src/lib/...`
- [ ] **A.2:** Configurar esquemas de validación Zod

### Fase B: Capa de Servicios y Estado
- [ ] **B.1:** Crear funciones puras en `src/services/...`
- [ ] **B.2:** Crear/actualizar slice de Zustand en `src/store/slices/...`
- [ ] **B.3:** Integrar React Query en `src/hooks/...`
- [ ] **B.4:** Exponer métodos en fachada `src/hooks/useFinanceData.ts`

### Fase C: Componentes de Interfaz de Usuario
- [ ] **C.1:** Crear componentes UI atómicos en `src/components/ui/` o dominio en `src/components/app/`
- [ ] **C.2:** Integrar vista principal en `src/pages/...`

### Fase D: Pruebas Automatizadas
- [ ] **D.1:** Escribir pruebas unitarias en `src/test/...`
- [ ] **D.2:** Ejecutar suite de pruebas (`npm test`) y verificar compilación (`npm run build`)

---

## 6. Criterios de Aceptación y Checklist de Calidad

- [ ] Compilación TypeScript limpia (`npx tsc --noEmit` sin errores).
- [ ] Pruebas unitarias pasando al 100% (`npm test`).
- [ ] Sin regresiones en el flujo Local-First (funciona offline y sincroniza online).
- [ ] Diseño responsivo y adaptable al tema (claro/oscuro) usando Tailwind y variables del sistema.
- [ ] Ningún secreto ni endpoint sensible expuesto en frontend.

---

## 7. Protocolo de Traspaso a OpenCode

1. Antigravity finaliza y valida este documento marcando el estado en `🟢 LISTO PARA CONSTRUCCIÓN`.
2. OpenCode CLI (DeepSeek 4.1 Flash) inicia leyendo este archivo.
3. OpenCode inicializa `02_OPENCODE_TASKS.md` copiando la plantilla correspondiente.
4. OpenCode reporta checkpoints regulares por commit atómico.
