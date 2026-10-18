# Graph Report - finance-pal  (2026-10-15)

## Corpus Check
- 287 files · ~448,961 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 27 file(s) not represented in the graph (top: .xml 12, (none) 4, .toml 2)

## Summary
- 1564 nodes · 4767 edges · 101 communities (58 shown, 43 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- System Architecture & Core Contracts
- Autonomous Notification & Scheduling Engine
- Autonomous Notification & Scheduling Engine
- Core Dependencies & Third-Party Packages
- Autonomous Notification & Scheduling Engine
- Autonomous Notification & Scheduling Engine
- Debt Management & Loan Tracking
- Session Lifecycle & Device Management
- Cloud Sync & Offline State Engine
- Navigation Shell & Responsive Drawers
- Savings Goals & Folder Organization
- Build Configuration & Tooling Infrastructure
- Savings Goals & Folder Organization
- Brand Identity & Accent Palettes
- Interactive Toast Notification System
- Autonomous Notification & Scheduling Engine
- Core Dependencies & Third-Party Packages
- Debt Management & Loan Tracking
- Savings Goals & Folder Organization
- Brand Identity & Accent Palettes
- Debt Management & Loan Tracking
- Navigation Shell & Responsive Drawers
- Autonomous Notification & Scheduling Engine
- Supabase Authentication & Security Context
- Build Configuration & Tooling Infrastructure
- Supabase Authentication & Security Context
- Autonomous Notification & Scheduling Engine
- Autonomous Notification & Scheduling Engine
- Debt Management & Loan Tracking
- Savings Goals & Folder Organization
- Core Dependencies & Third-Party Packages
- Schema Validation & Domain Rules
- App Version Check & Update Toast
- Session Lifecycle & Device Management
- Savings Goals & Folder Organization
- App Version Check & Update Toast
- Build Configuration & Tooling Infrastructure
- Annual Analytics & Visualization Charts
- Core Dependencies & Third-Party Packages
- Core Dependencies & Third-Party Packages
- Android Native Integration & Build Pipeline
- Core Dependencies & Third-Party Packages
- Annual Analytics & Visualization Charts
- Core Dependencies & Third-Party Packages
- useReceiptMutations Subsystem
- Android Native Integration & Build Pipeline
- App Version Check & Update Toast
- app-error Subsystem
- Build Configuration & Tooling Infrastructure
- Core Dependencies & Third-Party Packages
- Core Dependencies & Third-Party Packages
- ref_fs Subsystem
- PillTabs Subsystem
- ref_crypto Subsystem
- Core Dependencies & Third-Party Packages
- Command Palette & Search Quick Actions
- Core Dependencies & Third-Party Packages
- cleanup-receipts.js Subsystem
- Command Palette & Search Quick Actions
- Core Dependencies & Third-Party Packages
- Core Dependencies & Third-Party Packages
- Core Dependencies & Third-Party Packages
- Core Dependencies & Third-Party Packages
- Core Dependencies & Third-Party Packages
- Build Configuration & Tooling Infrastructure
- dependabot.yml Subsystem
- Build Configuration & Tooling Infrastructure
- ci.yml Subsystem
- dependabot-auto-merge.yml Subsystem
- index.html Subsystem
- PENTEST_CHECKLIST.md Subsystem
- robots.txt Subsystem
- Core Dependencies & Third-Party Packages
- Core Dependencies & Third-Party Packages

## God Nodes (most connected - your core abstractions)
1. `cn()` - 253 edges
2. `react` - 100 edges
3. `useFinance` - 83 edges
4. `Button` - 63 edges
5. `AppError` - 62 edges
6. `lucide-react` - 60 edges
7. `useFinanceData()` - 54 edges
8. `Label` - 34 edges
9. `useAuth()` - 33 edges
10. `Input` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Autonomous Notification Scheduler Engine` --references--> `useFinanceData()`  [INFERRED]
  CHANGELOG.md → src/hooks/useFinanceData.ts
- `Local-First Architecture Pattern` --implements--> `useFinance`  [INFERRED]
  .agent/rules/architecture.md → src/store/finance-store.ts
- `State Synchronization Facade` --implements--> `useFinanceData()`  [EXTRACTED]
  .agent/rules/architecture.md → src/hooks/useFinanceData.ts
- `Finance Pal Core Product Spec` --references--> `Dashboard()`  [INFERRED]
  README.md → src/pages/Dashboard.tsx
- `Virtual Debt Transactions Engine` --references--> `Movimientos()`  [EXTRACTED]
  .agent/rules/architecture.md → src/pages/Movimientos.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Local-First Architecture Triad (Zustand + React Query + Facade)** — agent_rules_architecture_local_first_architecture, agent_rules_architecture_state_synchronization_facade, src_hooks_usefinancedata_usefinancedata, src_store_finance_store_usefinance [EXTRACTED 1.00]
- **Continuous Security and Quality Assurance Gate** — pentest_checklist_pentest_security_scope, github_workflows_ci_ci_build_and_test_pipeline, changelog_notification_scheduler_engine [INFERRED 0.85]

## Communities (101 total, 43 thin omitted)

### Community 0 - "System Architecture & Core Contracts"
Cohesion: 0.08
Nodes (88): Antigravity Architect Role Contract, Local-First Architecture Pattern, State Synchronization Facade, Virtual Debt Transactions Engine, Autonomous Notification Scheduler Engine, Finance Pal Core Product Spec, react-easy-crop, sonner (+80 more)

### Community 1 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.05
Nodes (95): @capacitor/filesystem, vitest, zustand, AccountMutations, clearEncryptedState(), decryptData(), deleteFileNative(), deleteReceipt() (+87 more)

### Community 2 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.03
Nodes (68): dependencies, @capacitor/app, @capacitor/browser, @capacitor/core, @capacitor/filesystem, @capacitor/local-notifications, @capacitor/network, @capacitor/push-notifications (+60 more)

### Community 3 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.06
Nodes (54): @radix-ui/react-accordion, @radix-ui/react-avatar, @radix-ui/react-context-menu, @radix-ui/react-dropdown-menu, @radix-ui/react-menubar, @radix-ui/react-tabs, AccordionContent, AccordionItem (+46 more)

### Community 4 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.09
Nodes (49): isRecentlyDismissed(), NotificationPermissionPrompt(), listeners, notifySchedulerListeners(), SharedSchedulerState, sharedState, useNotificationScheduler(), buildScheduledTxId() (+41 more)

### Community 5 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.05
Nodes (42): name, private, type, version, autoprefixer, @capacitor/android, @capacitor/app, @capacitor/browser (+34 more)

### Community 6 - "Debt Management & Loan Tracking"
Cohesion: 0.09
Nodes (31): @radix-ui/react-progress, ErrorBoundary, Props, State, Card, CardContent, CardDescription, CardFooter (+23 more)

### Community 7 - "Session Lifecycle & Device Management"
Cohesion: 0.08
Nodes (24): getDeviceId(), getDeviceName(), SessionState, useSessionManager(), createRateLimitedFunction(), getClientIdentifier(), RateLimitConfig, rateLimiter (+16 more)

### Community 8 - "Cloud Sync & Offline State Engine"
Cohesion: 0.10
Nodes (29): @capacitor/core, next-themes, react-dom, Ajustes, AnimatedRoutes(), Anual, App(), AuthCallback (+21 more)

### Community 9 - "Navigation Shell & Responsive Drawers"
Cohesion: 0.07
Nodes (29): Separator, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel (+21 more)

### Community 10 - "Savings Goals & Folder Organization"
Cohesion: 0.11
Nodes (28): vaul, Drawer(), DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle (+20 more)

### Community 11 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.06
Nodes (33): devDependencies, autoprefixer, @capacitor/android, @capacitor/cli, cross-env, cssnano, eslint, @eslint/js (+25 more)

### Community 12 - "Savings Goals & Folder Organization"
Cohesion: 0.14
Nodes (20): lucide-react, react, Checkbox, setSyncEnabled(), AjustesHeaderProps, AjustesHubProps, SCOPE_LABELS, ScopePicker() (+12 more)

### Community 13 - "Brand Identity & Accent Palettes"
Cohesion: 0.13
Nodes (19): react-router-dom, applyAccentVars(), AppShell(), SWIPE_ROUTES, BottomNav, Props, DesktopSidebar, NavItem (+11 more)

### Community 14 - "Interactive Toast Notification System"
Cohesion: 0.12
Nodes (25): @radix-ui/react-toast, Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle (+17 more)

### Community 15 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.08
Nodes (28): accountSchema, accountTypeSchema, changeActionSchema, changeEntitySchema, changeLogEntrySchema, currencySchema, debtPaymentSchema, debtSchema (+20 more)

### Community 16 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.07
Nodes (20): input-otp, @radix-ui/react-hover-card, @radix-ui/react-popover, @radix-ui/react-radio-group, react-resizable-panels, StatPill, NavLink, NavLinkCompatProps (+12 more)

### Community 17 - "Debt Management & Loan Tracking"
Cohesion: 0.22
Nodes (17): @supabase/supabase-js, @tanstack/react-query, AuthContext, AuthContextType, useAuth(), useDebtsQuery(), useFixedItemsQuery(), useGoalFoldersQuery() (+9 more)

### Community 18 - "Savings Goals & Folder Organization"
Cohesion: 0.23
Nodes (23): Slider, actualGoalAt(), daysBetween(), expectedGoalAt(), fmtDate(), paceForGoal(), parseDateLocal(), parseGoalDeadline() (+15 more)

### Community 19 - "Brand Identity & Accent Palettes"
Cohesion: 0.10
Nodes (22): @radix-ui/react-alert-dialog, react-day-picker, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader() (+14 more)

### Community 20 - "Debt Management & Loan Tracking"
Cohesion: 0.17
Nodes (22): AddDebtPaymentInput, DebtMutations, isOffline(), RemoveDebtPaymentInput, useDebtMutations(), Debt, DebtPayment, DebtInsertPayload (+14 more)

### Community 21 - "Navigation Shell & Responsive Drawers"
Cohesion: 0.10
Nodes (21): cmdk, @radix-ui/react-dialog, Command, CommandDialog(), CommandDialogProps, CommandEmpty, CommandGroup, CommandInput (+13 more)

### Community 22 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.23
Nodes (20): CloudSyncMutations, useCloudSyncMutations(), NotificationPreferences, ThemeMode, UserProfile, mapAccountFromDb(), CloudSettings, CloudSnapshot (+12 more)

### Community 23 - "Supabase Authentication & Security Context"
Cohesion: 0.16
Nodes (17): BrandLogo, BrandLogoProps, SIZE_MAP, ACCENT_PALETTES, AccentColor, AccentPalette, AnimatedBackground(), calculatePasswordStrength() (+9 more)

### Community 24 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 25 - "Supabase Authentication & Security Context"
Cohesion: 0.14
Nodes (15): class-variance-authority, @radix-ui/react-toggle, @radix-ui/react-toggle-group, Alert, AlertDescription, AlertTitle, alertVariants, Badge() (+7 more)

### Community 26 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.20
Nodes (16): UpdateNotification(), check(), UpdateNotificationProps, useUpdateToast(), check(), checkForUpdates(), compareVersions(), dismissVersion() (+8 more)

### Community 27 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.10
Nodes (19): AccountType, ChangeAction, ChangeEntity, ColorBlindMode, COMMON_EMOJIS, Currency, Denomination, emojiFor() (+11 more)

### Community 28 - "Debt Management & Loan Tracking"
Cohesion: 0.18
Nodes (16): Series, SimpleAreaChart(), fmt2(), isFixedActiveInMonth(), Anual(), ChartCard(), COLORS, DebtStat() (+8 more)

### Community 29 - "Savings Goals & Folder Organization"
Cohesion: 0.21
Nodes (15): GoalFolderMutations, isOffline(), useGoalFolderMutations(), useAccountsQuery(), AppError, fetchAccounts(), deleteGoalFolder(), fetchGoalFolders() (+7 more)

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
Cohesion: 0.23
Nodes (14): ContributeToGoalInput, isOffline(), useGoalMutations(), addGoalContribution(), deleteGoal(), fetchGoals(), GoalContributionInput, GoalContributionRow (+6 more)

### Community 35 - "App Version Check & Update Toast"
Cohesion: 0.24
Nodes (14): isOffline(), TransactionMutations, useTransactionMutations(), Transaction, deleteTransaction(), fetchTransactions(), insertTransaction(), mapTransactionFromDb() (+6 more)

### Community 36 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 37 - "Annual Analytics & Visualization Charts"
Cohesion: 0.18
Nodes (12): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+4 more)

### Community 38 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.29
Nodes (11): @capacitor/network, @testing-library/react, DesktopSyncIcon(), isNative, SyncIcon(), SyncIndicator(), SyncState, UploadDots() (+3 more)

### Community 39 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.17
Nodes (14): embla-carousel-react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+6 more)

### Community 41 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.27
Nodes (12): fake-indexeddb, audit, AuditAction, AuditEntry, computeHash(), exportAuditLogs(), GENESIS_HASH, getLastEntryHash() (+4 more)

### Community 42 - "Annual Analytics & Visualization Charts"
Cohesion: 0.18
Nodes (9): lovable-tagger, rollup-plugin-visualizer, vite, @vitejs/plugin-react-swc, exists(), main(), path, usage() (+1 more)

### Community 43 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.19
Nodes (12): @radix-ui/react-label, react-hook-form, FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext (+4 more)

### Community 44 - "useReceiptMutations Subsystem"
Cohesion: 0.28
Nodes (11): DeleteReceiptForTransactionInput, ReceiptMutations, UploadReceiptForTransactionInput, useReceiptMutations(), supabase, dataUrlToBlob(), deleteReceipt(), getReceiptSignedUrl() (+3 more)

### Community 46 - "App Version Check & Update Toast"
Cohesion: 0.30
Nodes (10): isOffline(), useAccountMutations(), AccountInsertPayload, AccountRow, AccountUpdatePayload, deleteAccount(), insertAccount(), toInsertPayload() (+2 more)

### Community 47 - "app-error Subsystem"
Cohesion: 0.20
Nodes (8): ErrorCode, errorFromUnknown(), ErrorSeverity, LogEntry, logger, LogLevel, logs, showUserError()

### Community 48 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

### Community 49 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.28
Nodes (8): @radix-ui/react-navigation-menu, NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 50 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.22
Nodes (8): @radix-ui/react-slot, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 51 - "ref_fs Subsystem"
Cohesion: 0.36
Nodes (6): fs, main(), path, readFileSafe(), readRoots(), walk()

### Community 52 - "PillTabs Subsystem"
Cohesion: 0.43
Nodes (6): PILL_TAB_ACTIVE, PILL_TAB_BASE, PILL_TAB_INACTIVE, PILL_TABS_CONTAINER, PillTabs(), PillTabsProps

### Community 53 - "ref_crypto Subsystem"
Cohesion: 0.29
Nodes (3): __dirname, __filename, INDEX_HTML_PATH

### Community 54 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.38
Nodes (5): sharp, ensureDir(), main(), main(), processDirectory()

### Community 55 - "Command Palette & Search Quick Actions"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, installCommand, outputDirectory, rewrites

### Community 56 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.33
Nodes (5): @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, typescript-eslint

### Community 58 - "cleanup-receipts.js Subsystem"
Cohesion: 0.60
Nodes (4): exists(), main(), path, usage()

### Community 61 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.67
Nodes (3): @radix-ui/react-scroll-area, ScrollArea, ScrollBar

### Community 62 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.67
Nodes (3): web-vitals, initWebVitals(), send()

## Knowledge Gaps
- **30 isolated node(s):** `@hookform/resolvers`, `@tanstack/query-sync-storage-persister`, `@types/react-window`, `date-fns`, `framer-motion` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 493 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Savings Goals & Folder Organization` to `System Architecture & Core Contracts`, `Core Dependencies & Third-Party Packages`, `Autonomous Notification & Scheduling Engine`, `Autonomous Notification & Scheduling Engine`, `Debt Management & Loan Tracking`, `Session Lifecycle & Device Management`, `Cloud Sync & Offline State Engine`, `Navigation Shell & Responsive Drawers`, `Savings Goals & Folder Organization`, `Brand Identity & Accent Palettes`, `Interactive Toast Notification System`, `Core Dependencies & Third-Party Packages`, `Debt Management & Loan Tracking`, `Savings Goals & Folder Organization`, `Brand Identity & Accent Palettes`, `Navigation Shell & Responsive Drawers`, `Supabase Authentication & Security Context`, `Supabase Authentication & Security Context`, `Autonomous Notification & Scheduling Engine`, `Debt Management & Loan Tracking`, `Annual Analytics & Visualization Charts`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tanstack/query-sync-storage-persister`, `@types/react-window` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `System Architecture & Core Contracts` be split into smaller, more focused modules?**
  _Cohesion score 0.08156737305077968 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `Core Dependencies & Third-Party Packages` to `System Architecture & Core Contracts`, `Debt Management & Loan Tracking`, `Navigation Shell & Responsive Drawers`, `Savings Goals & Folder Organization`, `Savings Goals & Folder Organization`, `Brand Identity & Accent Palettes`, `Interactive Toast Notification System`, `Core Dependencies & Third-Party Packages`, `Savings Goals & Folder Organization`, `Brand Identity & Accent Palettes`, `Navigation Shell & Responsive Drawers`, `Supabase Authentication & Security Context`, `Supabase Authentication & Security Context`, `Annual Analytics & Visualization Charts`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `PillTabs Subsystem`, `Core Dependencies & Third-Party Packages`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Should `Autonomous Notification & Scheduling Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.05392223275978865 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Autonomous Notification & Scheduling Engine` to `Autonomous Notification & Scheduling Engine`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `Autonomous Notification & Scheduling Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.029411764705882353 - nodes in this community are weakly interconnected._