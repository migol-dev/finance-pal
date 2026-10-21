# F8 — Android / Capacitor: Manifest, Backup, Componentes, Firma y MASVS v2 (`T23`, `NEW-06`)

> **Fase:** `F8` — Prioridad `P1`
> **Fecha:** `2026-10-20`
> **Nivel:** `N0` (auditoría estática de código fuente y artefactos de build locales)
> **Alcance:** `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/res/xml/{config,file_paths}.xml`, `android/app/build.gradle`, `android/app/proguard-rules.pro`, `android/variables.gradle`, `android/gradle.properties`, `android/app/src/main/java/**`, `capacitor.config.ts`, `android/app/src/main/assets/capacitor.plugins.json` y el manifest fusionado de release.
> **Estado:** `T23` **FALLA** (endurecimiento incompleto). `NEW-06` **CONFIRMADO**. Se identifican dos hallazgos nuevos relevantes (`F8-A` y `F8-B`) y tres observaciones de proceso/funcionalidad (`F8-C`, `F8-D`, `F8-E`).

---

## 0. Resumen

| Hallazgo | Severidad | Veredicto |
| :--- | :---: | :--- |
| `NEW-06` — `android:allowBackup="true"` sin `dataExtractionRules`/`fullBackupContent` | **Media** (CVSS 5.3) | ❌ **CONFIRMADO**: el backup por defecto incluye `files/` (recibos y estado cifrado) y el directorio WebView (`localStorage`, IndexedDB, salt y sesión de Supabase). No hay reglas de exclusión. |
| `F8-A` (nuevo) — `MainActivity` exportada + custom scheme + OAuth implicit flow | **Alta** (CVSS 8.1) | ❌ **CONFIRMADO**: cualquier app puede registrar `app.financepal.com://` y recibir los tokens del fragmento, o lanzar la activity con tokens propios (`setSession`) sin validar origen/`state`. PKCE no está habilitado. |
| `F8-B` (nuevo) — `FileProvider` con raíces excesivas | **Baja** (CVSS 2.8) | ❌ **CONFIRMADO**: `file_paths.xml` expone `.` en `external-path`, `files-path` y `cache-path`; el `FileProvider` no es exportado, pero el plugin `Share` concede URIs sobre esas raíces. |
| `F8-C` — `config.xml` con `<access origin="*" />` | **Info** | ℹ️ **NO APLICABLE**: archivo generado y gitignoreado; Capacitor no lo consume (solo queda como resto Cordova). |
| `F8-D` — Firma de release no reproducible | **Baja (proceso)** | ⚠️ `build.gradle` no define `signingConfig`; `assembleRelease` produce `app-release-unsigned.apk`, aunque el README lo titula “APK firmado”. No hay keystore versionado (correcto), pero tampoco firma automatizada ni documentación de custodia. |
| `F8-E` — Push nativo no funcional | **Info (funcional)** | ⚠️ No hay `google-services.json`; el plugin `@capacitor/push-notifications` está instalado, pero `registerPushNotifications()` no tiene llamantes. La ruta FCM no puede inicializar en release. |
| `F8-F` (nuevo) — Sin `FLAG_SECURE` ni protección anti-tapjacking | **Baja** (CVSS 2.4) | ❌ **CONFIRMADO**: capturas/recientes y overlays pueden exponer montos y datos financieros; no se usa `WindowManager.LayoutParams.FLAG_SECURE` ni `setFilterTouchesWhenObscured`. |
| `F8-G` (nuevo) — Permisos sobredimensionados | **Info/Baja** | ⚠️ `READ_MEDIA_IMAGES` y `READ/WRITE_EXTERNAL_STORAGE` no son necesarios para el selector de archivos del WebView; `SCHEDULE_EXACT_ALARM` sí lo usa `LocalNotifications`. |

**Resultado de pruebas:** `T23` ❌ **FALLA**. La matriz MASVS v2 se incluye en §6: 1 `PASS`, 10 `PARTIAL`, 8 `FAIL`, 5 `N/A` (sobre 24 controles).

---

## 1. Método y alcance

Auditoría **estática `N0`** sobre el árbol de trabajo y sobre el manifest fusionado generado por Gradle:

```bash
# Archivos fuente Android versionados (58 en total)
git ls-files android | wc -l

# Manifest fusionado del último build release local
android/app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml

# Artefacto release local
android/app/build/outputs/apk/release/app-release-unsigned.apk   # 6.535.094 bytes, 2026-10-11
```

No se instaló el APK ni se ejecutó `adb backup`/`bmgr`: el `targetSdkVersion=36` restringe `adb backup` en apps no debuggeables, y no se dispone de dispositivo/emulador en esta fase. Las conclusiones sobre backup se basan en el comportamiento documentado de Android Auto Backup y en las reglas ausentes del manifest. No se modificó ningún archivo bajo `android/**`.

