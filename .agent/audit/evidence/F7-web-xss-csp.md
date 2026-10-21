# F7 — Plataforma Web, XSS y Headers HTTP (`T20`–`T22`, `NEW-10`, `NEW-11`)

> **Fase:** `F7` — Prioridad `P2`
> **Fecha:** `2026-10-20` (SAST/ZAP: `2026-10-21 01:48–01:55 UTC`; HEAD pasivo: `01:50:31 UTC`)
> **Niveles:** `N0` (SAST + revisión de código) + Pasivo (`HEAD` único a producción) + Local (ZAP baseline sobre `dist` con headers de producción)
> **Alcance:** `src/**`, `public/**`, `supabase/functions/**`, `netlify.toml`, `vercel.json`, `index.html` y `https://financepal-web.vercel.app/`.
> **Estado:** `T20` ✅ sin XSS explotable; `NEW-10` ✅ descartado (código muerto); `NEW-11` ⚠️ parcial (CSP fuerte pero con wildcards y headers COOP/CORP ausentes); `T22` ✅ baseline local (0 FAIL, 5 WARN).

---

## 0. Resumen

| Hallazgo | Severidad | Veredicto |
| :--- | :---: | :--- |
| `T20` — SAST React/TS | — | ✅ **PASA**: 173 reglas Semgrep sobre 304 archivos; 11 hallazgos, **ninguno** de XSS/DOM en `src/`. |
| `NEW-10` — `dangerouslySetInnerHTML` en `chart.tsx` | **Baja** | ✅ **DESCARTADO (no explotable)**: `ChartContainer` no tiene llamantes, `ChartStyle` solo se usa internamente y el componente no está en `dist/` (tree-shaken). Si se reactiva, es un sink de inyección CSS. |
| `NEW-11` — Debilidades CSP / headers | **Media/Baja** | ⚠️ **CONFIRMADO PARCIAL**: CSP y HSTS presentes y `script-src 'self'`; pero `img-src https:`, `connect-src https://*.supabase.co`, `style-src 'unsafe-inline'`, sin `object-src 'none'`, sin COOP/CORP/COEP, sin SRI en Google Fonts y sin reporting. |
| `F7-A` (nuevo) — CSP ausente en la WebView nativa | **Baja/Media** | ❌ La CSP solo se entrega por headers de Vercel/Netlify; `index.html` no tiene `<meta http-equiv="Content-Security-Policy">`, por lo que la app Android/Capacitor no la aplica. No se encontró un sink XSS alcanzable. |
| `F7-B` (nuevo) — Google Fonts sin SRI | **Baja** | ❌ `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` sin `integrity`; un compromiso del CDN de Google Fonts podría inyectar CSS. |
| `F7-C` (nuevo) — Wildcards CSP para exfiltración | **Baja** | ⚠️ `img-src https:` y `connect-src https://*.supabase.co wss://*.supabase.co` permiten exfiltrar a cualquier proyecto Supabase o cualquier HTTPS vía imagen si existiera una inyección. |
| `F7-D` (nuevo) — `access-control-allow-origin: *` en el sitio | **Informativa** | ⚠️ Vercel devuelve `ACAO: *` en el HTML estático (no está en `vercel.json`). El contenido es público; el riesgo aparecería si se añadieran APIs bajo el mismo origen. |

---

## 1. SAST con Semgrep (`T20`)

El binario local de Semgrep sigue roto (`ModuleNotFoundError: No module named 'opentelemetry.exporter'`). Se usó el contenedor oficial:

```bash
docker run --rm -v "$PWD:/src:ro" -w /src semgrep/semgrep:latest \
  semgrep scan --config p/owasp-top-ten --config p/react --config p/typescript \
  --json --metrics=off \
  --exclude node_modules --exclude dist --exclude graphify-out --exclude .git \
  > .agent/audit/evidence/F7-semgrep.json
```

Resultado:

| Métrica | Valor |
| :--- | :--- |
| Reglas ejecutadas | `173` |
| Archivos escaneados | `304` |
| Hallazgos | `11` |
| Errores | `2` (parseo parcial de `F1-trufflehog.json` y `F7-semgrep.json`; no son código) |

Los 11 hallazgos, agrupados:

| Regla | Archivo | Línea | Severidad | Fase propietaria |
| :--- | :--- | :---: | :--- | :--- |
| `java.android.security.exported_activity` | `android/app/src/main/AndroidManifest.xml` | 12 | WARNING | `F8` (`T23`) |
| `dependabot-missing-cooldown` (×2) | `.github/dependabot.yml` | 7, 80 | MEDIUM | `F9` (`T24`) |
| `github-actions-mutable-action-tag` (×8) | `.github/workflows/{bundle-analysis,ci,dependabot-auto-merge}.yml` | 13, 15, 21, 23, 53, 55 | WARNING | `F9` (`T24`) |

