---
type: community
cohesion: 0.40
members: 5
---

# Core Dependencies & Third-Party Packages

**Cohesion:** 0.40 - moderately connected
**Members:** 5 nodes

## Members
- [[Análisis del Schema SQL]] - document - .agent/security_audit.md
- [[Tablas y Estado de RLS]] - document - .agent/security_audit.md
- [[Área 2 Datos en Reposo — Servidor (RLS y DB)]] - document - .agent/security_audit.md
- [[🔴 SEC-004 — ALTO Función `SECURITY DEFINER` sin restricción de invocador]] - document - .agent/security_audit.md
- [[🔴 SEC-011 — MEDIO Condición `deleted_at IS NULL` en políticas de tablas sin esa columna]] - document - .agent/security_audit.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Core_Dependencies__Third-Party_Packages
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_AppError]]
- 1 edge to [[_COMMUNITY_🔐 Auditoría de Seguridad y Privacidad — Finance Pal]]

## Top bridge nodes
- [[Área 2 Datos en Reposo — Servidor (RLS y DB)]] - degree 5, connects to 2 communities