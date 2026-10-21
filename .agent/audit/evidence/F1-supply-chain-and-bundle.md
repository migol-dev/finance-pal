# 📦 Evidencia F1 — Secretos, Bundle y Cadena de Suministro

> **Fases cubiertas:** `F1.1`–`F1.4` (`T01`, `T02`, `T03`, `SEC-006`, `SEC-021`, `NEW-07`)
> **Fecha:** 2026-10-20 · **Agente:** OpenCode CLI (DeepSeek 4.1 Flash) · **Nivel:** `N0`
> **Higiene:** sin secretos ni PII. Todo token/JWT/email se muestra como `***`.

---

## F1.1 — `T01`: Secretos en el historial git

### Comandos ejecutados

```bash
gitleaks detect --source . --log-opts="--all" --redact -f json \
  -r .agent/audit/evidence/F1-gitleaks.json
# → 343 commits escaneados, 3 hallazgos (exit 1)

trufflehog git file://. --only-verified --json \
  > .agent/audit/evidence/F1-trufflehog.json
# → chunks=4676, verified_secrets=0, unverified_secrets=0, exit 0
```

### Resultado `gitleaks` (3 hallazgos, secretos redactados por la herramienta)

| # | Regla | Archivo:línea | Commit | Fecha | Entropía | Veredicto |
| :-: | :--- | :--- | :--- | :--- | :---: | :--- |
| 1 | `generic-api-key` | `.env.template:15` | `3b6a7552` | 2026-07-22 | 3.82 | ⚠️ Valor tipo API key en plantilla versionada (probable `VITE_SUPABASE_ANON_KEY`) |
| 2 | `generic-api-key` | `src/lib/encrypted-storage.ts:16` | `4b55ff56` | 2026-07-20 | 3.74 | ✅ **Falso positivo**: `STORAGE_KEY = 'finance-pal-encrypted-v1'` (nombre de clave, no secreto) |
| 3 | `jwt` | `.env:3` | `3d168652` | 2026-07-20 | 5.59 | ⚠️ **JWT real en el historial** (`.env` estuvo versionado). Valor redactado `***` |

- El archivo `F1-gitleaks.json` se **sanitizó** (`Author`/`Email` → `***`) para eliminar PII del autor.
- `trufflehog --only-verified`: **0 secretos verificados** (ninguno de los hallazgos es explotable contra un servicio externo en el momento del escaneo).
- **No se leyó ningún `.env*`**: el hallazgo proviene exclusivamente de la salida redactada de `gitleaks`.

**Riesgo:** un `.env` con un JWT de Supabase quedó en el historial (commit `3d168652`). Por el contexto del proyecto corresponde a la **clave `anon`** (pública por diseño), pero su presencia en el historial impide rotarla sin dejar rastro y puede arrastrar otros valores si el archivo creció. **Recomendación:** rotar claves (`anon` → publishable key), purgar `.env` del historial (`git filter-repo`) y añadir escaneo `gitleaks` bloqueante en CI (`F9`).

---

## F1.2 — `T02`: Vulnerabilidades en dependencias

### Comandos

```bash
npm audit --json            > .agent/audit/evidence/F1-npm-audit.json   # exit 1 (vulns)
npm audit --omit=dev --json # análisis complementario (solo producción)
osv-scanner scan --lockfile=package-lock.json > .agent/audit/evidence/F1-osv.txt
```

### Resumen

| Fuente | Total | Critical | High | Moderate | Low | Unknown |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `npm audit` (árbol completo) | **52** | **3** | **31** | 17 | 1 | — |
| `npm audit --omit=dev` (runtime) | **10** | 0 | **7** | 3 | 0 | — |
| `osv-scanner` | **81** (27 paquetes) | **3** | **30** | 38 | 8 | 2 |

- `package-lock.json` contiene **1 163 paquetes** analizados por OSV.
- **78 de 81** vulnerabilidades OSV tienen versión de corrección disponible.

### Hallazgos relevantes en runtime (producción)

| Paquete | Sev. | Vía / Título | Corrección |
| :--- | :---: | :--- | :--- |
| `react-router` / `react-router-dom` `6.30.6` | 🟡 Media | Open redirect vía backslash en `<Link>`/`useNavigate` (bypass CVE-2025-68470); inyección de constructor en `deserializeErrors` | `react-router-dom@7.18.4` (major) |
| `source-map-js` `1.2.1` | 🟠 Alta | DoS de event-loop con offsets de source-map indexados | `1.2.2` (`npm audit fix`) |
| `brace-expansion` `2.1.4` | 🟠 Alta | DoS por recursión/expansión cuadrática | `2.1.5+` |
| `braces` `3.0.3` (vía `tailwindcss-animate`→`tailwindcss`) | 🟠 Alta | Stack exhaustion con patrones anidados | sin fix directo; requiere `tailwindcss@4` |
| `micromatch` / `fast-glob` / `chokidar` (cadena `tailwindcss`) | 🟠 Alta | ReDoS / DoS heredados | `tailwindcss@4.3.3` (major) |
| `tailwindcss` `3.4.19` (transitiva de producción vía `tailwindcss-animate`) | 🟠 Alta | Cadena anterior | `4.3.3` (major) |
| `postcss-selector-parser` `6.1.2` | 🟡 Media | DoS por recursión en AST | `7.1.6` / `6.1.3` |