**No hay hallazgos de Semgrep en `src/`** (React/TS): ni `dangerouslySetInnerHTML`, ni `target="_blank"` sin `rel`, ni `eval`, ni `innerHTML`. Los hallazgos de Android/CI se consolidan en `F8` y `F9`.

---

## 2. Auditoría manual de sumideros (`T20`)

Comando base:

```bash
rg -n "dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function\(|window\.open\(|target=\"_blank\"|javascript:" \
  src public supabase/functions index.html --glob '!src/test/**'
```

| Sumidero | Ocurrencias en código de producción | Veredicto |
| :--- | :--- | :--- |
| `dangerouslySetInnerHTML` | `src/components/ui/chart.tsx:70` | ⚠️ Único sink; **código muerto** (ver §3). |
| `innerHTML` / `outerHTML` / `insertAdjacentHTML` | 0 (solo tests de `calendar.test.tsx`) | ✅ |
| `document.write` / `eval(` / `new Function(` | 0 | ✅ |
| `window.open(` | `useUpdateToast.ts:23`, `UpdateNotification.tsx:74` | ✅ Ambos con `noopener,noreferrer`; URL de `releaseUrl` (GitHub API). |
| `target="_blank"` | `GoalDetailContent.tsx:99` | ✅ `rel="noopener noreferrer"`. |
| `href={...}` con datos | `GoalDetailContent.tsx:98` (`goal.purchaseUrl`) | ✅ `normalizeUrl()` antepone `https://` a todo lo que no empiece por `http(s)://`, neutralizando `javascript:` y `data:`. |
| `<iframe>` / `<object>` / `<embed>` / `srcdoc` | 0 | ✅ |
| `postMessage` en la app | 0 (solo el listener `message` del SW, `F6`) | ✅/⚠️ ver `NEW-08`. |
| `document.createElement("a")` + `Blob` | `Anual.tsx:175-177`, `DatosSection.tsx:181-184` | ✅ URLs `blob:` generadas localmente. |
| Render de HTML/Markdown de terceros | 0 bibliotecas (`react-markdown`, `marked`, `DOMPurify` no están) | ✅ React escapa texto; `releaseNotes` se renderiza como texto. |

No se encontró un flujo de datos desde `useFinanceData`, el JSON importado, Supabase o `localStorage` hacia un sink HTML/JS.

---

## 3. `NEW-10` — `chart.tsx` y `dangerouslySetInnerHTML`

Código (`src/components/ui/chart.tsx:61-88`):

```tsx
const colorConfig = Object.entries(config).filter(([_, config]) => config.theme || config.color);
...
<style
  dangerouslySetInnerHTML={{
    __html: Object.entries(THEMES).map(([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig.map(([key, itemConfig]) => {
  const color = itemConfig.theme?.[theme] || itemConfig.color;
  return color ? `  --color-${key}: ${color};` : null;
}).join("\n")}
}`).join("\n"),
  }}
