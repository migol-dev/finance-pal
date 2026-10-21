# 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI (`agy`)

> **Fase:** 3 — Revisión Técnica, Resolución de Escalaciones `N1`/`N2`/`N3` y Cierre Arquitectónico (`F11`)  
> **Agente Revisor y Auditor Lead:** Antigravity CLI (`agy` + Subagentes `research` / `self`)  
> **Modelos Autorizados:** Google Gemini 3.8 Flash / Google Argon 4  
> **Referencias de Entrada:**  
>   - `.agent/workflow/01_ARCHITECT_PLAN.md` (Plan Maestro de la Auditoría v1.21.0)  
>   - `.agent/workflow/02_OPENCODE_TASKS.md` (Checkpoints `CP-00`…`CP-11`, Checklists y Escalation Log)  
>   - `.agent/audit/evidence/*`, `.agent/audit/scratch/*` y `.agent/security_audit.md`  
> **Rama / Worktree de Revisión:** `main` (sincronizado con `.worktrees/builder`)  
> **Estado General:** 🟢 APROBADO Y CERTIFICADO — AUDITORÍA V2 CERRADA (LISTO PARA CICLO DE REMEDIACIÓN P0)  

---

## 1. Panel de Control de la Revisión (`agy`)

| Métrica | Estado / Cantidad |
| :--- | :--- |
| **Modelo Utilizado** | Google Gemini 3.8 Flash / Google Argon 4 |
| **Total de Bloques de Fase Auditables (`R-F0`…`R-F11`)** | `12 / 12` auditados y aprobados |
| **Total de Hallazgos Previos Certificados (`SEC-001`…`021`)** | `21 / 21` (`4` cerrados, `11` confirmados, `6` parciales) |
| **Total de Hipótesis Nuevas Certificadas (`NEW-01`…`12`)** | `12 / 12` (`2` descartadas, `8` confirmadas, `2` parciales) |
| **Total de Pruebas de Matriz (`T01`–`T25`)** | `25 / 25` ejecutadas (`100%`) |
| **🔍 Elementos en Revisión Actual** | `0` |
| **✅ Elementos ya Revisados y Aprobados** | `12 bloques (58/58 ítems: 33 hallazgos + 25 pruebas)` |
| **📦 Entrega de Fase 2 (OpenCode)** | `12/12 bloques ejecutados (CP-00…CP-11)` |
| **⏳ Elementos Pendientes por Revisar (Backlog)** | `0` |
| **⚠️ Ítems Escalados por OpenCode** | `4 resueltos / 4 totales` (`T06`, `T09`, `T12`, `T13` resueltos en Fase 3 por `agy`) |
| **Verificación de CERO Cambios en Código (`src/**`, `supabase/**`, `android/**`)** | `✅ VERIFICADO — CP-00…CP-11 y Fase 3 solo tocaron .agent/ y graphify-out/` |
| **Escaneo de Secretos en `.agent/` (`gitleaks --redact`)** | `✅ 0 hallazgos (gitleaks dir .agent); JWT v1 redactado` |

---

## 2. 🔍 Cosas que se están revisando actualmente (In Progress)

> *Fases, archivos de evidencia o hallazgos que Antigravity (`agy`) tiene bajo inspección activa en este momento.*

| ID Revisión | Fase / Evidencia | Foco de la Inspección | Criterio Verificado | Estado |
| :--- | :--- | :--- | :--- | :--- |
| *Ninguno* | — | Todos los bloques `R-F0`…`R-F11` y las 4 escalaciones (`T06`, `T09`, `T12`, `T13`) han sido revisados y cerrados en la Sección 3 y Sección 5 | `100%` completado | ✅ **CERRADO** |

---

## 3. ✅ Cosas que ya se revisaron (Audited & Closed)

> *Registro formal de fases y evidencias inspeccionadas, hallazgos validados, correcciones aplicadas y veredicto final de Antigravity.*