**Archivos generados:** `android/app/src/main/res/xml/config.xml`, `android/app/src/main/assets/capacitor.plugins.json` y `android/app/src/main/assets/public/**` están en `android/.gitignore` (sección “Generated Config files” / “Copied web assets”). Se leyeron solo para confirmar que no aportan superficie real; no se auditan como fuente.

---

## 2. Manifest: backup, componentes exportados y permisos

### 2.1 `NEW-06` — Backup habilitado sin reglas (`AndroidManifest.xml:5`)

```xml
<application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    ...
```

No existe `android:dataExtractionRules` ni `android:fullBackupContent` en el manifest fuente **ni en el fusionado**:

```bash
grep -rn "fullBackupContent\|dataExtractionRules\|backup_rules\|data_extraction" \
  android/app/src android/app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml
# (sin resultados)
ls android/app/src/main/res/xml/
# config.xml  file_paths.xml   ← no hay backup_rules.xml ni data_extraction_rules.xml
```

**Qué se incluye por defecto.** Sin reglas, Auto Backup (nube) y la transferencia dispositivo-a-dispositivo incluyen el directorio de datos de la app salvo `cache/`, `code_cache/` y `no_backup/`. En este proyecto eso comprende:

| Ruta | Contenido | Referencia |
| :--- | :--- | :--- |
| `files/receipts/**` | Recibos cifrados (`Directory.Data`) | `src/store/slices/transaction-slice.ts:126-150` |
| `files/finance-pal-encrypted-v1*` | Estado financiero cifrado y metadatos | `src/lib/encrypted-storage.ts:184-210` |
| `app_webview/` | `localStorage` (sesión `sb-…-auth-token`, salt PBKDF2, `finance-pal-device-secret`, preferencias) e IndexedDB (`finance-pal-receipts`, `finance-pal-audit`) | `F4-storage-inventory.md` §1-2 |
| `shared_prefs/` | Preferencias nativas de plugins | — |

La clave AES-GCM se deriva de `session.user.id` (UUID que no es secreto) o, en su defecto, de un `finance-pal-device-secret` **guardado en el mismo `localStorage`** (`src/lib/encrypted-storage.ts:29-49`). Por tanto, un backup que incluya a la vez el estado cifrado y `app_webview/` permite descifrar el estado y los recibos; si además incluye la sesión, permite reutilizar el refresh token. Esto materializa el escenario de `NEW-06` y agrava `SEC-002`/`SEC-015`.

**Matiz importante:** en apps con `targetSdk >= 31` no debuggeables, `adb backup` ya no extrae datos arbitrarios; el vector realista es **Google Drive Auto Backup** (cuenta del usuario comprometida) y **D2D transfer** (dispositivo nuevo). La ausencia de `dataExtractionRules` también impide excluir secretos del traslado entre dispositivos. No se afirma que `adb backup` siga funcionando en este target.

**Recomendación (P1):**

1. `android:allowBackup="false"` si no se necesita restauración; o
2. `android:dataExtractionRules="@xml/data_extraction_rules"` (API 31+) y `android:fullBackupContent="@xml/backup_rules"` (API ≤30) excluyendo:
   - `app_webview/` (sesión, salt, device-secret, IndexedDB),
   - `files/receipts/`,
   - `files/finance-pal-encrypted-v1*`,
   - `shared_prefs/` con tokens de plugins.
3. Verificar con `adb shell bmgr backupnow <package>` en un build debug y con una cuenta de prueba; no usar datos reales.

**Vector CVSS 3.1:** `AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:N/A:N` → **5.3 (Media)**.
(El atacante necesita acceso al backup en la nube o al dispositivo; la confidencialidad es alta; no hay integridad/disponibilidad directas.)

---

### 2.2 `F8-A` — `MainActivity` exportada + custom scheme + OAuth implicit flow

**Manifest (`AndroidManifest.xml:12-30`):**

```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTask"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="app.financepal.com" android:host="auth" android:path="/callback" />
    </intent-filter>
</activity>
```

- `android:exported="true"` es obligatorio para el launcher, pero también deja la activity accesible a **cualquier app** mediante un `Intent` con `data=app.financepal.com://auth/callback...`.
- El scheme es **custom**, no un App Link `https` con `android:autoVerify="true"`. Cualquier app puede declarar el mismo scheme; Android no verifica el propietario del dominio. No se encontró `assetlinks.json` en el repositorio ni `android:autoVerify` en el manifest.
- `launchMode="singleTask"` hace que un intent externo se entregue a la instancia existente (`onNewIntent`), que Capacitor propaga como `appUrlOpen`.