### Hallazgos críticos (solo tooling de desarrollo / build, no runtime)

| Paquete | Vía | Impacto | Nota |
| :--- | :--- | :--- | :--- |
| `tar` (crítico) | `vercel@64.5.0` (devDependency) | Confusión de cabeceras PAX en parser tar | Solo CLI de despliegue local/CI |
| `tinypool` (crítico) | `vitest@3.2.4` (dev) | Prototype pollution → RCE en worker options | Solo ejecución de tests |
| `vitest` (crítico) | directa (dev) | Path traversal / lectura arbitraria vía `@vitest/mocker` | Solo ejecución de tests |
| `sharp` (alto) | directa (dev) | Vulnerabilidad en `librsvg` (CVE-2026-96889) | Solo `optimize-images` |

> **Conclusión `T02`:** ❌ **Abierto** — existen 7 vulnerabilidades High en el árbol de producción y 3 Critical en tooling de desarrollo. Ninguna se explota de forma remota en el bundle del navegador (las High de producción son cadenas de build/DoS de herramientas como `tailwindcss`, y `react-router` requiere interacción/uso de la app), pero **no cumplen** el criterio "0 High/Critical sin mitigar". No se ejecutó `npm audit fix` (prohibido modificar `package.json`/lock en este ciclo).

---

## F1.3 — `T03`, `SEC-006`, `SEC-021`: Build, bundle y JWT `anon`

### Build

```bash
npm run build   # vite build → exit 0, ~19.8 s, salida en dist/ (3.4 MB)
```

| Comprobación | Resultado |
| :--- | :--- |
| `dist/**/*.map` (source maps) | ✅ **0 archivos** (no se filtran fuentes) |
| Patrones `service_role`, `VAPID_PRIVATE`, `FUNCTION_SECRET`, `sk_live`, `BEGIN PRIVATE`, `SUPABASE_SERVICE` | ✅ **0 coincidencias** en `dist/` |
| JWT embebidos en `dist/assets/*.js` | 1 (clave `anon` de Supabase, en `supabase-Cr9yYRHg.js`) |
| `dist/stats.html` | ❌ **PRESENTE (1 262 066 bytes)** generado por el build estándar |

### `SEC-006` — JWT `anon` embebido

Payload decodificado (token y firma redactados `***`):

| Campo | Valor |
| :--- | :--- |
| `alg` / `typ` | `HS256` / `JWT` |
| `iss` | `supabase` |
| `ref` | `rjforcrdyfuodsqtopvp` (público) |
| `role` | **`anon`** ✅ |
| `iat` | `2026-07-20T17:36:20Z` |
| `exp` | `2036-07-20T05:36:20Z` |
| Vigencia | **3 653 días (~10 años)** |

**Veredicto:** ⚠️ **Parcial.** La hipótesis "expiración año 2100" **no se confirma**; el `exp` real es **2036** (10 años). El `role=anon` es correcto y la clave es pública por diseño, pero una vigencia de 10 años sin rotación amplía la ventana de abuso si el RLS falla (ver `F2`). **Recomendación:** migrar a *publishable keys* y planificar rotación.

### `SEC-021` — `dist/stats.html`

- `vite.config.ts` L28-35 activa `rollup-plugin-visualizer` con `filename: "dist/stats.html"` cuando `mode === "production" || ANALYZE === "true"`; por tanto **se genera en cada build de producción**, no sólo con `ANALYZE=true`.
- Contenido verificado: nombres de módulos y rutas (`src/lib/encrypted-storage.ts`, `src/lib/audit-logger.ts`, `src/lib/migration.ts`, …), tamaños gzip/brotli y árbol de dependencias. **No** contiene código fuente ni JWT (`grep` de `PBKDF2`, `AES-GCM`, `finance-pal-encrypted-v1`, `eyJ` → 0).
- Ambos hostings publican el directorio completo (`netlify.toml`: `publish = "dist"`; `vercel.json`: `outputDirectory = "dist"`), por lo que `https://<dominio>/stats.html` queda accesible salvo regla explícita (no existe).
- **Veredicto:** ❌ **Confirmado (build)** — divulgación de información de estructura interna. La exposición efectiva en el dominio público se valida con la única petición `HEAD` pasiva de `F7` (`T21`).

---

## F1.4 — `NEW-07`: Cadena de suministro

### Edge Function `supabase/functions/send-reminders/index.ts`

