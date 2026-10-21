---
source_file: "supabase/schema_push_notifications.sql"
type: "code"
community: "dependabot-auto-merge.yml Subsystem"
location: "L7"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/dependabot-auto-mergeyml_Subsystem
---

# public.push_subscriptions

## Connections
- [[auth.users_1]] - `references` [EXTRACTED]
- [[idx_push_subs_endpoint]] - `indexes` [EXTRACTED]
- [[idx_push_subs_user_id]] - `indexes` [EXTRACTED]
- [[schema_push_notifications.sql]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/dependabot-auto-mergeyml_Subsystem