**Cliente Supabase (`src/lib/supabase.ts:33`):**

```ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

No se pasa `auth.flowType`. El valor por defecto de `@supabase/auth-js` es `implicit` (verificado en `node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:21`: `flowType: 'implicit'`). En consecuencia, el retorno de OAuth trae `access_token` y `refresh_token` en el **fragmento** de la URL, no un `code` PKCE.

**Handler (`src/App.tsx:387-405`):**

```ts
CapApp.addListener('appUrlOpen', async (event) => {
  const url = event.url;
  if (url.startsWith('app.financepal.com://auth/callback')) {
    const code = extractParamFromUrl(url, 'code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      ...
      return;
    }
    const hashParams = extractHashParams(url);
    const at = hashParams.access_token;
    const rt = hashParams.refresh_token;
    if (at && rt) {
      const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
      ...
    }
  }
});
```

No se valida `state`, `iss`, `aud`, ni el origen del intent. El branch `code` es código muerto mientras `flowType` siga en `implicit`; si se activara PKCE, el `code_verifier` sí protegería la interceptación, pero el handler tampoco valida `state`.

**Login (`src/pages/Login.tsx:31-40, 245-267`):** la allowlist incluye `app.financepal.com://auth/callback` y usa `skipBrowserRedirect: true` + `Browser.open(data.url)`. La validación de redirect del cliente es laxa (`endsWith('.financepal.com')`, cualquier puerto local), aunque GoTrue la contiene con su `uri_allow_list` exacta (`T10`, `F3-auth-mfa-sessions.md`). El problema de `F8-A` no es el redirect del servidor, sino **quién recibe el scheme en el dispositivo**.

**Escenarios:**

1. **Interceptación (OAuth hijack):** una app maliciosa declara `app.financepal.com` en su manifest. Cuando el usuario completa OAuth, Android puede mostrar un selector o entregar el intent a la app maliciosa; esta recibe `#access_token=…&refresh_token=…` y puede llamar a Supabase como la víctima. Con implicit flow no hay `code_verifier` que impida el canje.
2. **Fijación de sesión (session fixation):** cualquier app lanza `am start -a android.intent.action.VIEW -d "app.financepal.com://auth/callback#access_token=<AT-del-atacante>&refresh_token=<RT-del-atacante>"`. La víctima abre Finance Pal; el handler ejecuta `setSession` con la sesión del atacante. Todo lo que la víctima introduzca se sincroniza a la cuenta del atacante (y el atacante puede leerlo después). El `setSession` de auth-js valida los tokens contra GoTrue, pero son tokens **válidos del atacante**, no falsificados.
3. **Ausencia de `state`:** no hay correlación entre la petición OAuth y el callback; un intent crafted no puede ser distinguido de un callback legítimo.

**Impacto:** takeover de cuenta (escenario 1) o exposición de datos financieros introducidos por la víctima (escenario 2). Requiere una app maliciosa instalada o que la víctima abra un enlace/intent; no requiere root.

**Recomendación (P1):**

1. Cambiar a PKCE: `createClient(url, key, { auth: { flowType: 'pkce' } })`; el `code_verifier` queda en el almacenamiento de la app y un scheme hijack no basta para canjear el `code`.
2. Migrar el deep link a **Android App Links** `https://financepal.app/auth/callback` con `android:autoVerify="true"`, `assetlinks.json` publicado y `android:host` exacto; mantener el custom scheme solo como fallback.
3. Validar `state` (y `code_verifier`) en el handler; rechazar callbacks sin correlación.
4. No aceptar `access_token`/`refresh_token` por intent en release; si se mantiene el fallback, exigir que el intent venga del navegador del sistema y validar `getCallingActivity()`/`referrer` cuando sea posible.
5. En el servidor, mantener `uri_allow_list` exacta (ya está) y no confiar en la allowlist del cliente.

**Vector CVSS 3.1:** `AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:N` → **8.1 (Alta)**.
(El vector asume que la víctima completa OAuth o abre un enlace; no hay privilegios previos.)

---

### 2.3 `F8-B` — `FileProvider` con raíces excesivas (`file_paths.xml:2-7`)

```xml
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="my_images" path="." />
    <cache-path name="my_cache_images" path="." />
    <external-path name="external_files" path="." />
    <files-path name="files" path="." />
    <cache-path name="cache" path="." />
</paths>
```

El `FileProvider` (`AndroidManifest.xml:34-42`) tiene `android:exported="false"` y `grantUriPermissions="true"`, por lo que no es accesible sin una concesión explícita. Sin embargo:

- Expone la **raíz** de `files/` y `cache/` (no subdirectorios concretos), además de todo el almacenamiento externo de la app (`external-path path="."`).
- El plugin `@capacitor/share` usa exactamente la authority `${packageName}.fileprovider` (`node_modules/@capacitor/share/android/src/main/java/com/capacitorjs/plugins/share/SharePlugin.java:155-157`). Al compartir el JSON de exportación desde `Directory.Cache` (`src/pages/ajustes/secciones/DatosSection.tsx:189-213`), se concede una URI `content://` sobre una raíz amplia. La app solo comparte el archivo elegido, pero cualquier futuro cambio que construya una ruta desde datos de usuario podría conceder acceso a otros archivos internos.
- `external-path` incluye `Android/data/<pkg>/files` en almacenamiento externo, que puede ser legible por otros procesos con `MANAGE_EXTERNAL_STORAGE`/ADB en versiones antiguas.

**Recomendación (P2):** reducir a rutas mínimas, por ejemplo:

```xml
<paths>
  <cache-path name="exports" path="exports/" />
  <files-path name="receipts" path="receipts/" />
</paths>
```

Eliminar `external-path`; escribir exportaciones en `cache/exports/` y recibos en `files/receipts/`. Revisar que ninguna ruta se construya con input del usuario.

**Vector CVSS 3.1:** `AV:L/AC:L/PR:L/UI:R/S:U/C:L/I:N/A:N` → **2.8 (Baja)**.
(Requiere acceso local y una concesión de URI; el impacto es confidencialidad limitada.)

---

### 2.4 `F8-C` — `config.xml` con `access origin="*"` (informativo)

```xml
<widget version="1.0.0" ...>
  <access origin="*" />
</widget>
```

`android/app/src/main/res/xml/config.xml` está **gitignoreado** y es un resto de la generación Cordova/Capacitor; Capacitor no lee `config.xml` para su política de navegación (usa `capacitor.config.ts` y el `Bridge`). No se encontró ningún consumidor en el código nativo. Se documenta para evitar que un futuro plugin Cordova lo interprete como allowlist real. **No es un hallazgo explotable.**

---

### 2.5 Permisos (`AndroidManifest.xml:47-54`)

| Permiso | Uso real | Veredicto |
| :--- | :--- | :--- |
| `INTERNET` | Supabase/HTTPS | ✅ Necesario |
| `READ_EXTERNAL_STORAGE` (`maxSdk=32`) | No se usa: los `<input type="file">` del WebView usan el selector del sistema/SAF | ⚠️ Innecesario en API ≤32 |
| `WRITE_EXTERNAL_STORAGE` (`maxSdk=32`) | No se usa: la app escribe en `Directory.Data`/`Cache` (almacenamiento interno) | ⚠️ Innecesario |
| `READ_MEDIA_IMAGES` | No se usa: no hay `ImagePicker`/Camera; el selector de fotos del sistema no requiere permiso | ⚠️ Innecesario y sensible |
| `POST_NOTIFICATIONS` | `LocalNotifications`/push | ✅ Necesario (API 33+) |
| `RECEIVE_BOOT_COMPLETED` | Restauración de notificaciones locales (`LocalNotificationRestoreReceiver`) | ✅ Necesario para esa función |
| `VIBRATE` | Notificaciones | ✅ Necesario |
| `SCHEDULE_EXACT_ALARM` | `LocalNotifications.schedule({ at, allowWhileIdle })` (`src/lib/notifications.ts:425-434`) | ⚠️ Necesario para exactitud; revisar política de Play y degradar a alarmas inexactas si no se justifica |

**`F8-G`:** `READ_MEDIA_IMAGES` + `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE` amplían el permiso visible y la superficie de persuasión; no aportan funcionalidad. **Recomendación (P2):** eliminarlos y verificar el flujo de adjuntar recibos en un dispositivo API 33+ y API 24. Severidad **Info/Baja**, sin CVSS.

El manifest fusionado añade permisos de Firebase/Play Services (`ACCESS_NETWORK_STATE`, etc.) y receivers estándar:

- `FirebaseInstanceIdReceiver` `exported="true"` pero protegido por `com.google.android.c2dm.permission.SEND` (firma de Google).
- `ProfileInstallReceiver` `exported="true"` pero protegido por `android.permission.DUMP` (sistema).
- `LocalNotificationRestoreReceiver`, `MessagingService`, `BrowserControllerActivity` y los `FileProvider` de plugins: `exported="false"`.

No se encontraron componentes exportados adicionales explotables.

---

## 3. Build, firma y R8 (`F8-D`)

**`android/variables.gradle`:**

```gradle
minSdkVersion = 24
compileSdkVersion = 36
targetSdkVersion = 36
```

