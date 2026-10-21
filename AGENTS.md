# AGENTS.md

## Context and Knowledge Protocol (Mandatory for all Agents)

Whenever you (or any subagent) receive a request and require context about the application, its architecture, design patterns, components, database, or data flows, YOU MUST FOLLOW THIS SEQUENCE:

1. **Access the Knowledge Graph (`graphify-out/`):**
   - When `graphify-out/graph.json` exists, run `graphify query "<question>"` (CLI) or call `query_graph` (MCP) before your first grep, search, or broad file read.
   - Put this rule in every subagent prompt that explores code.
   - Use `graphify path "<A>" "<B>"` / `shortest_path` for relationships and `graphify explain "<concept>"` / `get_node` for focused concepts.
   - If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files.
   - Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review.
   - After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

2. **Access the Agent Specification & Architecture Folder (`.agent/`):**
   - **Architecture & Patterns:** Always consult `.agent/rules/architecture.md` for the Local-First design, the `useFinanceData` facade, Zustand local store, React Query optimistic updates, and Supabase service layer.
   - **Role & Contract:** Always consult `.agent/contract.md` to respect the system prompts and boundaries (Architect vs Builder).
   - **Current Task:** Always consult `.agent/task.md` for current specifications, acceptance criteria, and folder layouts.
   - **Security Guidelines:** Consult `.agent/security_audit.md` when touching auth, sessions, storage encryption, or database policies.

3. **Strictly Respect Ignored Paths (`.agentignore`):**
   - Always honor `.agentignore`. Never index, inspect, or modify ignored paths (including `node_modules/`, `dist/`, `build/`, `.env*`, `coverage/`, `.git/`, logs).

4. **Pull Requests & Rebuilds:**
   - A committed `graphify-out/graph.json` is rewritten whole on every build; a large diff to it in a pull request is expected. Do not flag it as churn or skip rebuilding.