/>
```

Trazado:

- `graphify query "ChartContainer ChartStyle callers"` devuelve solo `ChartStyle()` y `ChartContainer` dentro de `chart.tsx`, más `cn()`; **ningún llamante externo**.
- `graphify path "ChartStyle" "useFinanceData"` → `No directed path found`.
- `rg -n "ChartContainer|ChartStyle" src` solo encuentra el propio archivo.
- `rg -n "data-chart" dist/assets/*.js` → **0 coincidencias**: el componente se elimina en el bundle de producción.

**Veredicto `NEW-10`: ✅ DESCARTADO (no explotable).** No hay ruta desde datos de usuario. Riesgo residual: si el componente se reactiva con `config` o `id` dinámicos, las claves/colores se interpolan en un `<style>` sin escape (inyección CSS; no ejecución JS por `script-src 'self'`). Recomendación: eliminar el componente muerto o validar `id`/claves/colores y usar propiedades CSS (`style={{ "--color-x": color }}`) en lugar de `dangerouslySetInnerHTML`.

---

## 4. Headers y CSP (`T21`, `NEW-11`)

### 4.1 Definiciones en el repositorio

`netlify.toml:14` y `vercel.json:25` declaran **la misma CSP**:

```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob: https:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.github.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

`index.html` **no** contiene `<meta http-equiv="Content-Security-Policy">`; solo un comentario que remite a `vercel.json`.

| Header | Netlify | Vercel | Producción (HEAD) |
| :--- | :---: | :---: | :---: |
| `Content-Security-Policy` | ✅ | ✅ | ✅ (idéntica) |
| `Strict-Transport-Security` | ✅ | ✅ | ✅ `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | ✅ | ✅ | ✅ `nosniff` |
| `X-Frame-Options` | ✅ | ✅ | ✅ `DENY` |
| `Referrer-Policy` | ✅ | ✅ | ✅ `strict-origin-when-cross-origin` |
| `Permissions-Policy` | ✅ | ✅ | ✅ `camera=(), microphone=(), geolocation=(), payment=()` |
| `Cross-Origin-Opener-Policy` | ❌ | ❌ | ❌ |
| `Cross-Origin-Resource-Policy` | ❌ | ❌ | ❌ |
| `Cross-Origin-Embedder-Policy` | ❌ | ❌ | ❌ |
| `Content-Security-Policy-Report-Only` / `report-to` | ❌ | ❌ | ❌ |
| `access-control-allow-origin` | ❌ | ❌ (no declarado) | ⚠️ `*` (añadido por Vercel) |

### 4.2 Análisis de la CSP

Fortalezas:

- `script-src 'self'` sin `unsafe-inline` ni `unsafe-eval`: bloquea scripts inline y `javascript:` en navegadores que aplican CSP.
- `frame-ancestors 'none'` + `X-Frame-Options: DENY`: clickjacking mitigado.
- `base-uri 'self'` y `form-action 'self'`: evitan secuestro de `<base>` y envío de formularios a terceros.
- `default-src 'self'`: `object-src`, `frame-src`, `media-src`, `worker-src` y `manifest-src` caen en `'self'` (el SW en `/sw.js` funciona).
- HSTS con preload, XCTO, Referrer-Policy y Permissions-Policy correctos.

Debilidades:

| Directiva / header | Problema | Impacto |
| :--- | :--- | :--- |
| `img-src https:` | Permite cargar imágenes de **cualquier** origen HTTPS. | Exfiltración vía píxeles/`background-image` si existiera inyección HTML/CSS. |
| `connect-src https://*.supabase.co wss://*.supabase.co` | Wildcard de todos los proyectos Supabase, no solo `rjforcrdyfuodsqtopvp`. | Exfiltración a un proyecto Supabase controlado por el atacante si hubiera XSS. |
| `style-src 'unsafe-inline'` | Cualquier `<style>`/`style=` inline. | Inyección CSS si hubiera HTML injection; no ejecuta JS. |
| `object-src` implícito | No se declara `object-src 'none'`. | `default-src 'self'` lo limita a plugins propios; higiene. |
| `upgrade-insecure-requests` | Ausente. | HSTS ya fuerza HTTPS; residual para subrecursos HTTP. |
| COOP/CORP/COEP | Ausentes. | Aislamiento de ventanas/recursos y mitigación Spectre; bajo riesgo para una SPA sin `postMessage` en la app. |
| SRI | Google Fonts sin `integrity`. | Cadena de suministro de terceros. |
| Reporting | Sin `report-to`/`report-uri`. | No hay visibilidad de violaciones CSP. |

### 4.3 HEAD pasivo a producción

Guardado en `.agent/audit/evidence/F7-headers-prod.txt`. Resumen:

- `HTTP/2 200`, `server: Vercel`, `x-vercel-cache: HIT`.
- Todos los headers declarados llegan correctamente.
- `access-control-allow-origin: *` (no declarado en `vercel.json`; comportamiento de Vercel para estáticos). El HTML es público; **no** hay `Access-Control-Allow-Credentials`.
- `cache-control: public, max-age=0, must-revalidate` para HTML (correcto).

**Veredicto `NEW-11`: ⚠️ CONFIRMADO PARCIAL (Media/Baja).** La CSP existe y es sustancialmente mejor que “sin CSP”, pero los wildcards y la ausencia de COOP/CORP/SRI/reporting dejan margen. No se encontró un XSS que la explote.

---

## 5. ZAP baseline local (`T22`)

Para no escanear producción (`N3` prohibido), se sirvió `dist/` en `http://127.0.0.1:4173` con un servidor Node que replica **exactamente** los headers de `vercel.json` (CSP, HSTS, XCTO, XFO, Referrer-Policy, Permissions-Policy). Después:

```bash
docker run --rm --add-host=host.docker.internal:host-gateway \
  -v /tmp/zapout:/zap/wrk:rw zaproxy/zap-stable \
  zap-baseline.py -t http://host.docker.internal:4173 -m 2 -I \
  -J zap.json -r zap.html -w zap.md
```

Resultado:

| Métrica | Valor |
| :--- | :--- |
| FAIL | `0` |
| WARN | `5` |
| PASS | `62` |
| INFO | `0` |

Warnings:

1. **CSP: Wildcard Directive** (`img-src https:`, `connect-src https://*.supabase.co`).
2. **CSP: style-src unsafe-inline**.
3. **Sub Resource Integrity Attribute Missing** (Google Fonts).
4. **Cross-Origin-Embedder-Policy / Cross-Origin-Opener-Policy / Cross-Origin-Resource-Policy Missing**.
5. **Storable and Cacheable Content** (assets con `Cache-Control` inmutable; intencional) y **Modern Web Application** (informativo).

Caveats:

- El servidor local hace fallback SPA a `index.html`, por lo que `/robots.txt` y `/sitemap.xml` devolvieron `200` con HTML; en producción Vercel puede devolver `404`. No es un hallazgo real.
- El escaneo es local y pasivo (baseline); no sustituye un pentest autenticado.
- Los reportes completos están en `.agent/audit/evidence/F7-zap-baseline.json` y `.agent/audit/evidence/F7-zap-baseline.md`.

**Veredicto `T22`: ✅ PASA (baseline local, 0 FAIL / 5 WARN).** Los warnings coinciden con `NEW-11`.

---

## 6. Matriz `T20`–`T22`

| Prueba | Nivel | Estado | Resultado |
| :--- | :--- | :--- | :--- |
| `T20` SAST React/TS | `N0` | `✅ PASA` | Semgrep 173 reglas/304 archivos; 0 sinks XSS en `src/`; único `dangerouslySetInnerHTML` en código muerto. |
| `T21` Headers de producción y CSP | `N0`+Pasivo | `⚠️ PARCIAL` | CSP/HSTS/XCTO/XFO/Referrer/Permissions presentes; faltan COOP/CORP/COEP, `object-src 'none'`, reporting y SRI. |
| `T22` ZAP baseline local | Local | `✅ PASA` | 0 FAIL, 5 WARN, 62 PASS; warnings alineados con `NEW-11`. |

---

## 7. Veredictos `NEW-*`

| ID | Veredicto | Evidencia |
| :--- | :--- | :--- |
| `NEW-10` | ✅ **DESCARTADO** — sink en componente sin llamantes, tree-shaken de `dist/`; riesgo residual si se reactiva | §3 |
| `NEW-11` | ⚠️ **CONFIRMADO PARCIAL** — CSP presente pero con wildcards, `unsafe-inline`, sin COOP/CORP/COEP, sin SRI/reporting | §4-5 |

---

## 8. Recomendaciones

1. **CSP más estricta:** sustituir `img-src https:` por los orígenes concretos (o `'self' data: blob:`), y `connect-src https://*.supabase.co wss://*.supabase.co` por `https://rjforcrdyfuodsqtopvp.supabase.co wss://rjforcrdyfuodsqtopvp.supabase.co`; añadir `object-src 'none'`, `frame-src 'none'`, `worker-src 'self'`, `manifest-src 'self'` y `upgrade-insecure-requests`.
2. **COOP/CORP:** añadir `Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Resource-Policy: same-origin`; evaluar COEP `require-corp` solo tras verificar Google Fonts (probablemente requiera self-host).
3. **Fuentes:** self-host Inter/Plus Jakarta Sans (elimina Google Fonts, el `style-src` externo y el problema de SRI) o documentar la aceptación del riesgo.
4. **`style-src`:** migrar estilos inline críticos a clases; si no es viable, mantener `'unsafe-inline'` con `script-src 'self'` y justificarlo.
5. **CSP en nativo:** añadir `<meta http-equiv="Content-Security-Policy">` en `index.html` (o inyectar headers en la WebView de Capacitor) para que Android también aplique `script-src 'self'`.
6. **Reporting:** `report-to`/`report-uri` a un endpoint propio o Sentry, con muestreo.
7. **Eliminar `chart.tsx`** si no se usa, o reescribir `ChartStyle` sin `dangerouslySetInnerHTML`.
8. **Revisar `access-control-allow-origin: *`** antes de añadir APIs bajo el dominio estático; para estáticos es aceptable.
9. **Re-ejecutar ZAP** tras los cambios y comparar los 5 warnings.

---

## 9. Referencias

- `src/components/ui/chart.tsx:61-88`; `src/pages/metas/GoalDetailContent.tsx:74,98-100`; `src/pages/metas/types.ts:29-35`; `src/components/app/UpdateNotification.tsx:74,122-130`; `src/components/app/useUpdateToast.ts:19-23`.
- `netlify.toml:11-22`; `vercel.json:19-30`; `index.html:1-40`; `src/lib/version-check.ts:37,70,85`.
- `.agent/audit/evidence/F7-semgrep.json`; `.agent/audit/evidence/F7-headers-prod.txt`; `.agent/audit/evidence/F7-zap-baseline.json`; `.agent/audit/evidence/F7-zap-baseline.md`.
- `F1-supply-chain-and-bundle.md` (NEW-07); `F6-edge-push-sw.md` (SW `message`).
