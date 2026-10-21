---
type: community
cohesion: 0.13
members: 35
---

# Build Configuration & Tooling Infrastructure

**Cohesion:** 0.13 - loosely connected
**Members:** 35 nodes

## Members
- [[accounts]] - code - supabase/schema.sql
- [[accounts_safe]] - code - supabase/schema.sql
- [[auth]] - code
- [[auth.users]] - code
- [[cleanup_stale_sessions()]] - code - supabase/schema.sql
- [[debt_payments]] - code - supabase/schema.sql
- [[debt_payments_safe]] - code - supabase/schema.sql
- [[debts]] - code - supabase/schema.sql
- [[fixed_items]] - code - supabase/schema.sql
- [[goal_folders]] - code - supabase/schema.sql
- [[goals]] - code - supabase/schema.sql
- [[idx_accounts_user_id]] - code - supabase/schema.sql
- [[idx_debt_payments_debt_id]] - code - supabase/schema.sql
- [[idx_debt_payments_user_id]] - code - supabase/schema.sql
- [[idx_debts_user_id]] - code - supabase/schema.sql
- [[idx_fixed_items_user_active]] - code - supabase/schema.sql
- [[idx_fixed_items_user_id]] - code - supabase/schema.sql
- [[idx_goal_folders_parent_id]] - code - supabase/schema.sql
- [[idx_goal_folders_user_id]] - code - supabase/schema.sql
- [[idx_goals_folder_id]] - code - supabase/schema.sql
- [[idx_goals_user_id]] - code - supabase/schema.sql
- [[idx_goals_user_pinned]] - code - supabase/schema.sql
- [[idx_transactions_date]] - code - supabase/schema.sql
- [[idx_transactions_user_date]] - code - supabase/schema.sql
- [[idx_transactions_user_id]] - code - supabase/schema.sql
- [[idx_user_sessions_user_id]] - code - supabase/schema.sql
- [[schema.sql]] - code - supabase/schema.sql
- [[transactions]] - code - supabase/schema.sql
- [[transactions_safe]] - code - supabase/schema.sql
- [[trg_validate_fixed_items]] - code - supabase/schema.sql
- [[trg_validate_transactions]] - code - supabase/schema.sql
- [[user_sessions]] - code - supabase/schema.sql
- [[user_settings]] - code - supabase/schema.sql
- [[validate_fixed_item_amount()]] - code - supabase/schema.sql
- [[validate_transaction_amount()]] - code - supabase/schema.sql

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Build_Configuration__Tooling_Infrastructure
SORT file.name ASC
```
