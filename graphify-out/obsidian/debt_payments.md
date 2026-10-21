---
source_file: "supabase/schema.sql"
type: "code"
community: "Build Configuration & Tooling Infrastructure"
location: "L117"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Build_Configuration__Tooling_Infrastructure
---

# debt_payments

## Connections
- [[accounts]] - `references` [EXTRACTED]
- [[auth]] - `references` [EXTRACTED]
- [[auth.users]] - `references` [EXTRACTED]
- [[debt_payments_safe]] - `reads_from` [EXTRACTED]
- [[debts]] - `references` [EXTRACTED]
- [[idx_debt_payments_debt_id]] - `indexes` [EXTRACTED]
- [[idx_debt_payments_user_id]] - `indexes` [EXTRACTED]
- [[schema.sql]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Build_Configuration__Tooling_Infrastructure