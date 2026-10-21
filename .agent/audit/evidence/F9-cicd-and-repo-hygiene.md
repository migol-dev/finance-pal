# F9 — CI/CD e Higiene del Repositorio (`T24`, `NEW-07`, `NEW-12`)

> **Fase:** `F9` — Prioridad `P2`
> **Fecha:** `2026-10-20`
> **Nivel:** `N0` (revisión estática de workflows, configuración de Dependabot e índice git)
> **Alcance:** `.github/workflows/{ci,bundle-analysis,dependabot-auto-merge}.yml`, `.github/dependabot.yml`, `.gitignore`, `.agentignore`, `.netlify/state.json`, `.netlify/netlify.toml`, `.vercel/` (no versionado) y `graphify-out/**` (74 archivos versionados).
> **Estado:** `T24` **FALLA** (endurecimiento de CI/CD incompleto). `NEW-07` **CONFIRMADO PARCIAL** (el eslabón de CI se suma a `esm.sh`). `NEW-12` **CONFIRMADO (Bajo)**: metadatos de despliegue y artefactos del grafo versionados.

---

## 0. Resumen

| Hallazgo | Severidad | Veredicto |
| :--- | :---: | :--- |
| `F9-A` (nuevo) — Token de GitHub con permisos de escritura en jobs que ejecutan `npm ci` | **Media** (CVSS 6.5, condicional) | ❌ **CONFIRMADO**: `dependabot-auto-merge.yml` declara `contents: write` + `pull-requests: write` a nivel de workflow; el job `ci` (mismo workflow) ejecuta `npm ci`/build con ese token y `actions/checkout` persiste credenciales. `ci.yml` y `bundle-analysis.yml` no declaran `permissions:`. |
| `F9-B` — `npm audit` no bloqueante | **Media** (CVSS 5.3) | ❌ **CONFIRMADO**: `npm audit --audit-level=high || true`; con 3 críticas/31 altas de `F1`, el pipeline queda verde. |
| `F9-C` — Auto-merge de Dependabot sin gate de seguridad | **Media** (CVSS 6.5) | ❌ **CONFIRMADO**: auto-merge de patch/minor/security; el job `ci` de Dependabot **no** ejecuta `npm audit`, usa Node 18 (EOL) y no hay evidencia de required checks antes de `gh pr merge --auto`. |
| `F9-D` — Node 18 EOL en el CI de Dependabot | **Baja** | ⚠️ `ci.yml` usa Node 20; el job `ci` de `dependabot-auto-merge.yml` usa Node 18, sin `engines` en `package.json`. |
| `F9-E` — Artefacto `bundle-stats` con `dist/stats.html` | **Baja/Info** | ⚠️ `bundle-analysis.yml` sube `dist/stats.html` como artifact en cada push a `main`; expone nombres de módulos/rutas y versiones (ya público vía `dist/` por `SEC-021`). |
| `NEW-12` — Metadatos versionados | **Baja** (CVSS 4.3) | ❌ **CONFIRMADO**: `.netlify/state.json` (siteId), `.netlify/netlify.toml` (ruta local `E:\Projects\...` y CSP antigua) y 74 archivos versionados de `graphify-out/` (incl. `cache/` y `.graphify_python` con ruta local) están en git; `.vercel/` sí está ignorado. |
| `F9-F` — Reglas `.env*` contradictorias | **Info** | ⚠️ `.gitignore` termina con `.env*` después de `!.env.template`, por lo que la excepción queda anulada; `.agentignore` usa `!.env.example` (inexistente). `.env.template` sigue versionado por haber sido añadido antes. |

**Resultado de pruebas:** `T24` ❌ **FALLA**. No se modificó ningún workflow ni archivo de configuración.

---

## 1. Método y alcance

Revisión estática `N0`:

```bash
# Workflows y configuración de Dependabot
for f in .github/workflows/*.yml .github/dependabot.yml; do cat "$f"; done

# Acciones fijadas por SHA (40 hex) vs tags mutables
grep -rn "uses:" .github/workflows
grep -rn "uses:.*@[0-9a-f]\{40\}" .github/workflows   # → sin resultados

# Metadatos versionados
git ls-files | grep -Ei "(^|/)\.netlify|(^|/)\.vercel|^graphify-out/|(^|/)\.env"
git ls-files | grep -c "^graphify-out/"                 # → 74
du -sh graphify-out                                     # → 23M

# Reglas de exclusión
cat .gitignore .agentignore
```

No se ejecutaron workflows ni se hizo push. No se leyeron `.env`, `.env.local` ni `.env.template`; la evaluación de `.env.template` se limita a su presencia en el índice git (F1 ya lo cubrió con escáneres redactados). No se modificaron archivos bajo `.github/**`.