- `targetSdk/compileSdk 36` es actual (Android 16). `minSdk 24` (Android 7.0) está fuera de soporte de Google y amplía la superficie de WebView/AlarmManager antiguos; es una decisión de compatibilidad, no un fallo explotable por sí sola.
- `versionCode 12100`, `versionName "1.21.0"` (`android/app/build.gradle:10-11`), coherente con el resto de la auditoría.

**Ofuscación (`android/app/build.gradle:20-24`):**

```gradle
release {
    minifyEnabled = true
    shrinkResources = true
    proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
}
```

- `proguard-rules.pro` contiene **solo comentarios** (751 bytes, ninguna regla activa).
- `android/gradle.properties` fija `android.r8.strictFullModeForKeepRules=false`; R8 full mode no está endurecido, pero tampoco hay reglas custom que puedan romperse. La ofuscación de clases Java es limitada porque la app es primordialmente WebView/JS; el bundle JS se minifica en Vite.
- No hay `signingConfig` en `buildTypes.release`. `./gradlew assembleRelease` genera `app-release-unsigned.apk` (confirmado: `android/app/build/outputs/apk/release/app-release-unsigned.apk`, 6.535.094 bytes). El README (`README.md:698-708`) titula la sección “Build de Release (APK firmado)”, pero el comando no firma; la firma se hace fuera del repo (Android Studio/Play App Signing).
- `git ls-files | grep -Ei "\.(jks|keystore)$|google-services\.json"` → **sin resultados**. No hay keystore ni `google-services.json` versionados (correcto desde el punto de vista de secretos).
- `android/.gitignore` tiene comentadas las reglas `*.jks`/`*.keystore`, por lo que un keystore añadido en el futuro sería versionable por accidente.

**Riesgo:** no es una vulnerabilidad directa, pero la falta de firma reproducible y de custodia documentada puede provocar builds ad-hoc con claves distintas, actualizaciones rechazadas por Play o pérdida de la clave. **Recomendación (P2):** documentar el fingerprints SHA-256, usar Play App Signing, configurar `signingConfig` por variables de entorno/CI y añadir `*.jks`/`*.keystore` a `.gitignore`.

---

## 4. Capacitor, WebView y plugins

**`capacitor.config.ts`:**

```ts
const config: CapacitorConfig = {
  appId: 'app.financepal.com',
  appName: 'Finance Pal',
  webDir: 'dist',
  server: {
    cleartext: false
  },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_notification', iconColor: '#3B82F6' },
  },
};
```

- `server.cleartext: false` y ausencia de `server.url`/`allowNavigation` → la WebView carga los assets locales y no se permite tráfico HTTP. El manifest tampoco define `usesCleartextTraffic` ni `networkSecurityConfig`; con `targetSdk 36` el default es cleartext bloqueado. **NETWORK-1 PASS.**
- `webContentsDebuggingEnabled` no se define. Capacitor usa `android.webContentsDebuggingEnabled` o, por defecto, `isDebug`/`FLAG_DEBUGGABLE` (`node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/CapConfig.java:286, 607-608`). En release no debuggeable queda **desactivado**. PASS.
- `MainActivity.java` es una clase vacía que extiende `BridgeActivity`; no hay bridges JS personalizados, `@JavascriptInterface` ni `addJavascriptInterface` en el código de la app. Superficie nativa mínima.
- Plugins cargados (`android/app/src/main/assets/capacitor.plugins.json`): `@capacitor/app`, `browser`, `filesystem`, `local-notifications`, `network`, `push-notifications`, `share`. No hay `@capacitor/preferences`, `secure-storage`, `keychain`, `biometric` ni `sqlite`.
- `setJavaScriptEnabled(true)`, `setDomStorageEnabled(true)`, `setGeolocationEnabled(true)`, `setJavaScriptCanOpenWindowsAutomatically(true)` son defaults de Capacitor (`Bridge.java:589-593`). `allowMixedContent` es `false` por defecto (`CapConfig.java:46, 277-280`), por lo que no se permite mixed content.
- **CSP nativa:** la WebView carga el `index.html` construido; la CSP de Netlify/Vercel solo aplica al sitio web, no al WebView nativo (`F7-A`). Esto es relevante para PLATFORM-2: un XSS en el bundle local no tendría la mitigación de CSP. No se encontraron sinks XSS en `F7`, pero la defensa en profundidad falta.
- `F8-E` **push:** `@capacitor/push-notifications` está instalado y el manifest fusionado incluye `MessagingService` y `FirebaseInstanceIdReceiver`, pero **no hay `google-services.json`** y `android/app/build.gradle:51-58` hace un `try/catch` que solo registra un log si falta. Sin `google_app_id`, `FirebaseApp` no se inicializa y `getToken()` falla. Además, `registerPushNotifications()`/`setupPushListeners()` no tienen llamantes en `src/` (solo se usan notificaciones locales). **No es un riesgo de seguridad**, pero la función de push nativo está muerta y no debe asumirse como canal operativo.

