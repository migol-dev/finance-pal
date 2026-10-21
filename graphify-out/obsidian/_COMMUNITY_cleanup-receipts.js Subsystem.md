---
type: community
cohesion: 0.33
members: 6
---

# cleanup-receipts.js Subsystem

**Cohesion:** 0.33 - loosely connected
**Members:** 6 nodes

## Members
- [[Almacenamiento del JWT de Sesión]] - document - .agent/security_audit.md
- [[Análisis del Flujo de Autenticación]] - document - .agent/security_audit.md
- [[Área 4 Autenticación y Manejo de Tokens JWT]] - document - .agent/security_audit.md
- [[🟠 SEC-006 — ALTO Clave ANON de Supabase comprometida en `.env` local]] - document - .agent/security_audit.md
- [[🟡 SEC-008 — MEDIO Rate limiting del Login es Client-Side (bypasseable)]] - document - .agent/security_audit.md
- [[🟡 SEC-010 — MEDIO Takeover de sesión multi-dispositivo sin confirmación MFA]] - document - .agent/security_audit.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/cleanup-receiptsjs_Subsystem
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Autonomous Notification & Scheduling Engine_5]]
- 1 edge to [[_COMMUNITY_🔐 Auditoría de Seguridad y Privacidad — Finance Pal]]

## Top bridge nodes
- [[Área 4 Autenticación y Manejo de Tokens JWT]] - degree 6, connects to 2 communities