---

## 2. Inventario de workflows

| Workflow | Disparadores | `permissions:` | Acciones (tag) | Node | Auditoría | Observaciones |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `ci.yml` | `push`/`pull_request` a `main`/`master` | ❌ ausente | `checkout@v4`, `setup-node@v4` | 20 | `npm audit --audit-level=high \|\| true` | Typecheck, lint, vitest+coverage, build. El audit no bloquea. |
| `bundle-analysis.yml` | `push` a `main`, `workflow_dispatch` | ❌ ausente | `checkout@v4`, `setup-node@v4`, `upload-artifact@v4` | 20 | ❌ ninguna | `npm run analyze` genera `dist/stats.html` y lo sube como artifact `bundle-stats`. |
| `dependabot-auto-merge.yml` | `pull_request` (opened/synchronize/reopened/labeled/unlabeled), `push` a `main`/`master` | ⚠️ `contents: write`, `pull-requests: write` (workflow) | `dependabot/fetch-metadata@v2`, `checkout@v4`, `setup-node@v4` | 18 (job `ci`) | ❌ ninguna | Auto-merge patch/minor/security; majors solo etiqueta. |

### 2.1 `F9-A` — Permisos de escritura y credenciales persistentes

`dependabot-auto-merge.yml:9-11`:

```yaml
permissions:
  contents: write
  pull-requests: write
```

Ese bloque aplica a **todos** los jobs del workflow, incluido `ci` (L48-69), que ejecuta:

```yaml
- uses: actions/checkout@v4          # persist-credentials: true por defecto
- run: npm ci                        # ejecuta lifecycle scripts de dependencias
- run: node ./node_modules/typescript/bin/tsc --noEmit
- run: npx vitest run --run
- run: npm run build
```

`actions/checkout` guarda el token en `.git/config` por defecto (`persist-credentials: true`). Cualquier `postinstall`/script de un paquete comprometido puede leerlo y usarlo con `contents: write`/`pull-requests: write` para empujar a la rama del PR, modificar el PR o aprobar/mergear. El riesgo es condicional a que el repositorio tenga el default de permisos en “Read and write” y a que el PR sea de Dependabot (no de un fork; GitHub degrada tokens de forks en `pull_request`), pero el diseño no aplica mínimo privilegio.

`ci.yml` y `bundle-analysis.yml` **no declaran `permissions:`**. Su token efectivo depende del default del repositorio/organización; si es write-all, el mismo patrón aplica a `npm ci` en cada push/PR. La recomendación es declarar `permissions: contents: read` en ambos y `persist-credentials: false` en checkout, o separar el job de auto-merge en un workflow con `pull_request_target` y permisos mínimos.

**Vector CVSS 3.1:** `AV:N/AC:H/PR:L/UI:N/S:U/C:H/I:H/A:N` → **6.5 (Media)**.
(Requiere comprometer una dependencia/script; el impacto es integridad del repositorio y del pipeline.)

### 2.2 `F9-B` — `npm audit` no bloqueante

`ci.yml:21-22`:

```yaml
- name: Security Audit
  run: npm audit --audit-level=high || true
```

`|| true` convierte el paso en informativo. Con `F1` (52 advisories npm: 3 críticas/31 altas; 10 runtime: 7 altas; 81 OSV: 3 críticas/30 altas), el pipeline puede estar verde y desplegar. Además, `npm audit` no cubre Deno/`esm.sh` (`NEW-07`).

**Recomendación:** quitar `|| true`, usar `npm audit --omit=dev --audit-level=high` como gate y añadir `osv-scanner`/`npm audit signatures`; si se necesita tolerar deuda, usar `audit-ci` con allowlist explícita y fecha de expiración.

**Vector CVSS 3.1:** `AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:N/A:N` → **5.3 (Media)**.

### 2.3 `F9-C` — Auto-merge sin gate de seguridad

`dependabot-auto-merge.yml:17-46` habilita `gh pr merge --auto --merge` para:

- `version-update:semver-patch`
- `version-update:semver-minor`
- `security-update`

El job `ci` del mismo workflow (L48-69) hace typecheck, lint, tests y build, pero **no** ejecuta `npm audit` ni `osv-scanner`; además usa Node 18. `gh pr merge --auto` solo espera los **required status checks** de la rama; si la protección de `main` no exige el job `ci`, el merge puede ocurrir antes de que termine. No se puede verificar la configuración de branch protection desde el repositorio; se documenta como dependencia externa.

**Cadena de riesgo:** Dependabot propone un bump de patch/minor → `npm ci` ejecuta scripts del paquete → el paquete está comprometido o tiene una vulnerabilidad → CI no audita → auto-merge lo integra. La ventana se reduce si `main` exige revisión y checks, pero el workflow no lo garantiza.