| ID Revisión | Fase / Evidencia | Veredicto | Hallazgos Certificados / Acciones de `agy` | Aprobado por |
| :--- | :--- | :---: | :--- | :--- |
| `R-F0` | `CP-00` (`769cf9e`) · `.agent/audit/README.md`, `F0-environment.md` | ✅ **APROBADO** | Entorno inventariado (`gitleaks`, `osv-scanner`, `supabase`, `psql`, `docker` activo), protocolo `N0`–`N3` establecido y alcance verificado sin exponer tokens. | `agy` (Argon 4 / Gemini 3.8 Flash) |
| `R-F1` | `CP-01` (`0bd74a3`) · `F1-supply-chain-and-bundle.md`, `F1-gitleaks.json`, `F1-npm-audit.json`, `F1-osv.txt` | ✅ **APROBADO** | Certificados `T01` (JWT histórico en `.env` + 2 falsos positivos), `T02` (52 advisories npm: 3C/31H; 81 OSV), `T03` (`dist/` sin `.map` ni `service_role`, pero con `dist/stats.html` `SEC-021`), `SEC-006` (`role=anon`, `exp` 2036) y `NEW-07` (`esm.sh@2` flotante + scripts CJS). | `agy` (Argon 4 / Gemini 3.8 Flash) |
| `R-F2` | `CP-02` (`a91a215`) · `F2-prod-schema.sql`, `F2-schema-drift.md`, `F2-catalog-and-rls.md`, `F2-advisor.md` + `poc-t06-t09-t12-output.txt` | ✅ **APROBADO (con elevación `F2-A`)** | Certificados `T04` (10/10 tablas con RLS), `T05` (`NEW-02`/`SEC-014` cerrados: 3/3 vistas `*_safe` con `security_invoker=true`), `T07` (`NEW-03`/`SEC-004`: `authenticated` tiene `EXECUTE` en `cleanup_stale_sessions()`, mitigado por bug `current_user`), `T08` (`SEC-007` parcial), `SEC-011`/`SEC-016` cerrados y `NEW-05` (12 diferencias de esquema). **`agy` ejecutó `T06` dinámicamente en PostgreSQL 17 y descubrió `F2-A` (Alta, CVSS 8.1):** un `UPDATE` sin `WHERE` en `push_subscriptions` (`SET user_id = auth.uid()`) secuestra todas las filas de otros usuarios por `USING (true)`. | `agy` (Argon 4 / Gemini 3.8 Flash) |
| `R-F3` | `CP-03` (`dd8ff98`) · `F3-auth-mfa-sessions.md` + `poc-t06-t09-t12-output.txt` | ✅ **APROBADO** | Certificados `NEW-04` (Crítica, CVSS 8.1: MFA solo en UI; 0 políticas/funciones con `aal`), `T10` (`SEC-012` contenido por `uri_allow_list` de GoTrue; Netlify antiguo vivo), `T11` (`SEC-008`: `password_min_length=6`, HIBP/CAPTCHA/notificaciones off, `rate-limiter` desconectado) y `SEC-010` (canal Realtime público y takeover sin reauth). **`agy` ejecutó `T09` y `T12` dinámicamente en PostgreSQL 17**, confirmando CRUD completo con JWT `aal1` en usuario con TOTP `verified`. | `agy` (Argon 4 / Gemini 3.8 Flash) |
| `R-F4` | `CP-04` (`5787bf9`) · `F4-storage-inventory.md`, `F4-crypto-and-auditlog.md`, `poc-new01-pbkdf2.mjs`, `poc-sec009-tamper.mjs`, `poc-t13-output.json` | ✅ **APROBADO** | Certificados `SEC-001` (cerrado), `SEC-002`/`NEW-01` (`T14`: PoC `DECRYPTED_OK` con `user.id` + salt público), `SEC-009` (`CHAIN_FORGED_OK` sin HMAC), `SEC-015`/`F4-D` (Alta, CVSS 7.1), `SEC-018` (`profile.email` exportado por defecto) y `F4-F` (upgrade 100k→600k rompe descifrado). **`agy` ejecutó `T13` dinámicamente en Node 26 WebCrypto**, demostrando fuga cross-account del `audit_log` (`newEmail`) y corrupción del salt tras `signOut()`. | `agy` (Argon 4 / Gemini 3.8 Flash) |
| `R-F5` | `CP-05` (`94b6c52`) · `F5-services-idor-validation.md` | ✅ **APROBADO** | Certificados `T15`/`SEC-005` (matriz de 60+ llamadas; 3 escrituras sin `.eq('user_id', ...)` contenidas por RLS y 2 helpers de Storage sin validar prefijo), `T16`/`SEC-020` (`F5-A`: `importData` sin Zod ni límite en store), `F5-B` (bug TS2554 en `useReceiptMutations.ts:81,105`), `F5-C` (`syncAllToCloud` no atómico) y `F5-D` (bypass de `useFinanceData`). | `agy` (Argon 4 / Gemini 3.8 Flash) |
| `R-F6` | `CP-06` (`e19433f`) · `F6-edge-push-sw.md`, `poc-new08-sw-redirect.mjs` | ✅ **APROBADO** | Certificados `T17` (`F6-A`/`F6-B`: v4 desplegada de 239 líneas vs 548 en repo; `FUNCTION_SECRET` vacío y `VAPID_PUBLIC_KEY` ausente; `OPTIONS` con `ACAO: *` `SEC-017`; `POST` sin auth → `401`), `T18`/`SEC-013` (`Map` en memoria y XFF spoofable), `T19`/`NEW-08` (PoC `OPEN_REDIRECT_CONFIRMED` en `sw.js`) y `NEW-09` (montos visibles por defecto). | `agy` (Argon 4 / Gemini 3.8 Flash) |
| `R-F7` | `CP-07` (`7b8af3e`) · `F7-web-xss-csp.md`, `F7-semgrep.json`, `F7-headers-prod.txt`, `F7-zap-baseline.*` | ✅ **APROBADO** | Certificados `T20` (Semgrep 173 reglas/304 archivos: 0 sinks XSS alcanzables), `NEW-10` (descartado: `ChartStyle` sin llamantes y tree-shaken de `dist/`), `T21`/`NEW-11` (CSP/HSTS/XFO/XCTO activos; faltan COOP/CORP/SRI y CSP meta en WebView `F7-A`) y `T22` (ZAP baseline local: 0 FAIL, 5 WARN, 62 PASS). | `agy` (Argon 4 / Gemini 3.8 Flash) |
| `R-F8` | `CP-08` (`74f465a`) · `F8-android-masvs.md` | ✅ **APROBADO** | Certificados `T23`, `NEW-06` (`allowBackup="true"` sin reglas), `F8-A` (Alta, CVSS 8.1: `MainActivity` exportada + custom scheme + OAuth implícito + `setSession` sin validar origen/`state`), `F8-B` (`FileProvider` amplio), `F8-D` (APK release unsigned), `F8-F` (sin `FLAG_SECURE`) y matriz OWASP MASVS v2 (1 PASS, 10 PARTIAL, 8 FAIL, 5 N/A). | `agy` (Argon 4 / Gemini 3.8 Flash) |
| `R-F9` | `CP-09` (`5f55883`) · `F9-cicd-and-repo-hygiene.md` | ✅ **APROBADO** | Certificados `T24` (`F9-A`: `contents: write` en workflow de Dependabot con `npm ci`; `F9-B`: `npm audit \|\| true`; `F9-C`: auto-merge sin gate; `F9-D`: Node 18 EOL; acciones por tag mutable) y `NEW-12` (`.netlify/state.json`, `.netlify/netlify.toml` con ruta local y 74 archivos de `graphify-out/` versionados). | `agy` (Argon 4 / Gemini 3.8 Flash) |
| `R-F10` | `CP-10` (`1038fbc`) · `F10-privacy-logging-gdpr.md` | ✅ **APROBADO** | Certificados `T25`/`SEC-019` (92 `console.*` + 7 `logger.*`; `clientId` y errores crudos; 8 referencias `.catch(console.*)` sobreviven a `drop_console` en `dist/`), `F10-A` (`excludePII` no anonimiza datos financieros ni se expone en UI), `F10-B` (audit log claro con `newEmail`), `F10-C` (`sanitizeForLog` solo trunca), `F10-D` (sin borrado de cuenta en nube) y matriz LFPDPPP/GDPR. | `agy` (Argon 4 / Gemini 3.8 Flash) |
| `R-F11` | `CP-11` (`6ec3c4f`) + Fase 3 · `.agent/security_audit.md` v2 | ✅ **APROBADO** | Sección v2 consolidada (conservando v1 íntegra), 21 `SEC-*` + 12 `NEW-*` + hallazgos `F2`–`F10` con CVSS v3.1, matriz `T01`–`T25` al `100%` (`25/25`), matriz de riesgo residual, backlog priorizado P0–P3, `gitleaks dir .agent --redact` = 0 hallazgos y `graphify update .` ejecutado. | `agy` (Argon 4 / Gemini 3.8 Flash) |

