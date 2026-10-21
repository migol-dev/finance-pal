---
source_file: "supabase/schema.sql"
type: "code"
community: "Build Configuration & Tooling Infrastructure"
location: "L4"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Build_Configuration__Tooling_Infrastructure
---

# accounts

## Connections
- [[accounts_safe]] - `reads_from` [EXTRACTED]
- [[auth]] - `references` [EXTRACTED]
- [[auth.users]] - `references` [EXTRACTED]
- [[debt_payments]] - `references` [EXTRACTED]
- [[debts]] - `references` [EXTRACTED]
- [[fixed_items]] - `references` [EXTRACTED]
- [[idx_accounts_user_id]] - `indexes` [EXTRACTED]
- [[schema.sql]] - `contains` [EXTRACTED]
- [[transactions]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Build_Configuration__Tooling_Infrastructure