**Recomendación:** auto-merge solo para `security-update` con checks requeridos; ejecutar `npm audit`/OSV en el job de Dependabot; exigir revisión humana para `github-actions` y para cambios de runtime; separar `permissions` y usar `pull_request_target` con cuidado (nunca ejecutar código del PR con secretos).

**Vector CVSS 3.1:** `AV:N/AC:H/PR:L/UI:N/S:U/C:H/I:H/A:N` → **6.5 (Media)**.

### 2.4 `F9-D` — Node 18 EOL

`ci.yml` usa Node 20; el job `ci` de `dependabot-auto-merge.yml` usa Node 18. Node 18 alcanzó EOL en abril de 2025 y no recibe parches de seguridad. No hay `engines` en `package.json`, por lo que nada impide que un entorno use 18. **Recomendación:** unificar en Node 20/22 y declarar `"engines": { "node": ">=20" }`.

### 2.5 `F9-E` — Artefacto de bundle

`bundle-analysis.yml:23-27`:

```yaml
- name: Upload bundle report
  uses: actions/upload-artifact@v4
  with:
    name: bundle-stats
    path: dist/stats.html
```

`dist/stats.html` (1.26 MB, `SEC-021`) contiene el grafo de módulos, rutas y versiones; no contiene secretos, pero facilita el reconocimiento. En un repo público, los artifacts son descargables por usuarios con lectura. La retención por defecto es 90 días. **Recomendación:** no subir el artifact o reducirlo a un resumen; excluir `stats.html` del deploy (`dist/` se publica en Netlify/Vercel).

### 2.6 Acciones fijadas por tag mutable

Todas las acciones usan tags (`@v4`, `@v2`), ninguna SHA de 40 hex:

```text
actions/checkout@v4
actions/setup-node@v4
actions/upload-artifact@v4
dependabot/fetch-metadata@v2
```

Un tag puede moverse si la acción se compromete; `dependabot/fetch-metadata` es de terceros y recibe el `GITHUB_TOKEN` con escritura. **Recomendación:** fijar a SHA completo (Dependabot puede actualizar los pins) y revisar el diff de la acción.

---

## 3. Higiene del repositorio (`NEW-12`)

### 3.1 Archivos versionados

`git ls-files` confirma:

| Ruta | Estado | Contenido / riesgo |
| :--- | :--- | :--- |
| `.netlify/state.json` | ❌ versionado | `{ "siteId": "e0d143c9-1b60-48cb-847c-ca9ff6a10b54" }`; identificador del sitio, no es un secreto, pero permite enumeración/identificación de despliegues. |
| `.netlify/netlify.toml` | ❌ versionado | Configuración de despliegue adicional (80 líneas vs 49 del `netlify.toml` raíz). Contiene `publish = "E:\Projects\My Finance Mate\FINANCE PAL (ACTUAL LAST)\finance-pal\dist"` (ruta local) y una CSP más laxa (`script-src 'self' 'unsafe-inline'`) que la del raíz (`script-src 'self'`). |
| `graphify-out/**` | ❌ 74 archivos versionados; ~23 MB en disco | `graph.json` (2.1 MB), `GRAPH_REPORT.md` (35 KB), `graph.html`, `manifest.json`, `cost.json`, `cache/ast/**`, `cache/semantic/**`, `.graphify_python`, `.graphify_root`, `.graphify_labels.json`. |
| `graphify-out/.graphify_python` | ❌ versionado | Contiene `/home/migol/.local/share/uv/tools/graphifyy/bin/python`: filtra el nombre de usuario y la ruta local. |
| `graphify-out/.graphify_root` | ❌ versionado | `.` (sin ruta absoluta). |
| `graphify-out/cost.json` | ❌ versionado | `input_tokens`/`output_tokens` = 0; sin coste ni secretos. |
| `graphify-out/cache/semantic/**` | ❌ versionado | Metadatos/nodos del grafo; no se hallaron secretos en la muestra, pero añaden bloat y ruido en diffs. |
| `.vercel/` | ✅ ignorado / no versionado | `.gitignore` contiene `.vercel`; `git ls-files` no lo lista. |
| `.env.template` | ⚠️ versionado | Plantilla de variables; **no leída** en esta fase. `F1` ya escaneó el historial con `--redact`. |
| `.env`, `.env.local`, `.env.production` | ✅ ignorados | `.gitignore` los excluye; no están en el índice. |

**Matiz AGENTS.md:** el proyecto declara que `graphify-out/graph.json` se versiona intencionalmente y se reescribe completo en cada build; no se debe marcar el diff grande como churn. El hallazgo `NEW-12` se limita a los metadatos de despliegue y a los artefactos **no esenciales** (`cache/**`, `.graphify_python`), no al grafo en sí.