---

## 4. ⏳ Cosas que se van a revisar (Backlog de Revisión por Fase)

> *Cola estructurada de los 12 bloques de auditoría verificados y firmados por Antigravity (`agy`).*

- [x] **R-F0 (`CP-00` — Preparación):** Verificar `.agent/audit/README.md`, estructura `.agent/audit/{evidence,scratch}` y protocolo `N0`–`N3`.
- [x] **R-F1 (`CP-01` — Secretos y Supply Chain):** Auditar `F1-gitleaks.json`, `F1-trufflehog.json`, `F1-npm-audit.json`, `F1-osv.txt` y `F1-supply-chain-and-bundle.md` (`T01`–`T03`, `SEC-006`, `SEC-021`, `NEW-07`).
- [x] **R-F2 (`CP-02` — Base de Datos y Storage `P0`):** Auditar `F2-prod-schema.sql`, `F2-schema-drift.md`, `F2-catalog-and-rls.md` y `F2-advisor.md` (`T04`–`T08`, `NEW-02`, `NEW-03`, `NEW-04`, `NEW-05`, `SEC-004`, `SEC-007`, `SEC-011`, `SEC-014`, `SEC-016`).
- [x] **R-F3 (`CP-03` — Auth, MFA y Sesiones `P0`):** Auditar `F3-auth-mfa-sessions.md` (`T09`–`T12`, `NEW-04`, `SEC-008`, `SEC-010`, `SEC-012`).
- [x] **R-F4 (`CP-04` — Datos en Reposo Cliente y Cripto `P0`):** Auditar `F4-storage-inventory.md`, `F4-crypto-and-auditlog.md` y `.agent/audit/scratch/poc-new01-pbkdf2.mjs` (`T13`, `T14`, `NEW-01`, `SEC-001`, `SEC-002`, `SEC-009`, `SEC-015`, `SEC-018`).
- [x] **R-F5 (`CP-05` — Servicios, IDOR y Sincronización `P1`):** Auditar `F5-services-idor-validation.md` (`T15`, `T16`, `SEC-005`, `SEC-020` y adherencia a `useFinanceData`).
- [x] **R-F6 (`CP-06` — Edge Function, Push y SW `P1`):** Auditar `F6-edge-push-sw.md` (`T17`–`T19`, `NEW-08`, `NEW-09`, `SEC-003`, `SEC-013`, `SEC-017`).
- [x] **R-F7 (`CP-07` — Web, XSS y Headers HTTP `P2`):** Auditar `F7-semgrep.json`, `F7-headers-prod.txt` y `F7-web-xss-csp.md` (`T20`–`T22`, `NEW-10`, `NEW-11`).
- [x] **R-F8 (`CP-08` — Android y Capacitor `P1`):** Auditar `F8-android-masvs.md` (`T23`, `NEW-06` y checklist OWASP MASVS v2).
- [x] **R-F9 (`CP-09` — CI/CD e Higiene del Repo `P2`):** Auditar `F9-cicd-and-repo-hygiene.md` (`T24`, `NEW-07`, `NEW-12`).
- [x] **R-F10 (`CP-10` — Privacidad, Logging y Errores `P2`):** Auditar `F10-privacy-logging-gdpr.md` (`T25`, `SEC-019` y matriz LFPDPPP/GDPR).
- [x] **R-F11 (`CP-11` — Informe Consolidado v2 y Cierre):** Verificar `.agent/security_audit.md` v2 (vectores CVSS v3.1, matriz de riesgo residual, backlog priorizado), ausencia de secretos en `.agent/` y actualización de `graphify update .`.

