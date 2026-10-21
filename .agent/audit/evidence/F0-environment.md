# 🧪 Evidencia F0 — Preparación, Estructura y Verificación de Entorno

> **Fase:** `F0` (`F0.1`, `F0.2`, `F0.3`) — Previa al Checkpoint `CP-00`
> **Fecha:** 2026-10-20
> **Agente:** OpenCode CLI (`DeepSeek 4.1 Flash`)
> **Alcance de este archivo:** Snapshot del entorno de auditoría. Sin secretos, sin tokens, sin PII (todo valor sensible redactado como `***`).

---

## F0.1 — Estructura de directorios de evidencia

Comando de verificación:

```bash
$ ls -la .agent/audit/
drwxr-xr-x  .          # .agent/audit/
drwxr-xr-x  ..         # .agent/
drwxr-xr-x  evidence/  # .agent/audit/evidence/  (vacío al inicio)
drwxr-xr-x  scratch/   # .agent/audit/scratch/   (vacío al inicio)
```

| Directorio | Estado | Uso |
| :--- | :--- | :--- |
| `.agent/audit/evidence/` | ✅ EXISTE | Evidencia formal de cada fase (`F0`–`F11`) |
| `.agent/audit/scratch/` | ✅ EXISTE | PoCs aisladas (`poc-new01-pbkdf2.mjs`), nunca en `src/` |

> Nota: los directorios ya existían al iniciar la sesión (creados con la estructura del plan). Se verificó su presencia y se documenta su propósito. No se modificó ningún archivo fuera de `.agent/`.

---

## F0.2 — Disponibilidad de herramientas externas

Comandos usados: `<tool> version` / `--version`, `docker info`, `npx supabase --version`.

| Herramienta | Disponible | Versión / Salida | Uso previsto | Alternativa si falla |
| :--- | :---: | :--- | :--- | :--- |
| `gitleaks` | ✅ SÍ | binario `/usr/bin/gitleaks` (build interno; `detect` operativo — verificado con escaneo de prueba redactado) | Secretos en historial git (`F1`, `F11`) | `trufflehog` + revisión manual |
| `trufflehog` | ✅ SÍ | `3.99.3` | Verificación de secretos activos (`F1`) | `gitleaks` |
| `semgrep` | ⚠️ PARCIAL | binario presente, **Python env roto**: `ModuleNotFoundError: No module named 'opentelemetry.exporter'` | SAST React/TS (`F7.1`) | (a) `docker run semgrep/semgrep:latest`; (b) grep exhaustivo de sumideros DOM (`F7.1`) documentado como fallback |
| `osv-scanner` | ✅ SÍ | `2.7.0` | CVEs en `package-lock.json` (`F1`, `T02`) | `npm audit --json` |
| `npx supabase` | ✅ SÍ | CLI `2.121.0` | Dump de esquema, Management API (`F2`, `F3`) | API REST directa con `curl` |
| `docker` | ✅ SÍ | daemon `29.9.1` operativo (`docker info` OK) | Laboratorio local (`N3`, `T18`, `T22`) | Sustitución por `N0`+`N1` documentada |
| `jq` | ✅ SÍ | `jq-1.8.2` | Procesado y redacción de JSON (`F1`) | `node -e` |
| `curl` | ✅ SÍ | `/usr/bin/curl` | Pruebas pasivas/`N2` (`F6`, `F7`) | — |
| `node` | ✅ SÍ | `v26.12.0` | PoC WebCrypto (`F4.2`) | — |
| `psql` | ✅ SÍ | presente | Lab local (`N3`) | `npx supabase db` |
| `graphify` | ✅ SÍ | `~/.local/bin/graphify` | Protocolo obligatorio de consulta al grafo | lectura dirigida de código |

**Conclusión F0.2:** el entorno cubre todos los niveles `N0`/`N1`/`N2`; el laboratorio local (`N3`) es viable con Docker. Única limitación: `semgrep` requiere workaround (Docker o fallback estático) que se documentará en `F7.1`.

---

## F0.3 (soporte) — Acceso CLI al proyecto Supabase de producción

Verificaciones ejecutadas sin exponer credenciales:

| Comprobación | Comando | Resultado |
| :--- | :--- | :--- |
| Token CLI presente | `test -f ~/.supabase/access-token` | ✅ PRESENTE (permisos `600`, contenido `***`) |
| Sesión/proyectos | `npx supabase projects list` | ✅ `id/ref = rjforcrdyfuodsqtopvp`, nombre `financepal`, estado `ACTIVE_HEALTHY`, `linked: true` |
| Motor PostgreSQL | salida de `projects list` | `17.6.1.166` (PostgreSQL 17, canal `ga`) |
| Región | salida de `projects list` | `us-east-1` |

> ⚠️ Recordatorio del plan (§1.1): al cerrar `F11` debe revocarse/rotarse el Personal Access Token `sbp_` usado en esta sesión.

---

## F0.3 (soporte) — Identificación del hosting y dominio público

| Archivo | ¿Existe? | Función | Observación |
| :--- | :---: | :--- | :--- |
| `netlify.toml` | ✅ | Config de Netlify (build + headers CSP + redirects SPA) | Versionado en git |
| `vercel.json` | ✅ | Config de Vercel (framework `vite`, headers CSP idénticos a Netlify) | Versionado en git |
| `.netlify/state.json` | ✅ | Metadato de linking de Netlify | ⚠️ **Versionado en git** → insumo de `NEW-12` (`F9.2`); contiene `siteId: ***` (redactado) |
| `README.md` | ✅ | Dominio de producción declarado | `https://financepal-web.vercel.app` (hosting activo: **Vercel**) |

**Identificación:** el dominio público de producción para la prueba pasiva `HEAD` (`F7.3`, `T21`) es **`https://financepal-web.vercel.app`**. Capacitor usa el esquema `app.financepal.com://` para el flujo PKCE nativo (`android`).

---

## Criterios de salida F0

- [x] Estructura `.agent/audit/{evidence,scratch}` verificada.
- [x] Tabla de herramientas y alternativas completada.
- [x] Acceso `N1` a producción confirmado (CLI vinculada).
- [x] Hosting y dominio público identificados.
- [x] CERO modificaciones en `src/**`, `supabase/**`, `android/**`, `public/**`, `package.json`.
