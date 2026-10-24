# Graph Report - finance-pal  (2026-10-21)

## Corpus Check
- 268 files · ~475,012 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 33 file(s) not represented in the graph (top: .xml 14, (none) 6, .toml 4)

## Summary
- 1901 nodes · 5300 edges · 131 communities (79 shown, 52 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 75 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `52a47e0e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useFinanceData
- finance-store.ts
- Autonomous Notification & Scheduling Engine
- Core Dependencies & Third-Party Packages
- schema-migrations.ts
- Autonomous Notification & Scheduling Engine
- useFinance
- class-variance-authority
- Cloud Sync & Offline State Engine
- Navigation Shell & Responsive Drawers
- Savings Goals & Folder Organization
- Build Configuration & Tooling Infrastructure
- encrypted-storage.ts
- Brand Identity & Accent Palettes
- Interactive Toast Notification System
- Autonomous Notification & Scheduling Engine
- utils.ts
- supabase.ts
- GoalDetailContent.tsx
- Brand Identity & Accent Palettes
- Debt Management & Loan Tracking
- Navigation Shell & Responsive Drawers
- Autonomous Notification & Scheduling Engine
- Login.tsx
- Build Configuration & Tooling Infrastructure
- Supabase Authentication & Security Context
- version-check.ts
- finance.ts
- MainActivity
- Savings Goals & Folder Organization
- Core Dependencies & Third-Party Packages
- Schema Validation & Domain Rules
- App Version Check & Update Toast
- Session Lifecycle & Device Management
- Savings Goals & Folder Organization
- app-error.ts
- Build Configuration & Tooling Infrastructure
- chart.tsx
- BrandLogo.tsx
- Core Dependencies & Third-Party Packages
- mfa-auth.test.ts
- accounts.service.ts
- ref_path
- Core Dependencies & Third-Party Packages
- useFinanceData.ts
- Android Native Integration & Build Pipeline
- App Version Check & Update Toast
- 12.6 Hallazgos nuevos materiales (`F2`–`F10`)
- Build Configuration & Tooling Infrastructure
- Core Dependencies & Third-Party Packages
- 🛠️ Registro de Ejecución y Checkpoints: OpenCode CLI (`02_OPENCODE_TASKS.md`)
- architecture.md
- scroll-area.tsx
- scroll-area.tsx
- 📐 Arquitectura & Plan Maestro: [PENDIENTE DE ASIGNAR TAREA]
- Command Palette & Search Quick Actions
- Directivas Principales
- 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI (`03_ANTIGRAVITY_REVIEW.md`)
- Directivas Principales
- Command Palette & Search Quick Actions
- transactions.service.ts
- AGENTS.md
- rateLimiter
- Context and Knowledge Protocol (Mandatory for Antigravity & Gemini Agents)
- 📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA]
- Build Configuration & Tooling Infrastructure
- dependabot.yml Subsystem
- Build Configuration & Tooling Infrastructure
- ci.yml Subsystem
- dependabot-auto-merge.yml Subsystem
- index.html Subsystem
- PENTEST_CHECKLIST.md Subsystem
- robots.txt Subsystem
- @capacitor/core
- 📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA]
- 🧭 Re-auditoría Integral v2 — 2026-10 — Finance Pal v1.19.38
- 📜 Protocolo Operativo Multi-Agente: Antigravity ↔ OpenCode
- 🛠️ Registro de Ejecución y Checkpoints: OpenCode CLI
- sheet.tsx
- ⚡ Guía Paso a Paso: Ciclo Completo de una Tarea
- 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI
- 🔐 Auditoría de Seguridad y Privacidad — Finance Pal
- Plan de Mitigación Accionable
- ZAP Scanning Report
- 🛡️ Auditoría Integral de Seguridad y Privacidad — Finance Pal v1.21.0
- worktree-manager.sh
- SyncIndicator.tsx
- 2. `F3.2` — OAuth, PKCE, redirects y callback (`T10`, `SEC-012`)
- 🧪 Evidencia F0 — Preparación, Estructura y Verificación de Entorno
- 🤖 Prompt de Sistema / Rol: OpenCode Constructor & Ejecutor (Fase 2)
- 🤖 Prompt de Sistema / Rol: Antigravity Revisor, Auditor Lead y Finalizador (Fase 3)
- Área 6: Seguridad de la Plataforma y Configuración
- Reference
- Tablero de Ejecución de Tareas — OpenCode CLI (`02_OPENCODE_TASKS.md`)
- MigracionNube.tsx
- [ Cross-Origin-Opener-Policy Header Missing or Invalid ](https://www.zaproxy.org/docs/alerts/90004/)
- vitest

## God Nodes (most connected - your core abstractions)
1. `cn()` - 253 edges
2. `react` - 100 edges
3. `useFinance` - 83 edges
4. `useFinanceData()` - 64 edges
5. `Button` - 63 edges
6. `AppError` - 62 edges
7. `lucide-react` - 60 edges
8. `Label` - 35 edges
9. `useAuth()` - 33 edges
10. `vitest` - 32 edges

## Surprising Connections (you probably didn't know these)
- `12.1 Dictamen ejecutivo` --references--> `MainActivity`  [INFERRED]
  .agent/security_audit.md → android/app/src/main/java/app/financepal/com/MainActivity.java
- `2. Alineación Arquitectónica (Finance Pal Local-First)` --references--> `useFinanceData()`  [INFERRED]
  .agent/workflow/01_ARCHITECT_PLAN.md → src/hooks/useFinanceData.ts
- `6. Verificación de Criterios de Aceptación (Sign-off)` --references--> `useFinanceData()`  [INFERRED]
  .agent/workflow/03_ANTIGRAVITY_REVIEW.md → src/hooks/useFinanceData.ts
- `Directivas Principales` --references--> `useFinanceData()`  [INFERRED]
  .agent/workflow/prompts/01_antigravity_architect.prompt.md → src/hooks/useFinanceData.ts
- `Directivas Principales` --references--> `useFinanceData()`  [INFERRED]
  .agent/workflow/prompts/02_opencode_builder.prompt.md → src/hooks/useFinanceData.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Local-First Architecture Triad (Zustand + React Query + Facade)** — agent_rules_architecture_local_first_architecture, agent_rules_architecture_state_synchronization_facade, src_hooks_usefinancedata_usefinancedata, src_store_finance_store_usefinance [EXTRACTED 1.00]
- **Continuous Security and Quality Assurance Gate** — pentest_checklist_pentest_security_scope, github_workflows_ci_ci_build_and_test_pipeline, changelog_notification_scheduler_engine [INFERRED 0.85]

## Communities (131 total, 52 thin omitted)

### Community 0 - "useFinanceData"
Cohesion: 0.06
Nodes (122): State Synchronization Facade, Autonomous Notification Scheduler Engine, Finance Pal Core Product Spec, lucide-react, react, react-easy-crop, sonner, AccessibilitySettings (+114 more)

### Community 1 - "finance-store.ts"
Cohesion: 0.16
Nodes (26): zustand, deleteReceipt(), restoreReceiptsFromIndexedDB(), Account, diffFields(), generateSecureId(), logEntry(), SCHEMA_VERSION (+18 more)

### Community 2 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.03
Nodes (68): dependencies, @capacitor/app, @capacitor/browser, @capacitor/core, @capacitor/filesystem, @capacitor/local-notifications, @capacitor/network, @capacitor/push-notifications (+60 more)

### Community 3 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.05
Nodes (57): @radix-ui/react-accordion, @radix-ui/react-avatar, @radix-ui/react-context-menu, @radix-ui/react-menubar, @radix-ui/react-radio-group, @radix-ui/react-slot, react-resizable-panels, StatPill (+49 more)

### Community 4 - "schema-migrations.ts"
Cohesion: 0.25
Nodes (9): Currency, DEFAULT_NOTIFICATION_PREFS, CURRENT_SCHEMA_VERSION, getDefaultAppSettings(), mergeLocalCloudData(), MigrationContext, MigrationResult, migrations (+1 more)

### Community 5 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.05
Nodes (43): config, name, private, type, version, autoprefixer, @capacitor/android, @capacitor/cli (+35 more)

### Community 6 - "useFinance"
Cohesion: 0.33
Nodes (21): inSet(), isBool(), isNum(), isObj(), isStr(), isValidUUID(), migrateImported(), REPEAT_FREQS (+13 more)

### Community 7 - "class-variance-authority"
Cohesion: 0.14
Nodes (18): getDeviceId(), getDeviceName(), SessionState, useSessionManager(), abortControllers, ALLOWED_TABLES, getUserLock(), processingLocks (+10 more)

### Community 8 - "Cloud Sync & Offline State Engine"
Cohesion: 0.12
Nodes (27): @tanstack/query-async-storage-persister, @tanstack/react-query-persist-client, Ajustes, AnimatedRoutes(), Anual, App(), AuthCallback, AuthGuard() (+19 more)

### Community 9 - "Navigation Shell & Responsive Drawers"
Cohesion: 0.07
Nodes (31): @radix-ui/react-separator, @radix-ui/react-tooltip, Separator, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction (+23 more)

### Community 10 - "Savings Goals & Folder Organization"
Cohesion: 0.11
Nodes (24): @radix-ui/react-dropdown-menu, vaul, Drawer(), DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay (+16 more)

### Community 11 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.06
Nodes (33): devDependencies, autoprefixer, @capacitor/android, @capacitor/cli, cross-env, cssnano, eslint, @eslint/js (+25 more)

### Community 12 - "encrypted-storage.ts"
Cohesion: 0.08
Nodes (51): 12.4 Hallazgos previos (`SEC-001`–`SEC-021`), ALL_ENCRYPTED_STATE_KEYS, base64ToBytes(), bytesToBase64(), clearAllReceipts(), clearDevicePeppers(), clearEncryptedState(), clearKeyCache() (+43 more)

### Community 13 - "Brand Identity & Accent Palettes"
Cohesion: 0.16
Nodes (16): @capacitor/app, react-router-dom, applyAccentVars(), AppShell(), SWIPE_ROUTES, BottomNav, DesktopSidebar, NavItem (+8 more)

### Community 14 - "Interactive Toast Notification System"
Cohesion: 0.12
Nodes (25): @radix-ui/react-toast, Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle (+17 more)

### Community 15 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.07
Nodes (29): zod, accountSchema, accountTypeSchema, changeActionSchema, changeEntitySchema, changeLogEntrySchema, currencySchema, debtPaymentSchema (+21 more)

### Community 16 - "utils.ts"
Cohesion: 0.08
Nodes (19): clsx, input-otp, @radix-ui/react-hover-card, @radix-ui/react-popover, @radix-ui/react-tabs, tailwind-merge, NavLink, NavLinkCompatProps (+11 more)

### Community 17 - "supabase.ts"
Cohesion: 0.17
Nodes (21): @supabase/supabase-js, @tanstack/react-query, Props, AuthContext, AuthContextType, useAuth(), useAccountsQuery(), useDebtsQuery() (+13 more)

### Community 18 - "GoalDetailContent.tsx"
Cohesion: 0.05
Nodes (96): @capacitor/local-notifications, @capacitor/push-notifications, isRecentlyDismissed(), NotificationPermissionPrompt(), PILL_TAB_ACTIVE, PILL_TAB_BASE, PILL_TAB_INACTIVE, PILL_TABS_CONTAINER (+88 more)

### Community 19 - "Brand Identity & Accent Palettes"
Cohesion: 0.10
Nodes (22): @radix-ui/react-alert-dialog, react-day-picker, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader() (+14 more)

### Community 20 - "Debt Management & Loan Tracking"
Cohesion: 0.17
Nodes (22): AddDebtPaymentInput, DebtMutations, isOffline(), RemoveDebtPaymentInput, useDebtMutations(), Debt, DebtPayment, DebtInsertPayload (+14 more)

### Community 21 - "Navigation Shell & Responsive Drawers"
Cohesion: 0.18
Nodes (11): cmdk, Command, CommandDialog(), CommandDialogProps, CommandEmpty, CommandGroup, CommandInput, CommandItem (+3 more)

### Community 22 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.18
Nodes (24): Vistas de Seguridad (Column-Level Security), CloudSyncMutations, useCloudSyncMutations(), NotificationPreferences, ThemeMode, UserProfile, fetchAccounts(), mapAccountFromDb() (+16 more)

### Community 23 - "Login.tsx"
Cohesion: 0.12
Nodes (26): Resumen de Hallazgos por Severidad, 🟡 SEC-012 — MEDIO: `isValidRedirectUri` permite cualquier `localhost`, @capacitor/browser, @radix-ui/react-progress, Progress, checkHibpPwnedPassword(), createRateLimitedFunction(), getClientIdentifier() (+18 more)

### Community 24 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 25 - "Supabase Authentication & Security Context"
Cohesion: 0.14
Nodes (15): class-variance-authority, @radix-ui/react-toggle, @radix-ui/react-toggle-group, Alert, AlertDescription, AlertTitle, alertVariants, Badge() (+7 more)

### Community 26 - "version-check.ts"
Cohesion: 0.20
Nodes (15): UpdateNotification(), check(), UpdateNotificationProps, useUpdateToast(), check(), checkForUpdates(), compareVersions(), dismissVersion() (+7 more)

### Community 27 - "finance.ts"
Cohesion: 0.14
Nodes (19): AccentColor, AccessibilitySettings, AccountType, AppSettings, buildScheduledTxId(), ChangeAction, ChangeEntity, ChangeLogEntry (+11 more)

### Community 29 - "Savings Goals & Folder Organization"
Cohesion: 0.20
Nodes (17): GoalFolderMutations, isOffline(), useGoalFolderMutations(), GoalFolder, GoalFormProps, deleteGoalFolder(), fetchGoalFolders(), GoalFolderInsertPayload (+9 more)

### Community 30 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.11
Nodes (18): scripts, analyze, android:build:release, android:build:release:win, android:copy, browserslist:update-db, build, build:dev (+10 more)

### Community 31 - "Schema Validation & Domain Rules"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 32 - "App Version Check & Update Toast"
Cohesion: 0.24
Nodes (15): FixedItemMutations, isOffline(), useFixedItemMutations(), FixedItem, deleteFixedItem(), fetchFixedItems(), FixedItemInsertPayload, FixedItemRow (+7 more)

### Community 33 - "Session Lifecycle & Device Management"
Cohesion: 0.18
Nodes (11): corsHeaders, daysBetween(), DEFAULT_PREFS, getNextFixedDueDates(), isDateInQuietHours(), isFixedActiveInMonth(), parseDateSafe(), parseTimeHHMM() (+3 more)

### Community 34 - "Savings Goals & Folder Organization"
Cohesion: 0.18
Nodes (18): ContributeToGoalInput, GoalMutations, isOffline(), useGoalMutations(), Goal, FolderChipsProps, GoalCompactCardProps, addGoalContribution() (+10 more)

### Community 35 - "app-error.ts"
Cohesion: 0.20
Nodes (8): ErrorCode, errorFromUnknown(), ErrorSeverity, LogEntry, logger, LogLevel, logs, showUserError()

### Community 36 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 37 - "chart.tsx"
Cohesion: 0.18
Nodes (12): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+4 more)

### Community 38 - "BrandLogo.tsx"
Cohesion: 0.47
Nodes (4): BrandLogo, BrandLogoProps, SIZE_MAP, NotFound()

### Community 39 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.17
Nodes (14): embla-carousel-react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+6 more)

### Community 41 - "accounts.service.ts"
Cohesion: 0.22
Nodes (17): 12.10 Certificación del Sprint de Remediación P0 (`v1.21.1-p0-remediation` — 2026-10-20), AuthProvider(), audit, AuditAction, AuditEntry, clearAuditLogs(), computeHash(), GENESIS_HASH (+9 more)

### Community 42 - "ref_path"
Cohesion: 0.07
Nodes (27): lovable-tagger, rollup-plugin-visualizer, sharp, vite, @vitejs/plugin-react-swc, exists(), main(), path (+19 more)

### Community 43 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.19
Nodes (12): @radix-ui/react-label, react-hook-form, FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext (+4 more)

### Community 44 - "useFinanceData.ts"
Cohesion: 0.26
Nodes (11): DeleteReceiptForTransactionInput, ReceiptMutations, UploadReceiptForTransactionInput, useReceiptMutations(), AppError, dataUrlToBlob(), deleteReceipt(), getReceiptSignedUrl() (+3 more)

### Community 46 - "App Version Check & Update Toast"
Cohesion: 0.25
Nodes (12): AccountMutations, isOffline(), useAccountMutations(), supabase, AccountInsertPayload, AccountRow, AccountUpdatePayload, deleteAccount() (+4 more)

### Community 47 - "12.6 Hallazgos nuevos materiales (`F2`–`F10`)"
Cohesion: 0.50
Nodes (3): 12.6 Hallazgos nuevos materiales (`F2`–`F10`), exportAuditLogs(), queryAuditLogs()

### Community 48 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

### Community 49 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.28
Nodes (8): @radix-ui/react-navigation-menu, NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 50 - "🛠️ Registro de Ejecución y Checkpoints: OpenCode CLI (`02_OPENCODE_TASKS.md`)"
Cohesion: 0.29
Nodes (6): 1. Panel de Control de Progreso (Progress Dashboard), 2. Lista de Tareas Detallada y Estado de Ejecución, 3. ⚠️ Registro de Bloqueos, Fallos y Dificultades (Escalation Log), 4. Registro Histórico de Checkpoints (Commits), 5. Resumen de Entrega para Antigravity Reviewer, 🛠️ Registro de Ejecución y Checkpoints: OpenCode CLI (`02_OPENCODE_TASKS.md`)

### Community 51 - "architecture.md"
Cohesion: 0.40
Nodes (3): Antigravity Architect Role Contract, Local-First Architecture Pattern, Virtual Debt Transactions Engine

### Community 52 - "scroll-area.tsx"
Cohesion: 0.67
Nodes (3): @radix-ui/react-scroll-area, ScrollArea, ScrollBar

### Community 53 - "scroll-area.tsx"
Cohesion: 0.20
Nodes (19): accounts, debt_payments, debts, fixed_items, goal_folders, goals, idx_fixed_items_user_active, idx_goal_folders_parent_id (+11 more)

### Community 54 - "📐 Arquitectura & Plan Maestro: [PENDIENTE DE ASIGNAR TAREA]"
Cohesion: 0.22
Nodes (8): 1. Resumen Ejecutivo y Objetivos, 2. Alineación Arquitectónica (Finance Pal Local-First), 3. Mapa de Archivos e Impacto, 4. Tipos, Interfaces y Contratos de Datos, 5. Plan de Ejecución Secuencial para OpenCode CLI (DeepSeek 4.1 Flash), 6. Criterios de Aceptación y Checklist de Calidad, 📐 Arquitectura & Plan Maestro: [PENDIENTE DE ASIGNAR TAREA], Fase F0: Preparación

### Community 55 - "Command Palette & Search Quick Actions"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, installCommand, outputDirectory, rewrites

### Community 57 - "🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI (`03_ANTIGRAVITY_REVIEW.md`)"
Cohesion: 0.22
Nodes (8): 1. Panel de Control de la Revisión, 2. 🔍 Cosas que se están revisando actualmente (In Progress), 3. ✅ Cosas que ya se revisaron (Audited & Closed), 4. ⏳ Cosas que se van a revisar (Backlog de Revisión), 5. 🛠️ Tareas y Lógica Completadas por Antigravity (Escalaciones Resueltas), 6. Verificación de Criterios de Aceptación (Sign-off), 7. Dictamen Final y Recomendación de Fusión (Merge), 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI (`03_ANTIGRAVITY_REVIEW.md`)

### Community 61 - "transactions.service.ts"
Cohesion: 0.17
Nodes (16): @capacitor/filesystem, isOffline(), TransactionMutations, useTransactionMutations(), Transaction, deleteTransaction(), insertTransaction(), toInsertPayload() (+8 more)

### Community 65 - "📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA]"
Cohesion: 0.06
Nodes (17): @testing-library/jest-dom, cloneValue(), compareKeys(), FakeCursor, FakeDatabase, FakeIDBFactory, FakeIDBKeyRange, FakeIndex (+9 more)

### Community 104 - "@capacitor/core"
Cohesion: 0.18
Nodes (8): @capacitor/core, next-themes, react-dom, web-vitals, Toaster(), ToasterProps, initWebVitals(), send()

### Community 105 - "📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA]"
Cohesion: 0.15
Nodes (12): 1. Resumen Ejecutivo y Objetivos, 2. Alineación Arquitectónica (Finance Pal Local-First), 3. Mapa de Archivos e Impacto, 4. Tipos, Interfaces y Contratos de Datos, 5. Plan de Ejecución Secuencial para OpenCode CLI (DeepSeek 4.1 Flash), 6. Criterios de Aceptación y Checklist de Calidad, 7. Protocolo de Traspaso a OpenCode, 📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA] (+4 more)

### Community 107 - "🧭 Re-auditoría Integral v2 — 2026-10 — Finance Pal v1.19.38"
Cohesion: 0.17
Nodes (11): 12.10 Estado de producción y desfase de esquema, 12.1 Dictamen ejecutivo, 12.2 Cobertura ejecutada, 12.3.1 Ítems planificados (`SEC-*` + `NEW-*`), 12.3.2 Hallazgos nuevos materiales (`F2`–`F10`), 12.3 Resumen de hallazgos, 12.5 Hipótesis nuevas (`NEW-01`–`NEW-12`), 12.7 Matriz de pruebas (`T01`–`T25`) (+3 more)

### Community 108 - "📜 Protocolo Operativo Multi-Agente: Antigravity ↔ OpenCode"
Cohesion: 0.17
Nodes (11): 1. Declaración de Agentes y Modelos Autorizados, 2. Máquina de Estados del Ciclo de Vida, 3. Especificación de Fases y Archivos de Registro, 4. Estrategia de Git Worktree (Aislamiento de Entorno), 5. Reglas Invariables de Seguridad y Arquitectura, Comandos de Gestión:, Esquema de Directorios:, Fase 1: Planificación Arquitectónica (+3 more)

### Community 109 - "🛠️ Registro de Ejecución y Checkpoints: OpenCode CLI"
Cohesion: 0.18
Nodes (10): 1. Panel de Control de Progreso (Progress Dashboard), 2. Lista de Tareas Detallada y Estado de Ejecución, 3. ⚠️ Registro de Bloqueos, Fallos y Dificultades (Escalation Log), 4. Registro Histórico de Checkpoints (Commits), 5. Resumen de Entrega para Antigravity Reviewer, Fase A: Tipado y Modelado de Datos, Fase B: Capa de Servicios y Estado, Fase C: Componentes UI (+2 more)

### Community 110 - "sheet.tsx"
Cohesion: 0.22
Nodes (10): @radix-ui/react-dialog, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle (+2 more)

### Community 114 - "⚡ Guía Paso a Paso: Ciclo Completo de una Tarea"
Cohesion: 0.15
Nodes (8): 🛠️ Comandos Rápidos, 📁 Estructura del Directorio `.agent/workflow/`, 🔄 Flujo de Trabajo Colaborativo: Antigravity ↔ OpenCode, ⚡ Guía Paso a Paso: Ciclo Completo de una Tarea, Paso 1: Planificación (Antigravity CLI — Gemini 3.8 Flash / Argon 4), Paso 2: Configuración del Worktree & Construcción (OpenCode CLI — DeepSeek 4.1 Flash), Paso 3: Revisión y Cierre (Antigravity CLI — Gemini 3.8 Flash / Argon 4), Paso 4: Limpieza y Merge

### Community 115 - "🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI"
Cohesion: 0.22
Nodes (8): 1. Panel de Control de la Revisión, 2. 🔍 Cosas que se están revisando actualmente (In Progress), 3. ✅ Cosas que ya se revisaron (Audited & Closed), 4. ⏳ Cosas que se van a revisar (Backlog de Revisión), 5. 🛠️ Tareas y Lógica Completadas por Antigravity (Lo que quedó pendiente), 6. Verificación de Criterios de Aceptación (Sign-off), 7. Dictamen Final y Recomendación de Fusión (Merge), 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI

### Community 119 - "🔐 Auditoría de Seguridad y Privacidad — Finance Pal"
Cohesion: 0.29
Nodes (7): Análisis del Cliente Supabase, 🔐 Auditoría de Seguridad y Privacidad — Finance Pal, Controles de Seguridad Positivos Detectados, Matriz de Riesgo Residual, Resumen Ejecutivo, Tabla de Contenidos, Área 1: Datos en Tránsito

### Community 120 - "Plan de Mitigación Accionable"
Cohesion: 0.25
Nodes (8): Plan de Mitigación Accionable, 🔴 PRIORIDAD 1: Críticos (Semana 1), 🟢 PRIORIDAD 4: Bajos (Backlog), SEC-001 — Inmediato: Borrar texto plano de localStorage existente, SEC-001 y SEC-002 — Rediseño del modelo de persistencia cifrada, SEC-014 — Añadir headers COOP/COEP al netlify.toml, SEC-015 — Excluir email del estado persistido, SEC-018 — Límite de tamaño en importación JSON

### Community 121 - "ZAP Scanning Report"
Cohesion: 0.46
Nodes (7): cmd_create(), cmd_list(), cmd_remove(), cmd_status(), cmd_sync(), worktree-manager.sh script, show_help()

### Community 123 - "🛡️ Auditoría Integral de Seguridad y Privacidad — Finance Pal v1.21.0"
Cohesion: 0.33
Nodes (6): Almacenamiento del JWT de Sesión, Análisis del Flujo de Autenticación, 🟠 SEC-006 — ALTO: Clave ANON de Supabase comprometida en `.env` local, 🟡 SEC-008 — MEDIO: Rate limiting del Login es Client-Side (bypasseable), 🟡 SEC-010 — MEDIO: Takeover de sesión multi-dispositivo sin confirmación MFA, Área 4: Autenticación y Manejo de Tokens JWT

### Community 127 - "worktree-manager.sh"
Cohesion: 0.29
Nodes (7): Análisis del Audit Logger (IndexedDB), Análisis del IndexedDB (Recibos), 🔴 SEC-001 — CRÍTICO: Estado Zustand persistido en TEXTO PLANO en localStorage como almacenamiento PRIMARIO, 🔴 SEC-002 — CRÍTICO: La clave de cifrado AES-GCM se deriva de un secreto almacenado en texto plano en localStorage, 🟡 SEC-009 — MEDIO: Hash de audit log usa djb2 (hash de 32 bits, no criptográfico), SEC-015 — BAJO: Email del perfil persistido en estado de Zustand, Área 3: Datos en Reposo — Cliente (Zustand / Storage)

### Community 128 - "SyncIndicator.tsx"
Cohesion: 0.40
Nodes (5): Análisis del Schema SQL, 🔴 SEC-004 — ALTO: Función `SECURITY DEFINER` sin restricción de invocador, 🔴 SEC-011 — MEDIO: Condición `deleted_at IS NULL` en políticas de tablas sin esa columna, Tablas y Estado de RLS, Área 2: Datos en Reposo — Servidor (RLS y DB)

### Community 129 - "2. `F3.2` — OAuth, PKCE, redirects y callback (`T10`, `SEC-012`)"
Cohesion: 0.67
Nodes (5): cmd_next(), cmd_prompt(), cmd_status(), handoff.sh script, show_help()

### Community 130 - "🧪 Evidencia F0 — Preparación, Estructura y Verificación de Entorno"
Cohesion: 0.47
Nodes (3): idx_push_subs_endpoint, idx_push_subs_user_id, public.push_subscriptions

### Community 133 - "🤖 Prompt de Sistema / Rol: OpenCode Constructor & Ejecutor (Fase 2)"
Cohesion: 0.40
Nodes (5): 12.11.1 Cero cambios en código fuente, 12.11.2 Escaneo de secretos, 12.11.3 Limitaciones, 12.11.4 Firma de cierre, 12.11 Verificación de cierre y limitaciones

### Community 134 - "🤖 Prompt de Sistema / Rol: Antigravity Revisor, Auditor Lead y Finalizador (Fase 3)"
Cohesion: 0.40
Nodes (5): Análisis de Inyección SQL / NoSQL, Análisis de XSS, 🟠 SEC-005 — ALTO: IDOR Potencial en Servicios de Update/Delete, SEC-018 — BAJO: Importación JSON sin límite de tamaño previo al parse, Área 5: IDOR, Inyección y Lógica de Aplicación

### Community 135 - "Área 6: Seguridad de la Plataforma y Configuración"
Cohesion: 0.40
Nodes (5): Headers de Seguridad — Netlify, 🟠 SEC-003 — ALTO: CORS Wildcard en Edge Function sin Autenticación de Llamante, 🟡 SEC-007 — MEDIO: URLs de Recibos en Storage No Firmadas (Públicas), SEC-016 — BAJO: Datos sensibles en logs de consola, Área 6: Seguridad de la Plataforma y Configuración

### Community 136 - "Reference"
Cohesion: 0.40
Nodes (5): 🟠 PRIORIDAD 2: Altos (Semana 2), SEC-003 — Asegurar la Edge Function send-reminders, SEC-004 — Restringir SECURITY DEFINER a llamadas autenticadas, SEC-005 — Añadir filtro `user_id` en operaciones de servicio, SEC-006 — Rotación de claves Supabase

### Community 137 - "Tablero de Ejecución de Tareas — OpenCode CLI (`02_OPENCODE_TASKS.md`)"
Cohesion: 0.40
Nodes (5): 🟡 PRIORIDAD 3: Medios (Semana 3-4), SEC-007 — URLs firmadas para recibos, SEC-009 — Reemplazar djb2 por SHA-256 en audit logger, SEC-011 — Corregir columnas `deleted_at` faltantes en esquema, SEC-012 — Restringir validación de localhost a paths y puertos conocidos

### Community 146 - "MigracionNube.tsx"
Cohesion: 0.10
Nodes (29): ErrorBoundary, Props, State, Card, CardContent, CardDescription, CardFooter, CardHeader (+21 more)

### Community 178 - "vitest"
Cohesion: 0.11
Nodes (12): @capacitor/network, @testing-library/react, vitest, DesktopSyncIcon(), isNative, SyncIcon(), SyncIndicator(), SyncState (+4 more)

## Knowledge Gaps
- **31 isolated node(s):** `@hookform/resolvers`, `@tanstack/query-sync-storage-persister`, `@types/react-window`, `date-fns`, `framer-motion` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 653 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **52 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `useFinanceData` to `Core Dependencies & Third-Party Packages`, `Autonomous Notification & Scheduling Engine`, `class-variance-authority`, `Cloud Sync & Offline State Engine`, `Navigation Shell & Responsive Drawers`, `Savings Goals & Folder Organization`, `Brand Identity & Accent Palettes`, `Interactive Toast Notification System`, `utils.ts`, `supabase.ts`, `GoalDetailContent.tsx`, `MigracionNube.tsx`, `Brand Identity & Accent Palettes`, `Navigation Shell & Responsive Drawers`, `Login.tsx`, `Supabase Authentication & Security Context`, `version-check.ts`, `chart.tsx`, `BrandLogo.tsx`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `vitest`, `scroll-area.tsx`, `sheet.tsx`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `useFinanceData()` (e.g. with `2. Alineación Arquitectónica (Finance Pal Local-First)` and `6. Verificación de Criterios de Aceptación (Sign-off)`) actually correct?**
  _`useFinanceData()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@hookform/resolvers`, `@tanstack/query-sync-storage-persister`, `@types/react-window` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useFinanceData` be split into smaller, more focused modules?**
  _Cohesion score 0.06223207686622321 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `Core Dependencies & Third-Party Packages` to `useFinanceData`, `Navigation Shell & Responsive Drawers`, `Savings Goals & Folder Organization`, `Brand Identity & Accent Palettes`, `Interactive Toast Notification System`, `utils.ts`, `GoalDetailContent.tsx`, `Brand Identity & Accent Palettes`, `MigracionNube.tsx`, `Navigation Shell & Responsive Drawers`, `Login.tsx`, `Supabase Authentication & Security Context`, `chart.tsx`, `BrandLogo.tsx`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `scroll-area.tsx`, `sheet.tsx`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Should `Autonomous Notification & Scheduling Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.029411764705882353 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Autonomous Notification & Scheduling Engine` to `Autonomous Notification & Scheduling Engine`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._