---

## 5. 🛠️ Tareas y Lógica Completadas por Antigravity (`agy` — Intervención Activa y Escalaciones Resueltas)

> *Detalle de los 4 ítems del Escalation Log (Sección 3 de `02_OPENCODE_TASKS.md`) resueltos dinámicamente por Antigravity (`agy` con Argon 4 / Gemini 3.8 Flash) en Fase 3 sin impactar datos reales en producción.*

| ID Tarea / Escalación | Fase / Archivo de Evidencia | Acción / Resolución Ejecutada por Antigravity (`agy`) | Nivel (`N0`–`N3`) | Evidencia / Verificación |
| :--- | :--- | :--- | :---: | :--- |
| `F2.5` (`T06`) | `F2` · `F2-catalog-and-rls.md` §7 | Levantamiento de contenedor efímero `postgres:17-alpine`, carga íntegra de `F2-prod-schema.sql` + 9 políticas de `storage.objects` y ejecución de 48 aserciones cross-tenant entre `audit-a` y `audit-b`. **9/10 tablas, 3/3 vistas `*_safe` y `storage.objects` bloquean al 100% el acceso cruzado (`PASS`); `public.push_subscriptions` FALLA en `UPDATE` sin `WHERE` (`SET user_id = auth.uid()` secuestra todas las filas de otros usuarios por `USING (true)` — hallazgo `F2-A` elevado a Alta, CVSS 8.1).** | `N3` (Lab Docker PG17) | `.agent/audit/scratch/poc-t06-t09-t12-rls-init.sql`, `poc-t06-t09-t12-rls-tests.sql`, `poc-t06-t09-t12-output.txt` (`✅ RESUELTO`) |
| `F3.1` (`T09`) | `F3` · `F3-auth-mfa-sessions.md` §6.1 | Simulación de sesión `ROLE authenticated` con `audit-a` inscrito en `auth.mfa_factors` (`totp`, `verified`) y JWT con claim `"aal":"aal1"`. **Confirmado dinámicamente `NEW-04` (`FAIL`):** `SELECT`, `INSERT`, `UPDATE`, `DELETE` en tablas financieras y `SELECT` en `storage.objects` se ejecutan sin restricción en `aal1`. | `N3` (Lab Docker PG17) | `.agent/audit/scratch/poc-t06-t09-t12-output.txt` líneas 84–88 (`✅ RESUELTO`) |
| `F3.4` (`T12`) | `F3` · `F3-auth-mfa-sessions.md` §6.2 | Verificación dinámica de `DELETE FROM public.user_sessions WHERE device_id = ...` sin `.eq('user_id', ...)`: (a) `audit-a` contra `device-b-primary` devuelve `rows_deleted = 0` (`PASS`, RLS impide takeover cross-tenant); (b) `audit-a` en `aal1` contra `device-a-other` devuelve `rows_deleted = 1` (`FAIL`, permite takeover sin MFA y sólo borra la fila en tabla sin revocar el JWT en GoTrue). | `N3` (Lab Docker PG17) | `.agent/audit/scratch/poc-t06-t09-t12-output.txt` líneas 89–90 (`✅ RESUELTO`) |
| `F4.1` (`T13`) | `F4` · `F4-storage-inventory.md` §5 | Ejecución en Node 26 con WebCrypto real (`poc-t13-logout-storage.mjs`) del ciclo completo `audit-a` → `AuthContext.signOut()` → login `audit-b`. **Confirmados dinámicamente `SEC-015` y `F4-D` (`FAIL`):** persisten `migol-finanzas-v2`, `finance-pal-sync-queue-encrypted`, recibos en IndexedDB/Filesystem y `finance-pal-audit` (`audit-b` lee en texto plano las 3 entradas de `audit-a` incluyendo `newEmail`), mientras que la eliminación de `finance-pal-encrypted-v1-salt` lanza `OperationError` al intentar descifrar recibos previos de `audit-a`. | `N2` (PoC WebCrypto Node 26) | `.agent/audit/scratch/poc-t13-logout-storage.mjs`, `poc-t13-output.json` (`✅ RESUELTO`) |