**`F8-F` — UI sin protección:** no se usa `FLAG_SECURE` en `MainActivity` ni en ningún plugin; la app no impide capturas de pantalla ni oculta el contenido en el selector de recientes. Tampoco se llama `setFilterTouchesWhenObscured(true)` para mitigar tapjacking/overlays. En una app con montos, deudas y correos, esto expone datos en capturas, grabaciones y apps de accesibilidad maliciosas. **Recomendación (P2):** `getWindow().setFlags(FLAG_SECURE, FLAG_SECURE)` (o configurable por el usuario) y `setFilterTouchesWhenObscured(true)` en la `MainActivity`/WebView. Vector CVSS 3.1: `AV:P/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` → **2.4 (Baja)**.

---

## 5. Flujo OAuth/deep link: resumen de evidencia

| Paso | Código | Observación |
| :--- | :--- | :--- |
| Cliente Supabase | `src/lib/supabase.ts:33` | `createClient(url, anonKey)` sin `flowType` → **implicit** por defecto |
| Login | `src/pages/Login.tsx:245-267` | `skipBrowserRedirect: true` + `Browser.open(data.url)`; allowlist incluye custom scheme y localhost |
| Retorno nativo | `src/App.tsx:387-405` | `appUrlOpen` acepta `code` o `access_token`+`refresh_token`; no valida `state`/origen |
| Canje | `src/App.tsx:393, 402` | `exchangeCodeForSession` (rama muerta con implicit) o `setSession` (sin verificación de emisor) |
| Manifest | `AndroidManifest.xml:12-30` | Activity exportada, custom scheme sin `autoVerify`, `singleTask` |
| GoTrue | `F3-auth-mfa-sessions.md` §2 | `uri_allow_list` exacta bloquea redirects arbitrarios, pero no la interceptación local del scheme |

La combinación **implicit + custom scheme + exported activity** es la que produce `F8-A`. Si se migra a PKCE y App Links, el riesgo residual baja a “app maliciosa con el mismo App Link” (requiere comprometer el dominio o el `assetlinks.json`), que es mucho más difícil.

---

## 6. Matriz OWASP MASVS v2

> Controles según MASVS v2.0 (`mas.owasp.org`). `PASS` = implementado y verificado estáticamente; `PARTIAL` = hay controles pero con brechas; `FAIL` = no implementado o insuficiente; `N/A` = no aplica al modelo de amenaza declarado (app consumer sin requisitos L2/R).

