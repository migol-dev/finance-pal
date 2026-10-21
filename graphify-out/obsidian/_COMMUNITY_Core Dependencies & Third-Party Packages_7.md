---
type: community
cohesion: 0.29
members: 7
---

# Core Dependencies & Third-Party Packages

**Cohesion:** 0.29 - loosely connected
**Members:** 7 nodes

## Members
- [[Análisis del Audit Logger (IndexedDB)]] - document - .agent/security_audit.md
- [[Análisis del IndexedDB (Recibos)]] - document - .agent/security_audit.md
- [[SEC-015 — BAJO Email del perfil persistido en estado de Zustand]] - document - .agent/security_audit.md
- [[Área 3 Datos en Reposo — Cliente (Zustand  Storage)]] - document - .agent/security_audit.md
- [[🔴 SEC-001 — CRÍTICO Estado Zustand persistido en TEXTO PLANO en localStorage como almacenamiento PRIMARIO]] - document - .agent/security_audit.md
- [[🔴 SEC-002 — CRÍTICO La clave de cifrado AES-GCM se deriva de un secreto almacenado en texto plano en localStorage]] - document - .agent/security_audit.md
- [[🟡 SEC-009 — MEDIO Hash de audit log usa djb2 (hash de 32 bits, no criptográfico)]] - document - .agent/security_audit.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Core_Dependencies__Third-Party_Packages
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_🔐 Auditoría de Seguridad y Privacidad — Finance Pal]]

## Top bridge nodes
- [[Área 3 Datos en Reposo — Cliente (Zustand  Storage)]] - degree 7, connects to 1 community