---

## 6. Verificación de Criterios de Aceptación (Sign-off de la Auditoría v1.21.0)

- [✅] **CA-01 (Hallazgos Previos):** Los 21 hallazgos (`SEC-001`…`SEC-021`) tienen un estado final verificado con evidencia enlazada.
- [✅] **CA-02 (Nuevas Hipótesis):** Las 12 hipótesis (`NEW-01`…`NEW-12`) están confirmadas o descartadas con su nivel de prueba (`N0`–`N3`).
- [✅] **CA-03 (Matriz de Pruebas):** **25/25 pruebas ejecutadas (`100%`)**, incluyendo la resolución dinámica de `T06`, `T09`, `T12` y `T13` por Antigravity (`agy`) en Fase 3.
- [✅] **CA-04 (Schema Drift):** El desfase entre el esquema de producción y el repositorio (`NEW-05`) está documentado en `.agent/audit/evidence/F2-schema-drift.md`.
- [✅] **CA-05 (Seguridad en Producción):** Cero impacto en usuarios reales; ninguna prueba destructiva se ejecutó contra el proyecto de producción (`rjforcrdyfuodsqtopvp`).
- [✅] **CA-06 (Informe v2 y Backlog):** `.agent/security_audit.md` v2 incluye vectores CVSS v3.1, referencias ASVS/MASVS, matriz de riesgo residual y backlog priorizado P0–P3 (incluyendo `F2-A`).
- [✅] **CA-07 (Cero Cambios en Código):** `CP-00`…`CP-11` y el cierre de Fase 3 solo tocaron `.agent/` y `graphify-out/`; `src/**`, `supabase/**`, `android/**`, `public/**` y `package.json` no fueron modificados por la auditoría.
- [✅] **CA-08 (Cero Fuga de Secretos):** `gitleaks dir .agent --redact` = 0 hallazgos; sin patrones `sbp_`/JWT en `.agent/`; JWT de v1 redactado.

