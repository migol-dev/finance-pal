---
trigger: always_on
description: Consult the graphify knowledge graph at graphify-out/, the .agent/ folder, and respect .agentignore for context.
---

## Context Protocol (Knowledge Graph & .agent Directory)

Whenever you (or any subagent) require context on how this application is structured, its architecture, components, database schema, or workflows:

1. **Access the Knowledge Graph (`graphify-out/`):**
   - For codebase or architecture questions, when `graphify-out/graph.json` exists, first run `graphify query "<question>"` (CLI) or `query_graph` (MCP).
   - Use `graphify path "<A>" "<B>"` / `shortest_path` for relationships and `graphify explain "<concept>"` / `get_node` for focused concepts.
   - If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw source files.
   - Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
   - After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost).

2. **Access the Agent Configuration & Architecture (`.agent/`):**
   - **Architecture:** Consult `.agent/rules/architecture.md` to understand the Local-First design, the `useFinanceData` facade, Zustand slices, React Query optimistic updates, and directory layouts.
   - **Contract & Roles:** Consult `.agent/contract.md` for development constraints and agent responsibilities.
   - **Task Specifications:** Consult `.agent/task.md` for active requirements, interfaces, and acceptance criteria.
   - **Security:** Consult `.agent/security_audit.md` when touching auth, session tokens, or encrypted local storage.

3. **Strictly Respect `.agentignore`:**
   - Always obey exclusions in `.agentignore` (never index, load, or modify `node_modules/`, `dist/`, `build/`, `.env*`, `coverage/`, `.git/`, logs, etc.).
