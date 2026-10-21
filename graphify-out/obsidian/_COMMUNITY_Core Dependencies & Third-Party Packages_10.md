---
type: community
cohesion: 0.40
members: 5
---

# Core Dependencies & Third-Party Packages

**Cohesion:** 0.40 - moderately connected
**Members:** 5 nodes

## Members
- [[SEC-003 — Asegurar la Edge Function send-reminders]] - document - .agent/security_audit.md
- [[SEC-004 — Restringir SECURITY DEFINER a llamadas autenticadas]] - document - .agent/security_audit.md
- [[SEC-005 — Añadir filtro `user_id` en operaciones de servicio]] - document - .agent/security_audit.md
- [[SEC-006 — Rotación de claves Supabase]] - document - .agent/security_audit.md
- [[🟠 PRIORIDAD 2 Altos (Semana 2)]] - document - .agent/security_audit.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Core_Dependencies__Third-Party_Packages
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Plan de Mitigación Accionable]]

## Top bridge nodes
- [[🟠 PRIORIDAD 2 Altos (Semana 2)]] - degree 5, connects to 1 community