| Control | Veredicto | Evidencia / justificación |
| :--- | :---: | :--- |
| **MASVS-STORAGE-1** — Almacenamiento seguro de datos sensibles | ❌ **FAIL** | Sesión Supabase en `localStorage` sin cifrar (`sb-…-auth-token`); IndexedDB `finance-pal-audit`/`finance-pal-receipts` sin cifrar; clave AES derivada de `user.id`/device-secret en `localStorage` (`F4-storage-inventory.md`, `F4-crypto-and-auditlog.md`, `SEC-002`, `NEW-01`). |
| **MASVS-STORAGE-2** — Prevención de fuga de datos sensibles | ❌ **FAIL** | `allowBackup=true` sin reglas (`NEW-06`); export JSON a `cache/` y `Share` (`DatosSection.tsx:189-213`, `SEC-018`); `FileProvider` con raíces amplias (`F8-B`). |
| **MASVS-CRYPTO-1** — Criptografía fuerte y buenas prácticas | ⚠️ **PARTIAL** | AES-GCM-256, PBKDF2-SHA256 600k, salt/IV aleatorios; pero la clave se deriva de un identificador no secreto, el audit log usa SHA-256 sin HMAC (`SEC-009`) y el upgrade 100k→600k no re-cifra (`F4-F`). |
| **MASVS-CRYPTO-2** — Gestión de claves | ❌ **FAIL** | No se usa Android Keystore/StrongBox; salt y device-secret en `localStorage`; sin rotación ni separación por usuario; la clave vive en memoria de la WebView. |
| **MASVS-AUTH-1** — Autenticación/autorización segura | ❌ **FAIL** | OAuth implicit + custom scheme + activity exportada + sin `state` (`F8-A`); MFA solo UI (`NEW-04`); `password_min_length=6`, HIBP/CAPTCHA off (`T11`). |
| **MASVS-AUTH-2** — Autenticación local segura | `N/A` | No hay autenticación local/biometría; la sesión depende de Supabase. Si se añade biometría, deberá usar `BiometricPrompt` + Keystore. |
| **MASVS-AUTH-3** — Autenticación adicional para operaciones sensibles | ❌ **FAIL** | No hay step-up auth; `aal1` conserva CRUD aunque el usuario tenga TOTP; 0 políticas RLS con `aal` (`NEW-04`, `F3-auth-mfa-sessions.md`). |
| **MASVS-NETWORK-1** — Comunicación de red segura | ✅ **PASS** | `server.cleartext=false`; sin `usesCleartextTraffic`; endpoints HTTPS (Supabase/Edge); mixed content deshabilitado; sin `server.url`/`allowNavigation`. |
| **MASVS-NETWORK-2** — Identity pinning | ❌ **FAIL** | No hay certificate pinning ni `network_security_config` con pins; se confía en el store de CAs del sistema. Aceptable para consumer, pero es un control MASVS no implementado. |
| **MASVS-PLATFORM-1** — Uso seguro de IPC | ❌ **FAIL** | `MainActivity` exportada con custom scheme y aceptación de tokens; `FileProvider` con raíces amplias; receivers exportados de Firebase/ProfileInstaller están protegidos por permisos, pero el deep link no. |
| **MASVS-PLATFORM-2** — Uso seguro de WebViews | ⚠️ **PARTIAL** | WebView local, sin bridges JS personalizados, debugging off en release, mixed content off; pero sin CSP nativa (`F7-A`) y con `JavaScriptCanOpenWindowsAutomatically=true` por defecto de Capacitor. |
| **MASVS-PLATFORM-3** — Uso seguro de la UI | ❌ **FAIL** | Sin `FLAG_SECURE` ni `setFilterTouchesWhenObscured` (`F8-F`); notificaciones muestran montos por defecto (`NEW-09`); sin ocultación en recientes. |
| **MASVS-CODE-1** — Plataforma actualizada | ⚠️ **PARTIAL** | `compileSdk/targetSdk 36` correctos; `minSdk 24` (Android 7, EOL) sigue soportado, ampliando superficie legacy. |
| **MASVS-CODE-2** — Mecanismo de actualización | ⚠️ **PARTIAL** | `UpdateNotification` consulta releases de GitHub, pero no fuerza actualización; la distribución Play depende de la política de la tienda. |
| **MASVS-CODE-3** — Componentes sin vulnerabilidades conocidas | ⚠️ **PARTIAL** | Dependencias razonablemente actuales, pero `F1` detectó 52 advisories npm (3 críticas/31 altas) y 81 OSV (3 críticas/30 altas); no hay gate bloqueante en CI (`F9` pendiente). |
| **MASVS-CODE-4** — Validación/sanitización de input no confiable | ⚠️ **PARTIAL** | React escapa por defecto y `normalizeUrl` neutraliza `javascript:`; pero `importData` no usa los esquemas Zod estrictos (`F5-A`) y el deep link acepta tokens sin validar origen (`F8-A`). |
| **MASVS-RESILIENCE-1** — Integridad de plataforma | `N/A` | No hay detección de root/jailbreak; no se declara modelo de amenaza L2/R. Si el riesgo lo exige, usar Play Integrity API. |
| **MASVS-RESILIENCE-2** — Anti-tampering | `N/A` | Sin verificación de firma/APK ni Play Integrity. |
| **MASVS-RESILIENCE-3** — Anti-static analysis | `N/A` | R8 minifica, pero no hay ofuscación avanzada ni cifrado de strings; el bundle JS es legible. |
| **MASVS-RESILIENCE-4** — Anti-dynamic analysis | `N/A` | Sin anti-debug/anti-Frida; `webContentsDebuggingEnabled` off en release es la única mitigación. |
| **MASVS-PRIVACY-1** — Minimización de datos/permisos | ⚠️ **PARTIAL** | `READ_MEDIA_IMAGES` y `READ/WRITE_EXTERNAL_STORAGE` innecesarios (`F8-G`); backup sin exclusiones (`NEW-06`); export JSON incluye email por defecto (`SEC-018`). |
| **MASVS-PRIVACY-2** — Prevención de identificación | ⚠️ **PARTIAL** | No hay SDK publicitario ni Advertising ID; pero el audit log local guarda `userId` y acciones, y la telemetría de `web-vitals` está pendiente de `F10`. |
| **MASVS-PRIVACY-3** — Transparencia | ⚠️ **PARTIAL** | No se localizó una pantalla/política de privacidad in-app (`grep` sin resultados en `src/pages`/`src/components`); el README menciona exportación pero no consentimiento. Se completará en `F10`. |
| **MASVS-PRIVACY-4** — Control del usuario | ⚠️ **PARTIAL** | Existen exportación JSON y borrado de cuenta, pero el logout no limpia estado/recibos/audit (`SEC-015`) y no hay consentimiento granular de analítica. |

