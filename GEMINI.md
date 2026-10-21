# GEMINI.md

## Context and Knowledge Protocol (Mandatory for Antigravity & Gemini Agents)

Whenever you (or any subagent) require context about how the app works, its architecture, components, database, or data flows:

1. **Access the Knowledge Graph (`graphify-out/`):**
   - When `graphify-out/graph.json` exists, run `graphify query "<question>"` (CLI) or call `query_graph` (MCP) before your first grep, search, or source-file read. Put this rule in every subagent prompt that explores code.
   - Use `graphify path "<A>" "<B>"` / `shortest_path` for relationships and `graphify explain "<concept>"` / `get_node` for focused concepts.
   - If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files.
   - Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review.
   - After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

2. **Access the Agent Specification & Architecture Folder (`.agent/`):**
   - **Architecture:** Read `.agent/rules/architecture.md` to adhere to the Local-First architecture, the `useFinanceData` facade, Zustand store slices, React Query mutations/queries, and Supabase database services.
   - **Contract:** Read `.agent/contract.md` to maintain role separation and development constraints.
   - **Active Task:** Read `.agent/task.md` for current sprint specifications and acceptance criteria.
   - **Security:** Read `.agent/security_audit.md` before altering auth, encryption, or RLS policies.

3. **Strictly Respect Ignored Paths (`.agentignore`):**
   - Never search, load, or touch files and directories listed in `.agentignore` (such as `node_modules/`, `dist/`, `build/`, `.env*`, `coverage/`, `.git/`, logs).

4. **Pull Requests & Rebuilds:**
   - A committed `graphify-out/graph.json` is rewritten whole on every build; a large diff to it in a pull request is expected.
