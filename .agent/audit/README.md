# 🛡️ Auditoría Integral de Seguridad y Privacidad — Finance Pal v1.21.0

> **Ciclo:** Re-auditoría 2026-10 (`F0`–`F11`)
> **Documento Origen:** `.agent/workflow/01_ARCHITECT_PLAN.md` (Fase 1 — Arquitecto `agy`)
> **Registro de Ejecución:** `.agent/workflow/02_OPENCODE_TASKS.md` (Fase 2 — `opencode` / DeepSeek 4.1 Flash)
> **Informe Consolidado Final:** `.agent/security_audit.md` v2 (se redacta en `F11`)
> **Estado:** 🟡 EN PROGRESO (Fase 2 iniciada el 2026-10-20)

---

## 1. Alcance de la Auditoría v1.21.0

| Aspecto | Definición |
| :--- | :--- |
| **Objetivo** | Re-verificar con evidencia los 21 hallazgos previos (`SEC-001`…`SEC-021`) y confirmar/descartar 12 hipótesis nuevas (`NEW-01`…`NEW-12`) sobre Finance Pal v1.21.0. |
| **Entregable** | Evidencia técnica en `.agent/audit/evidence/`, informe `.agent/security_audit.md` v2 con CVSS v3.1 y backlog de remediación priorizado (`F11`). |
| **Incluido** | SAST (`N0`), introspección de catálogo Supabase (`N1`), DAST no destructivo con cuentas de prueba (`N2`), revisión de plataforma Web/Android/CI. |
| **Excluido** | Modificar código de producción (`src/**`, `supabase/**`, `android/**`, `public/**`, `package.json`); descompilar APK; pruebas destructivas/fuerza bruta/ZAP activo contra producción. |
| **Regla de Oro #1** | **CERO cambios en el código fuente.** `git diff --stat` al cierre debe mostrar únicamente archivos bajo `.agent/` (y `graphify-out/` tras el `graphify update .` final). |

---

## 2. Protocolo de Niveles de Ejecución en Producción (`N0`–`N3`)

Proyecto Supabase único de producción: **`rjforcrdyfuodsqtopvp`** (`financepal`, PostgreSQL `17.6.1`, `us-east-1`, `ACTIVE_HEALTHY`).

| Nivel | Qué se permite | Dónde | Responsable |
| :--- | :--- | :--- | :--- |
| 🟢 **N0 — Estático** | Lectura de código, `graphify`, `grep`, `semgrep`, `gitleaks`, `trufflehog`, `npm audit`, `osv-scanner`, inspección de `dist/` | Repo local | `opencode` |
| 🟢 **N1 — Catálogo (solo lectura)** | `SELECT` sobre `pg_class`, `pg_proc`, `pg_policies`, `information_schema`, `storage.buckets`, `has_function_privilege(...)`, `/config/auth`, `/functions`, `/advisors` vía Supabase CLI / Management API | Supabase producción | `opencode` o `agy` |
| 🟡 **N2 — DAST no destructivo** | REST de **lectura** con JWT de cuentas `audit-a` intentando leer datos de `audit-b`; escrituras sólo sobre filas ficticias A/B; `OPTIONS`/`POST` sin credenciales a la Edge Function; `curl -sI` pasivo (1 `HEAD`) al dominio real | Supabase producción + navegador local | `agy` o `opencode` (con cuentas `audit-a`/`audit-b`) |
| 🔴 **N3 — Destructivo / carga** | `rpc/cleanup_stale_sessions`, bucles de rate limit, fuerza bruta, Edge Function autenticada, ZAP activo | **Prohibido en prod**; sólo Laboratorio Local Docker o sustitución `N0`+`N1` documentada | `agy` / `opencode` |

**Prohibiciones explícitas en producción:** RPC con efectos sobre otros usuarios, invocar `send-reminders` con credenciales válidas, fuerza bruta, bucles de rate limit, escáneres activos.

---

## 3. Disponibilidad del Entorno y Laboratorio Local

| Recurso | Estado | Detalle |
| :--- | :---: | :--- |
| `gitleaks` | ✅ | Operativo (escaneo de prueba redactado OK) |
| `trufflehog` | ✅ | `3.99.3` |
| `semgrep` | ⚠️ | Binario presente con **Python env roto** (`ModuleNotFoundError: opentelemetry.exporter`); workaround: Docker `semgrep/semgrep` o fallback de patrones estáticos con documentación en `F7.1` |
| `osv-scanner` | ✅ | `2.7.0` |
| `npm audit` | ✅ | Vía `npm` (Node `v26.12.0`) |
| Supabase CLI | ✅ | `npx supabase 2.121.0`, vinculada al proyecto (`linked: true`) |
| **Docker (Laboratorio Local)** | ✅ | Docker `29.9.1` con daemon operativo → `N3` **viable** (pendiente de decisión/consumo de recursos en cada fase) |
| `jq` / `curl` / `psql` / `graphify` | ✅ | Disponibles |