**Conteo:** `PASS` 1 (`NETWORK-1`), `PARTIAL` 10, `FAIL` 8, `N/A` 5 (24 controles). Coincide con el resumen de §0.

---

## 7. Mapeo a pruebas y hallazgos

| Prueba | Resultado | Detalle |
| :--- | :---: | :--- |
| `T23` Android Manifest/backup/exported/FileProvider | ❌ **FALLA** | Backup sin reglas (`NEW-06`), activity exportada + custom scheme (`F8-A`), FileProvider amplio (`F8-B`), permisos innecesarios (`F8-G`). |
| `NEW-06` | ❌ **CONFIRMADO (Media)** | `allowBackup=true` + ausencia de `dataExtractionRules`/`fullBackupContent`; backup de `files/` y `app_webview/`. |
| `F8-A` | ❌ **CONFIRMADO (Alta)** | Implicit flow + custom scheme + `setSession` sin origen/`state`. |
| `F8-B` | ❌ **CONFIRMADO (Baja)** | Raíces `.` en `file_paths.xml`; `Share` concede URIs sobre ellas. |
| `F8-C` | ℹ️ **NO APLICABLE** | `config.xml` generado/gitignoreado; no consumido por Capacitor. |
| `F8-D` | ⚠️ **PROCESO** | Release sin `signingConfig`; APK unsigned; README inexacto; sin keystore versionado. |
| `F8-E` | ⚠️ **FUNCIONAL** | Push nativo sin `google-services.json` y sin llamantes. |
| `F8-F` | ❌ **CONFIRMADO (Baja)** | Sin `FLAG_SECURE`/anti-tapjacking. |
| `F8-G` | ⚠️ **CONFIRMADO (Info/Baja)** | Permisos de media/almacenamiento innecesarios. |

---

## 8. Recomendaciones priorizadas

| Prioridad | Acción | Hallazgo | Esfuerzo |
| :--- | :--- | :--- | :---: |
| **P1** | Migrar OAuth a PKCE + App Links con `autoVerify` + validar `state`; dejar de aceptar tokens por intent arbitrary | `F8-A` | M |
| **P1** | `allowBackup=false` o `dataExtractionRules`/`fullBackupContent` excluyendo `app_webview/`, `files/receipts/` y estado cifrado | `NEW-06` | S |
| **P2** | Restringir `file_paths.xml` a `cache/exports/` y `files/receipts/`; eliminar `external-path` | `F8-B` | S |
| **P2** | `FLAG_SECURE` configurable + `setFilterTouchesWhenObscured(true)` | `F8-F` | S |
| **P2** | Eliminar `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`; revisar `SCHEDULE_EXACT_ALARM` | `F8-G` | S |
| **P2** | Configurar firma release por CI/secretos, documentar SHA-256 y Play App Signing; añadir `*.jks`/`*.keystore` a `.gitignore` | `F8-D` | M |
| **P3** | Añadir `google-services.json` por entorno y cablear `registerPushNotifications()` o retirar el plugin | `F8-E` | S |
| **P3** | Evaluar certificate pinning (`network_security_config`) si se justifica por el modelo de amenaza | `NETWORK-2` | M |
| **P3** | Añadir CSP nativa/`WebViewAssetLoader` y revisar `JavaScriptCanOpenWindowsAutomatically` | `PLATFORM-2`/`F7-A` | M |

---

## 9. Limitaciones

- **Solo estático (`N0`).** No se instaló el APK ni se probó el flujo OAuth en un dispositivo; `F8-A` se sustenta en el manifest, el handler y el default de auth-js, no en una captura de tráfico.
- **Backup:** no se ejecutó `adb backup` (restringido para `targetSdk 31+` no debuggeable) ni se inspeccionó una cuenta de Google con backup real. La inclusión de `app_webview/` y `files/` se deduce de las reglas por defecto de Auto Backup; debe confirmarse en un dispositivo de prueba before de cerrar `NEW-06`.
- **Artefacto:** el APK local es `app-release-unsigned.apk` de un build del `2026-10-11`; no se verificó que coincida bit a bit con el artifact publicado en Play.
- **Firma:** no se dispone del keystore ni del certificado de firma; no se pudo verificar el fingerprint de la app publicada.
- **Push:** no se probó FCM; la ausencia de `google-services.json` y de llamantes es evidencia estática suficiente para afirmar que la ruta no está operativa.
- **MASVS-RESILIENCE/PRIVACY:** se evalúan como `N/A`/parciales según el modelo de amenaza consumer; no constituyen una certificación MASVS formal.