---

## 7. Dictamen Final y Recomendación de Transición al Ciclo de Remediación

- **Dictamen de la Auditoría v2:** `🔴 RIESGO ALTO — NO CERTIFICABLE PARA PRODUCCIÓN MULTIUSUARIO HASTA CERRAR EL BACKLOG P0` (`🟢 APROBADO Y CERTIFICADO EL ENTREGABLE DE AUDITORÍA V2 POR ANTIGRAVITY`).
- **Notas Finales del Arquitecto (`agy`):**
  1. Se completaron las **39/39 tareas** (`F0.1`–`F11.4`), los **12 bloques de revisión (`R-F0`…`R-F11`)** y las **25/25 pruebas (`T01`–`T25`)**.
  2. La verificación dinámica en Fase 3 confirmó `NEW-04` (`T09`), `SEC-015`/`F4-D` (`T13`) y destapó el hallazgo adicional **`F2-A` (CVSS 8.1)** en `public.push_subscriptions` (`UPDATE USING (true)` permite secuestro global de filas mediante `UPDATE` sin `WHERE`).
  3. El siguiente ciclo de trabajo en `.agent/workflow/` será el **Sprint de Remediación P0 (6 ítems bloqueantes)**:
     - **P0-1 (`NEW-04`):** Exigir `aal2` en políticas RLS y funciones cuando el usuario tenga un factor TOTP verificado (`(SELECT count(*) FROM auth.mfa_factors WHERE user_id = auth.uid() AND status = 'verified') = 0 OR auth.jwt()->>'aal' = 'aal2'`).
     - **P0-2 (`F2-A`):** Corregir la política `UPDATE` de `public.push_subscriptions` reemplazando `USING (true)` por `USING (auth.uid() = user_id)`.
     - **P0-3 (`F8-A` / `SEC-012`):** Habilitar `flowType: 'pkce'` en `src/lib/supabase.ts`, migrar a Android App Links verificados (`autoVerify="true"`), validar `state` y eliminar `setSession` directo desde intents no confiables.
     - **P0-4 (`SEC-002` / `NEW-01` / `F4-F`):** Rediseñar la derivación de clave en `src/lib/encrypted-storage.ts` (secreto en Keystore/passphrase de usuario no derivable de `user.id`) y corregir la migración 100k→600k re-cifrando antes de actualizar el salt.
     - **P0-5 (`SEC-015` / `F4-D` / `F10-B`):** Unificar la purga en `signOut()` (`migol-finanzas-v2`, `finance-pal-sync-queue-encrypted`, `finance-pal-receipts`, `finance-pal-audit`, `Directory.Data`) sin corromper recibos en sesiones válidas.
     - **P0-6 (`SEC-008` / `T11`):** Endurecer la configuración de Auth en producción (`password_min_length >= 12`, `password_hibp_enabled = true`, CAPTCHA, notificaciones de seguridad activas y `sessions_inactivity_timeout`).
- **Firma / Aprobación:** ✅ **Firmado y Certificado por Antigravity (`agy` — Google Gemini 3.8 Flash / Google Argon 4) — `2026-10-20`**.
