---
source_file: "supabase/schema.sql"
type: "code"
community: "Build Configuration & Tooling Infrastructure"
location: "L43"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Build_Configuration__Tooling_Infrastructure
---

# transactions

## Connections
- [[accounts]] - `references` [EXTRACTED]
- [[auth]] - `references` [EXTRACTED]
- [[auth.users]] - `references` [EXTRACTED]
- [[fixed_items]] - `references` [EXTRACTED]
- [[idx_transactions_date]] - `indexes` [EXTRACTED]
- [[idx_transactions_user_date]] - `indexes` [EXTRACTED]
- [[idx_transactions_user_id]] - `indexes` [EXTRACTED]
- [[schema.sql]] - `contains` [EXTRACTED]
- [[transactions_safe]] - `reads_from` [EXTRACTED]
- [[trg_validate_transactions]] - `triggers` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Build_Configuration__Tooling_Infrastructure