### 3.2 `.gitignore` / `.agentignore`

`git ls-files` y las reglas muestran:

- `.gitignore` contiene `!.env.template` y, al final, `.env*`. El patrón posterior gana, así que la excepción queda anulada; `.env.template` solo sigue versionado porque ya estaba en el índice. Si se elimina y se vuelve a añadir, quedará ignorado.
- `.agentignore` ignora `.env*` pero exceptúa `!.env.example`, archivo que no existe; `.env.template` queda ignorado para agentes (correcto desde el punto de vista de seguridad, pero la excepción es inútil).
- `.gitignore` no ignora `.netlify/` ni `graphify-out/`; sí ignora `.vercel`.
- No hay reglas para `*.jks`/`*.keystore` (ver `F8-D`).

**Recomendación:** reordenar `.env*` y `!.env.template` (o eliminar la excepción si no se quiere la plantilla), cambiar `!.env.example` por `!.env.template` si se desea permitir su consulta, y añadir `*.jks`/`*.keystore`.

### 3.3 `NEW-12` — Veredicto

❌ **CONFIRMADO (Bajo).** `.netlify/state.json` y 74 archivos de `graphify-out/` están versionados. El `siteId` no es un secreto y el grafo es intencional, pero la ruta local en `.graphify_python`, los caches y la copia de `netlify.toml` son higiene deficiente y amplían la información disponible para un atacante que ya tenga acceso al repositorio. No se encontraron tokens, JWT ni credenciales en estos archivos.

**Vector CVSS 3.1:** `AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N` → **4.3 (Baja)**.

---

## 4. Mapeo a pruebas e hipótesis

| Prueba / Hipótesis | Resultado | Detalle |
| :--- | :---: | :--- |
| `T24` Endurecimiento de CI/CD | ❌ **FALLA** | Sin `permissions` mínimos en `ci.yml`/`bundle-analysis.yml`; `dependabot` con write; audit no bloqueante; acciones por tag; Node 18; auto-merge sin gate de seguridad. |
| `NEW-07` Supply chain | ⚠️ **CONFIRMADO PARCIAL** | `esm.sh@2` flotante (`F1`/`F6`) + `npm audit \|\| true` + auto-merge + acciones mutables. |
| `NEW-12` Metadatos versionados | ❌ **CONFIRMADO (Bajo)** | `.netlify/state.json` y `graphify-out/**`; `.vercel` ignorado. |

---

## 5. Recomendaciones priorizadas

| Prioridad | Acción | Hallazgo | Esfuerzo |
| :--- | :--- | :--- | :---: |
| **P1** | `permissions: contents: read` en `ci.yml`/`bundle-analysis.yml`; `persist-credentials: false`; separar auto-merge con permisos mínimos | `F9-A` | S |
| **P1** | Quitar `\|\| true` de `npm audit`; añadir OSV/audit-ci como gate | `F9-B` | S |
| **P1** | Auto-merge solo con required checks y auditoría en el job de Dependabot; revisión humana para actions/runtime | `F9-C` | M |
| **P2** | Fijar acciones a SHA completo | `F9-A` | S |
| **P2** | Unificar Node 20/22; declarar `engines` | `F9-D` | S |
| **P2** | No publicar `stats.html`; limitar artifact | `F9-E`/`SEC-021` | S |
| **P3** | Dejar de versionar `.netlify/state.json`, `graphify-out/cache/**` y `.graphify_python`; conservar `graph.json`/wiki si se desea | `NEW-12` | S |
| **P3** | Corregir reglas `.env*`/`.env.template` y añadir `*.jks`/`*.keystore` | `F9-F`/`F8-D` | S |

---

## 6. Limitaciones

- **Sin ejecución de workflows.** No se hizo push ni se dispone de la configuración de branch protection, required checks, default token permissions ni auto-merge del repositorio. `F9-A`/`F9-C` son riesgos de diseño condicionados a esa configuración; deben confirmarse en GitHub Settings → Actions → General y Branches.
- **Sin acceso a artifacts.** No se descargó `bundle-stats`; el contenido se infiere de `dist/stats.html` (`SEC-021`).
- **`graphify-out`:** no se auditó cada uno de los 74 archivos; se revisaron los metadatos y una muestra de `cache/semantic`. No se encontraron secretos, pero no se ejecutó un escáner dedicado sobre el grafo en esta fase (`F11.3` lo hará sobre `.agent/`; `F1` cubrió el historial).
- **`.env.template`:** no se leyó por la restricción del protocolo; la evaluación es solo de su presencia/reglas.
- **Actions:** no se verificaron los SHA de las versiones `@v4`/`@v2` ni sus permisos internos; se aplica la recomendación general de pinning.