**Acceso CLI a producción (`N1`) — verificado sin exponer tokens:**

- `~/.supabase/access-token`: **PRESENTE** (`chmod 600`; valor redactado `***`).
- `npx supabase projects list`: proyecto `rjforcrdyfuodsqtopvp` (`financepal`) `ACTIVE_HEALTHY`, `linked: true`.
- ⚠️ Al finalizar `F11`, **revocar/rotar** el Personal Access Token (`sbp_***`) usado en esta sesión.

**Prerrequisitos del plan (§1.1) — estado:**

| Prerrequisito | Estado |
| :--- | :--- |
| Respaldo previo (`db dump` fuera del repo o Backups del Dashboard) | ⚪ Pendiente de verificar (se documentará en `F2` si aplica) |
| Cuentas de prueba `audit-a` / `audit-b` en producción | ⚪ Pendiente de confirmar (si no existen, se aplica el fallback de catálogo y se escala a `agy`) |

---

## 4. Identificación del Hosting y Dominio de Producción

| Archivo | Existe | Observaciones |
| :--- | :---: | :--- |
| `netlify.toml` | ✅ | Build `npm run build` → `dist`; CSP + HSTS + headers completos; redirect SPA 200 |
| `vercel.json` | ✅ | Framework `vite`; headers CSP **idénticos** a Netlify; rewrites SPA |
| `.netlify/state.json` | ✅ | **Versionado en git** (metadato de linking; insumo de `NEW-12`, `F9.2`) |

- **Dominio público declarado (README):** `https://financepal-web.vercel.app` → hosting activo **Vercel**.
- **Deep link Android (PKCE):** esquema `app.financepal.com://`.
- Prueba pasiva permitida: **1 petición `HEAD`** al dominio público en `F7` (`T21`).

---

## 5. Higiene de Evidencia y Reglas de Redacción

1. **CERO cambios en código fuente** (`src/**`, `supabase/**`, `android/**`, `public/**`, `package.json`).
2. **Prohibido leer/imprimir `.env`, `.env.local`, `.env.template`** (`.agentignore`). Escaneos de secretos únicamente con `--redact`.
3. **Redacción obligatoria:** todo token, JWT (`eyJ…`), API key, `sbp_…`, hash de contraseña o PII (emails, UUID de usuario real) se escribe como `***` en las evidencias.
4. **Ubicación de artefactos:** evidencia en `.agent/audit/evidence/`; PoCs aisladas en `.agent/audit/scratch/` (nunca en `src/`).
5. **Protocolo Graphify:** antes de `grep` o lecturas amplias de código, ejecutar `graphify query "<pregunta>"`.
6. **Checkpoints atómicos:** cada fase cierra con commit sólo de `.agent/` — `docs(audit): Fx <resumen>` — registrado como `CP-00`…`CP-11`.

---

## 6. Índice de Evidencias (se actualiza al cierre de cada fase)

| Fase | Archivo(s) de Evidencia | Estado |
| :--- | :--- | :---: |
| `F0` | `evidence/F0-environment.md`, este `README.md` | ✅ |
| `F1` | `evidence/F1-gitleaks.json`, `F1-trufflehog.json`, `F1-npm-audit.json`, `F1-osv.txt`, `F1-supply-chain-and-bundle.md` | ⚪ |
| `F2` | `evidence/F2-prod-schema.sql`, `F2-schema-drift.md`, `F2-catalog-and-rls.md`, `F2-advisor.md` | ⚪ |
| `F3` | `evidence/F3-auth-mfa-sessions.md` | ⚪ |
| `F4` | `evidence/F4-storage-inventory.md`, `F4-crypto-and-auditlog.md`, `scratch/poc-new01-pbkdf2.mjs` | ⚪ |
| `F5` | `evidence/F5-services-idor-validation.md` | ⚪ |
| `F6` | `evidence/F6-edge-push-sw.md` | ⚪ |
| `F7` | `evidence/F7-semgrep.json`, `F7-headers-prod.txt`, `F7-web-xss-csp.md` | ⚪ |
| `F8` | `evidence/F8-android-masvs.md` | ⚪ |
| `F9` | `evidence/F9-cicd-and-repo-hygiene.md` | ⚪ |
| `F10` | `evidence/F10-privacy-logging-gdpr.md` | ⚪ |
| `F11` | `.agent/security_audit.md` v2 + verificación final de higiene | ⚪ |