| Elemento | Línea | Observación |
| :--- | :---: | :--- |
| `import { createClient } from "https://esm.sh/@supabase/supabase-js@2"` | L7 | ❌ **Import remoto flotante**: CDN de terceros + rango mayor `@2` sin pin ni SRI. Un cambio upstream altera el runtime sin revisión |
| `import webpush from "npm:web-push@3.6.7"` | L8 | ✅ Versión fijada |
| `// @ts-nocheck` | L2 | ⚠️ Sin verificación de tipos (facilita errores silenciosos) |
| `allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") \|\| "*"` | L10 | ⚠️ CORS abierto si la variable no está definida (`SEC-017`, se prueba en `F6`) |
| `rateLimit` en `Map` + clave `x-forwarded-for` | L18-20, L212-225 | ❌ Rate limit efímero y evadible por cabecera (`SEC-013`, `F6`) |
| Comparación `===` de `FUNCTION_SECRET` / service role | L234-239 | ⚠️ No es tiempo constante (`SEC-003`, `F6`) |
| `hideAmountsInNotifications: false` por defecto | L45 | ❌ Montos financieros visibles en notificaciones (`NEW-09`, `F6`) |
| `console.warn(... sub.endpoint ...)` | L522 | ⚠️ Registra endpoint push (identificador único del dispositivo) en logs (`F10`) |

### Scripts `scripts/cleanup-receipts.{cjs,js}`

- **No usan credenciales**: no hay `createClient`, `SERVICE_ROLE`, `sbp_`, `SUPABASE_URL` ni variables de entorno (grep sobre `scripts/` → 0 coincidencias).
- Operan sólo sobre archivos locales (`receipts/` + export JSON). `--delete` borra huérfanos sin confirmación interactiva (riesgo operativo menor, no de seguridad de credenciales).
- Los dos archivos son duplicados casi exactos (`.cjs` vs `.js`).

### `vite.config.ts`

| Elemento | Línea | Observación |
| :--- | :---: | :--- |
| `componentTagger()` de `lovable-tagger` | L27 | ✅ Sólo en `mode === "development"` |
| `visualizer({ filename: "dist/stats.html" })` | L29-35 | ❌ Activo en producción (`SEC-021`) |
| `build.sourcemap` | L37-47 | ✅ No definido → `false` por defecto (confirmado: 0 `.map`) |
| `terserOptions.compress.drop_console` / `drop_debugger` | L41-44 | ✅ Elimina `console.*`/`debugger` del bundle de producción (relevante para `F10`) |

**Veredicto `NEW-07`:** ⚠️ **Confirmado parcialmente** — `esm.sh` flotante en Deno y `stats.html` en el build. Las partes de CI (`npm audit || true`, auto-merge de Dependabot) se completan en `F9.1`.

---

## Matriz de resultados F1

| Prueba | Nivel | Resultado | Estado |
| :--- | :---: | :--- | :---: |
| `T01` Secretos en historial git | `N0` | 3 hallazgos gitleaks (1 JWT real redactado en `.env`, 1 plantilla, 1 falso positivo); 0 verificados por trufflehog | ❌ Abierto (rotación + purga) |
| `T02` CVE en dependencias | `N0` | 52 npm (3C/31H), 10 en runtime (7H/3M), 81 OSV | ❌ Abierto |
| `T03` Secretos / maps / `stats.html` en `dist/` | `N0` | Sin secretos ni source maps; **`stats.html` presente** | ❌ Abierto (`SEC-021`) |

## Hallazgos registrados

| ID | Título | Estado | Severidad | CVSS v3.1 | Ubicación | Evidencia |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `SEC-006` | Clave `anon` con expiración de 10 años (no 2100) | ⚠️ Parcial | INFO / BAJO | `CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N` (3.1) | `dist/assets/supabase-*.js` | este archivo |
| `SEC-021` | `dist/stats.html` generado y publicado en build de producción | ❌ Abierto | BAJO | `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` (5.3) | `vite.config.ts:28-35`, `netlify.toml`, `vercel.json` | este archivo |
| `NEW-07` | Supply chain: `esm.sh` flotante + `stats.html` (parte CI en `F9`) | ⚠️ Parcial | MEDIO | `CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:C/C:L/I:L/A:N` (4.7) | `supabase/functions/send-reminders/index.ts:7` | este archivo |

## Artefactos generados

| Archivo | Contenido |
| :--- | :--- |
| `.agent/audit/evidence/F1-gitleaks.json` | 3 hallazgos redactados, `Author`/`Email` sanitizados |
| `.agent/audit/evidence/F1-trufflehog.json` | 0 secretos verificados (JSONL vacío) |
| `.agent/audit/evidence/F1-npm-audit.json` | Reporte `npm audit --json` completo |
| `.agent/audit/evidence/F1-osv.txt` | Tabla OSV (81 vulnerabilidades / 27 paquetes) |
| `.agent/audit/evidence/F1-supply-chain-and-bundle.md` | Este informe |
