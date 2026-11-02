# Política de Seguridad

FinancePal maneja información financiera personal: transacciones, balances, deudas, datos bancarios y comprobantes. Por eso tomamos en serio cualquier reporte de seguridad y agradecemos a quienes nos ayudan a proteger a los usuarios mediante una divulgación responsable.

---

## Versiones soportadas

Solo la línea de versiones más reciente recibe parches de seguridad.

| Versión  | Soporte de seguridad |
| -------- | -------------------- |
| 2.0.x    | ✅ Soportada          |
| < 2.0    | ❌ Sin soporte        |

Si usas una versión anterior, actualiza a la última [release](https://github.com/migol-dev/finance-pal/releases) antes de reportar un problema. Puede que ya esté corregido.

---

## Cómo reportar una vulnerabilidad

> [!IMPORTANT]
> **No abras un _issue_ público, un _pull request_ ni una discusión** para reportar una vulnerabilidad. Hacerlo expone a los usuarios antes de que exista una corrección.

Usa el reporte privado de vulnerabilidades de GitHub:

1. Ve a la pestaña **[Security → Advisories](https://github.com/migol-dev/finance-pal/security/advisories/new)** del repositorio.
2. Haz clic en **"Report a vulnerability"**.
3. Completa el formulario con la mayor cantidad de detalle posible.

### Qué incluir en el reporte

- **Descripción** del problema y su impacto potencial (qué datos o acciones quedan expuestos).
- **Componente afectado**: app web, app Android (Capacitor), base de datos/RLS, Edge Functions, almacenamiento, autenticación, sincronización, etc.
- **Versión** de FinancePal y plataforma (navegador / versión de Android).
- **Pasos para reproducir**, idealmente con una prueba de concepto mínima.
- **Severidad estimada** (por ejemplo, con [CVSS v3.1](https://www.first.org/cvss/calculator/3.1)), si la tienes.
- Cualquier **mitigación** o corrección sugerida.

Los reportes pueden escribirse en **español o inglés**.

---

## Qué puedes esperar

| Etapa                          | Plazo objetivo                  |
| ------------------------------ | ------------------------------- |
| Acuse de recibo                | 72 horas                        |
| Evaluación inicial y severidad | 7 días                          |
| Corrección (críticas / altas)  | 30 días                         |
| Corrección (medias / bajas)    | 90 días                         |

FinancePal es un proyecto mantenido de forma independiente, así que estos plazos son objetivos y no garantías. Te mantendremos informado del progreso durante todo el proceso.

Una vez publicada la corrección:

- Se publicará un **GitHub Security Advisory** y, si corresponde, se solicitará un CVE.
- Se te dará **crédito** en el advisory y en el [CHANGELOG](CHANGELOG.md), salvo que prefieras permanecer anónimo.

---

## Alcance

### Dentro del alcance

- Código fuente de este repositorio (aplicación React/TypeScript).
- App Android construida con Capacitor a partir de este repositorio.
- La instancia web oficial: `https://financepal-web.vercel.app`.
- Esquema de base de datos, políticas RLS, migraciones y Edge Functions incluidas en `supabase/`.
- Problemas como:
  - Acceso a datos de otros usuarios (IDOR, fallos de RLS).
  - Evasión de autenticación, MFA o gestión de sesiones.
  - Exposición de datos financieros en texto plano o fallos en el cifrado local.
  - XSS, inyección o evasión de la Content Security Policy.
  - Filtración de secretos o credenciales.
  - Acceso no autorizado a comprobantes almacenados.

### Fuera del alcance

- Vulnerabilidades en servicios de terceros (Supabase, Vercel, Google Play, etc.). Repórtalas directamente al proveedor.
- Ataques que requieren acceso físico a un dispositivo desbloqueado, _root_ o _jailbreak_.
- Ingeniería social, _phishing_ o ataques contra mantenedores o usuarios.
- Ataques de denegación de servicio (DoS/DDoS) o pruebas de carga.
- Reportes generados únicamente por escáneres automáticos sin una prueba de impacto real.
- Ausencia de cabeceras o buenas prácticas sin un vector de explotación demostrable.
- Vulnerabilidades en dependencias que ya tienen un aviso público y para las que Dependabot ya abrió una actualización.
- Instancias autoalojadas (forks) con configuraciones modificadas.

---

## Reglas de puerto seguro (Safe Harbor)

Consideramos autorizada y de buena fe toda investigación que:

- Use **solo cuentas propias** o cuentas de prueba creadas para ese fin.
- **No acceda, modifique ni elimine datos de otros usuarios.** Si accedes a datos ajenos por accidente, detente, no los conserves y avísanos en el reporte.
- No degrade el servicio ni afecte la experiencia de otros usuarios.
- No use técnicas de DoS, spam ni ingeniería social.
- Mantenga la confidencialidad del hallazgo hasta que se publique una corrección o hasta un máximo de **90 días** desde el reporte, lo que ocurra primero (o el plazo que acordemos juntos).

Mientras cumplas estas reglas, no emprenderemos acciones legales en tu contra por tu investigación.

> [!NOTE]
> Actualmente FinancePal **no ofrece recompensas económicas** (_bug bounty_). El reconocimiento público se da en los advisories y en el changelog.

---

## Controles de seguridad existentes

Para dar contexto a los investigadores, estas son las principales medidas de seguridad del proyecto:

- **Arquitectura local-first**: los datos viven en el dispositivo y la sincronización en la nube es opcional.
- **Cifrado en cliente** con AES-GCM (Web Crypto API) para el almacenamiento local.
- **Row Level Security (RLS)** en todas las tablas de usuario en Supabase (PostgreSQL).
- **Autenticación multifactor (TOTP)** y control de sesiones por dispositivo.
- **Content Security Policy** y Subresource Integrity (SRI) en recursos externos.
- **Validación de entradas** con esquemas Zod.
- **Verificación de contraseñas comprometidas** (Have I Been Pwned, k-anonymity).
- **URLs firmadas** de corta duración para comprobantes almacenados.
- **Escaneo de secretos** con gitleaks y actualizaciones automáticas de dependencias con Dependabot.

---

## Buenas prácticas para usuarios

- Mantén la app actualizada a la última versión.
- Activa la **autenticación de dos factores** en *Ajustes → Seguridad*.
- Usa una contraseña única y robusta.
- Cierra sesión en dispositivos compartidos y revisa periódicamente tus sesiones activas.
- Descarga la app solo desde fuentes oficiales (releases de este repositorio o la instancia web oficial).

---

Gracias por ayudar a mantener FinancePal seguro. 🔐
