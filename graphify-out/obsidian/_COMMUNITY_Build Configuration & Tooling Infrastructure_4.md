---
type: community
cohesion: 0.40
members: 5
---

# Build Configuration & Tooling Infrastructure

**Cohesion:** 0.40 - moderately connected
**Members:** 5 nodes

## Members
- [[SEC-007 — URLs firmadas para recibos]] - document - .agent/security_audit.md
- [[SEC-009 — Reemplazar djb2 por SHA-256 en audit logger]] - document - .agent/security_audit.md
- [[SEC-011 — Corregir columnas `deleted_at` faltantes en esquema]] - document - .agent/security_audit.md
- [[SEC-012 — Restringir validación de localhost a paths y puertos conocidos]] - document - .agent/security_audit.md
- [[🟡 PRIORIDAD 3 Medios (Semana 3-4)]] - document - .agent/security_audit.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Build_Configuration__Tooling_Infrastructure
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Plan de Mitigación Accionable]]

## Top bridge nodes
- [[🟡 PRIORIDAD 3 Medios (Semana 3-4)]] - degree 5, connects to 1 community