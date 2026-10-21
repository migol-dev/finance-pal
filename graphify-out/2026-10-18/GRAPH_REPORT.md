# Graph Report - finance-pal  (2026-10-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1668 nodes · 4912 edges · 121 communities (70 shown, 51 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c16e4c13`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- System Architecture & Core Contracts
- Autonomous Notification & Scheduling Engine
- Autonomous Notification & Scheduling Engine
- Core Dependencies & Third-Party Packages
- cn
- Autonomous Notification & Scheduling Engine
- Debt Management & Loan Tracking
- Session Lifecycle & Device Management
- Cloud Sync & Offline State Engine
- Navigation Shell & Responsive Drawers
- Savings Goals & Folder Organization
- Build Configuration & Tooling Infrastructure
- devDependencies
- AppError
- Interactive Toast Notification System
- Autonomous Notification & Scheduling Engine
- Core Dependencies & Third-Party Packages
- Debt Management & Loan Tracking
- sync-engine.ts
- Brand Identity & Accent Palettes
- Debt Management & Loan Tracking
- Navigation Shell & Responsive Drawers
- Autonomous Notification & Scheduling Engine
- Supabase Authentication & Security Context
- Build Configuration & Tooling Infrastructure
- Supabase Authentication & Security Context
- Autonomous Notification & Scheduling Engine
- components.json
- SyncIndicator.tsx
- Savings Goals & Folder Organization
- Core Dependencies & Third-Party Packages
- Schema Validation & Domain Rules
- App Version Check & Update Toast
- Session Lifecycle & Device Management
- carousel.tsx
- App Version Check & Update Toast
- Build Configuration & Tooling Infrastructure
- Annual Analytics & Visualization Charts
- form.tsx
- Core Dependencies & Third-Party Packages
- Android Native Integration & Build Pipeline
- supabase
- Annual Analytics & Visualization Charts
- Core Dependencies & Third-Party Packages
- ExampleInstrumentedTest.java
- Android Native Integration & Build Pipeline
- App Version Check & Update Toast
- FolderChips.tsx
- Build Configuration & Tooling Infrastructure
- Core Dependencies & Third-Party Packages
- Core Dependencies & Third-Party Packages
- navigation-menu.tsx
- 🔐 Auditoría de Seguridad y Privacidad — Finance Pal
- Plan de Mitigación Accionable
- Core Dependencies & Third-Party Packages
- Command Palette & Search Quick Actions
- find-unused-deps.cjs
- vercel.json
- cleanup-receipts.js Subsystem
- Android Native Integration & Build Pipeline
- Command Palette & Search Quick Actions
- architecture.md
- Área 5: IDOR, Inyección y Lógica de Aplicación
- Core Dependencies & Third-Party Packages
- Core Dependencies & Third-Party Packages
- Core Dependencies & Third-Party Packages
- Build Configuration & Tooling Infrastructure
- dependabot.yml Subsystem
- Build Configuration & Tooling Infrastructure
- ci.yml Subsystem
- dependabot-auto-merge.yml Subsystem
- PENTEST_CHECKLIST.md Subsystem
- robots.txt Subsystem
- Autonomous Notification & Scheduling Engine
- Core Dependencies & Third-Party Packages
- Core Dependencies & Third-Party Packages
- task.md Subsystem
- Android Native Integration & Build Pipeline
- Android Native Integration & Build Pipeline
- Android Native Integration & Build Pipeline
- Android Native Integration & Build Pipeline
- Android Native Integration & Build Pipeline
- Android Native Integration & Build Pipeline
- Android Native Integration & Build Pipeline
- Android Native Integration & Build Pipeline
- Android Native Integration & Build Pipeline
- Android Native Integration & Build Pipeline
- Android Native Integration & Build Pipeline
- Android Native Integration & Build Pipeline

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
- `Virtual Debt Transactions Engine` --references--> `Movimientos()`  [EXTRACTED]
  .agent/rules/architecture.md → src/pages/Movimientos.tsx
- `Finance Pal Core Product Spec` --references--> `Movimientos()`  [INFERRED]
  README.md → src/pages/Movimientos.tsx
- `Resumen de Hallazgos por Severidad` --references--> `migrateImported()`  [INFERRED]
  .agent/security_audit.md → src/lib/sanitizers.ts
- `Autonomous Notification Scheduler Engine` --references--> `useFinanceData()`  [INFERRED]
  CHANGELOG.md → src/hooks/useFinanceData.ts
- `Finance Pal Core Product Spec` --references--> `Dashboard()`  [INFERRED]
  README.md → src/pages/Dashboard.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Local-First Architecture Triad (Zustand + React Query + Facade)** — agent_rules_architecture_local_first_architecture, agent_rules_architecture_state_synchronization_facade, src_hooks_usefinancedata_usefinancedata, src_store_finance_store_usefinance [EXTRACTED 1.00]
- **Continuous Security and Quality Assurance Gate** — pentest_checklist_pentest_security_scope, github_workflows_ci_ci_build_and_test_pipeline, changelog_notification_scheduler_engine [INFERRED 0.85]

## Communities (121 total, 51 thin omitted)

### Community 0 - "System Architecture & Core Contracts"
Cohesion: 0.07
Nodes (104): lucide-react, react-easy-crop, sonner, AccessibilitySettings, ElegantConfirm(), ElegantConfirmProps, Header, IconDisplay (+96 more)

### Community 1 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.06
Nodes (95): @capacitor/filesystem, vitest, zustand, clearEncryptedState(), decryptData(), deleteFileNative(), deleteReceipt(), encryptData() (+87 more)

### Community 2 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.06
Nodes (90): PILL_TAB_ACTIVE, PILL_TAB_BASE, PILL_TAB_INACTIVE, PILL_TABS_CONTAINER, PillTabs(), PillTabsProps, Series, SimpleAreaChart() (+82 more)

### Community 3 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.03
Nodes (68): dependencies, @capacitor/app, @capacitor/browser, @capacitor/core, @capacitor/filesystem, @capacitor/local-notifications, @capacitor/network, @capacitor/push-notifications (+60 more)

### Community 4 - "cn"
Cohesion: 0.07
Nodes (49): @radix-ui/react-context-menu, @radix-ui/react-dropdown-menu, @radix-ui/react-menubar, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList (+41 more)

### Community 5 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.04
Nodes (47): name, private, type, version, autoprefixer, @capacitor/android, @capacitor/app, @capacitor/local-notifications (+39 more)

### Community 6 - "Debt Management & Loan Tracking"
Cohesion: 0.06
Nodes (46): zod, AccountType, ChangeAction, ChangeEntity, Frequency, ItemType, NotificationPreferences, Priority (+38 more)

### Community 7 - "Session Lifecycle & Device Management"
Cohesion: 0.06
Nodes (27): @radix-ui/react-accordion, @radix-ui/react-avatar, @radix-ui/react-hover-card, @radix-ui/react-popover, @radix-ui/react-radio-group, @radix-ui/react-slot, react, react-resizable-panels (+19 more)

### Community 8 - "Cloud Sync & Offline State Engine"
Cohesion: 0.10
Nodes (29): ErrorBoundary, Props, State, Card, CardContent, CardDescription, CardFooter, CardHeader (+21 more)

### Community 9 - "Navigation Shell & Responsive Drawers"
Cohesion: 0.07
Nodes (30): Separator, Sidebar, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent (+22 more)

### Community 10 - "Savings Goals & Folder Organization"
Cohesion: 0.10
Nodes (29): react-router-dom, Ajustes, AnimatedRoutes(), Anual, App(), AuthCallback, AuthGuard(), Dashboard (+21 more)

### Community 11 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.13
Nodes (31): accounts, accounts_safe, debt_payments, debt_payments_safe, debts, fixed_items, goal_folders, goals (+23 more)

### Community 12 - "devDependencies"
Cohesion: 0.06
Nodes (35): devDependencies, autoprefixer, @capacitor/android, @capacitor/cli, cross-env, cssnano, eslint, @eslint/js (+27 more)

### Community 13 - "AppError"
Cohesion: 0.13
Nodes (27): Vistas de Seguridad (Column-Level Security), AddDebtPaymentInput, DebtMutations, isOffline(), RemoveDebtPaymentInput, useDebtMutations(), useAccountsQuery(), useDebtsQuery() (+19 more)

### Community 14 - "Interactive Toast Notification System"
Cohesion: 0.20
Nodes (19): @supabase/supabase-js, @tanstack/react-query, AuthContext, AuthContextType, useAuth(), useFixedItemsQuery(), useGoalFoldersQuery(), useGoalsQuery() (+11 more)

### Community 15 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.12
Nodes (25): @radix-ui/react-toast, Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle (+17 more)

### Community 16 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.11
Nodes (21): @radix-ui/react-alert-dialog, react-day-picker, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader() (+13 more)

### Community 17 - "Debt Management & Loan Tracking"
Cohesion: 0.11
Nodes (13): lovable-tagger, rollup-plugin-visualizer, sharp, vite, @vitejs/plugin-react-swc, __dirname, __filename, INDEX_HTML_PATH (+5 more)

### Community 18 - "sync-engine.ts"
Cohesion: 0.13
Nodes (20): getDeviceId(), getDeviceName(), SessionState, useSessionManager(), logger, abortControllers, ALLOWED_TABLES, getUserLock() (+12 more)

### Community 19 - "Brand Identity & Accent Palettes"
Cohesion: 0.18
Nodes (18): State Synchronization Facade, Autonomous Notification Scheduler Engine, CloudSyncMutations, useCloudSyncMutations(), useFinanceData(), mapAccountFromDb(), CloudSnapshot, CloudSyncResult (+10 more)

### Community 20 - "Debt Management & Loan Tracking"
Cohesion: 0.20
Nodes (17): @capacitor/core, isRecentlyDismissed(), NotificationPermissionPrompt(), listeners, notifySchedulerListeners(), SharedSchedulerState, sharedState, useNotificationScheduler() (+9 more)

### Community 21 - "Navigation Shell & Responsive Drawers"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 22 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.14
Nodes (15): class-variance-authority, @radix-ui/react-toggle, @radix-ui/react-toggle-group, Alert, AlertDescription, AlertTitle, alertVariants, Badge() (+7 more)

### Community 23 - "Supabase Authentication & Security Context"
Cohesion: 0.11
Nodes (18): scripts, analyze, android:build:release, android:build:release:win, android:copy, browserslist:update-db, build, build:dev (+10 more)

### Community 24 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.22
Nodes (15): UpdateNotification(), check(), UpdateNotificationProps, useUpdateToast(), check(), checkForUpdates(), compareVersions(), dismissVersion() (+7 more)

### Community 25 - "Supabase Authentication & Security Context"
Cohesion: 0.22
Nodes (13): DropdownMenuContent, DropdownMenuItem, Goal, GoalFolder, FolderChipsProps, FolderFormProps, FolderTree(), FolderTreeProps (+5 more)

### Community 26 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.20
Nodes (15): Resumen de Hallazgos por Severidad, 🟡 SEC-012 — MEDIO: `isValidRedirectUri` permite cualquier `localhost`, @capacitor/browser, @radix-ui/react-progress, Progress, AnimatedBackground(), calculatePasswordStrength(), FloatingParticles() (+7 more)

### Community 27 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 28 - "SyncIndicator.tsx"
Cohesion: 0.20
Nodes (9): @capacitor/network, @testing-library/react, DesktopSyncIcon(), isNative, SyncIcon(), SyncIndicator(), SyncState, UploadDots() (+1 more)

### Community 29 - "Savings Goals & Folder Organization"
Cohesion: 0.20
Nodes (15): ContributeToGoalInput, GoalMutations, isOffline(), useGoalMutations(), addGoalContribution(), deleteGoal(), GoalContributionInput, GoalContributionRow (+7 more)

### Community 30 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.18
Nodes (11): corsHeaders, daysBetween(), DEFAULT_PREFS, getNextFixedDueDates(), isDateInQuietHours(), isFixedActiveInMonth(), parseDateSafe(), parseTimeHHMM() (+3 more)

### Community 31 - "Schema Validation & Domain Rules"
Cohesion: 0.21
Nodes (10): applyAccentVars(), AppShell(), SWIPE_ROUTES, BottomNav, SplashScreen(), ACCENT_PALETTES, AccentColor, AccentPalette (+2 more)

### Community 32 - "App Version Check & Update Toast"
Cohesion: 0.18
Nodes (6): createRateLimitedFunction(), getClientIdentifier(), RateLimitConfig, RateLimiter, RateLimitInfo, withRateLimit()

### Community 33 - "Session Lifecycle & Device Management"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 34 - "carousel.tsx"
Cohesion: 0.17
Nodes (14): embla-carousel-react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+6 more)

### Community 35 - "App Version Check & Update Toast"
Cohesion: 0.28
Nodes (13): FixedItemMutations, isOffline(), useFixedItemMutations(), FixedItem, deleteFixedItem(), FixedItemInsertPayload, FixedItemRow, FixedItemUpdatePayload (+5 more)

### Community 37 - "Annual Analytics & Visualization Charts"
Cohesion: 0.27
Nodes (12): fake-indexeddb, audit, AuditAction, AuditEntry, computeHash(), exportAuditLogs(), GENESIS_HASH, getLastEntryHash() (+4 more)

### Community 38 - "form.tsx"
Cohesion: 0.19
Nodes (12): @radix-ui/react-label, react-hook-form, FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext (+4 more)

### Community 39 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.20
Nodes (12): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+4 more)

### Community 40 - "Android Native Integration & Build Pipeline"
Cohesion: 0.22
Nodes (9): NotFound, BrandLogo, BrandLogoProps, SIZE_MAP, DesktopSidebar, NavItem, navItems, useSystemTheme() (+1 more)

### Community 41 - "supabase"
Cohesion: 0.25
Nodes (12): AccountMutations, isOffline(), useAccountMutations(), supabase, AccountInsertPayload, AccountRow, AccountUpdatePayload, deleteAccount() (+4 more)

### Community 42 - "Annual Analytics & Visualization Charts"
Cohesion: 0.26
Nodes (12): GoalFolderMutations, isOffline(), useGoalFolderMutations(), deleteGoalFolder(), GoalFolderInsertPayload, GoalFolderRow, GoalFolderUpdatePayload, insertGoalFolder() (+4 more)

### Community 43 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.27
Nodes (11): isOffline(), TransactionMutations, useTransactionMutations(), deleteTransaction(), insertTransaction(), toInsertPayload(), toUpdatePayload(), TransactionInsertPayload (+3 more)

### Community 45 - "Android Native Integration & Build Pipeline"
Cohesion: 0.18
Nodes (11): cmdk, Command, CommandDialog(), CommandDialogProps, CommandEmpty, CommandGroup, CommandInput, CommandItem (+3 more)

### Community 46 - "App Version Check & Update Toast"
Cohesion: 0.30
Nodes (10): DeleteReceiptForTransactionInput, ReceiptMutations, UploadReceiptForTransactionInput, useReceiptMutations(), dataUrlToBlob(), deleteReceipt(), getReceiptSignedUrl(), ReceiptUploadInput (+2 more)

### Community 47 - "FolderChips.tsx"
Cohesion: 0.38
Nodes (8): Drawer(), DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle, FolderChips()

### Community 48 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

### Community 49 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.24
Nodes (9): @radix-ui/react-dialog, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle (+1 more)

### Community 50 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.22
Nodes (7): ErrorCode, errorFromUnknown(), ErrorSeverity, LogEntry, LogLevel, logs, showUserError()

### Community 51 - "navigation-menu.tsx"
Cohesion: 0.28
Nodes (8): @radix-ui/react-navigation-menu, NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 52 - "🔐 Auditoría de Seguridad y Privacidad — Finance Pal"
Cohesion: 0.25
Nodes (7): Análisis del Cliente Supabase, 🔐 Auditoría de Seguridad y Privacidad — Finance Pal, Controles de Seguridad Positivos Detectados, Matriz de Riesgo Residual, Resumen Ejecutivo, Tabla de Contenidos, Área 1: Datos en Tránsito

### Community 53 - "Plan de Mitigación Accionable"
Cohesion: 0.25
Nodes (8): Plan de Mitigación Accionable, 🔴 PRIORIDAD 1: Críticos (Semana 1), 🟢 PRIORIDAD 4: Bajos (Backlog), SEC-001 — Inmediato: Borrar texto plano de localStorage existente, SEC-001 y SEC-002 — Rediseño del modelo de persistencia cifrada, SEC-014 — Añadir headers COOP/COEP al netlify.toml, SEC-015 — Excluir email del estado persistido, SEC-018 — Límite de tamaño en importación JSON

### Community 54 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.29
Nodes (7): Análisis del Audit Logger (IndexedDB), Análisis del IndexedDB (Recibos), 🔴 SEC-001 — CRÍTICO: Estado Zustand persistido en TEXTO PLANO en localStorage como almacenamiento PRIMARIO, 🔴 SEC-002 — CRÍTICO: La clave de cifrado AES-GCM se deriva de un secreto almacenado en texto plano en localStorage, 🟡 SEC-009 — MEDIO: Hash de audit log usa djb2 (hash de 32 bits, no criptográfico), SEC-015 — BAJO: Email del perfil persistido en estado de Zustand, Área 3: Datos en Reposo — Cliente (Zustand / Storage)

### Community 55 - "Command Palette & Search Quick Actions"
Cohesion: 0.33
Nodes (4): react-dom, web-vitals, initWebVitals(), send()

### Community 56 - "find-unused-deps.cjs"
Cohesion: 0.43
Nodes (6): fs, main(), path, readFileSafe(), readRoots(), walk()

### Community 57 - "vercel.json"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, installCommand, outputDirectory, rewrites

### Community 58 - "cleanup-receipts.js Subsystem"
Cohesion: 0.33
Nodes (6): Almacenamiento del JWT de Sesión, Análisis del Flujo de Autenticación, 🟠 SEC-006 — ALTO: Clave ANON de Supabase comprometida en `.env` local, 🟡 SEC-008 — MEDIO: Rate limiting del Login es Client-Side (bypasseable), 🟡 SEC-010 — MEDIO: Takeover de sesión multi-dispositivo sin confirmación MFA, Área 4: Autenticación y Manejo de Tokens JWT

### Community 60 - "Command Palette & Search Quick Actions"
Cohesion: 0.33
Nodes (5): input-otp, InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 61 - "architecture.md"
Cohesion: 0.40
Nodes (3): Antigravity Architect Role Contract, Local-First Architecture Pattern, Virtual Debt Transactions Engine

### Community 62 - "Área 5: IDOR, Inyección y Lógica de Aplicación"
Cohesion: 0.40
Nodes (5): Análisis de Inyección SQL / NoSQL, Análisis de XSS, 🟠 SEC-005 — ALTO: IDOR Potencial en Servicios de Update/Delete, SEC-018 — BAJO: Importación JSON sin límite de tamaño previo al parse, Área 5: IDOR, Inyección y Lógica de Aplicación

### Community 63 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.40
Nodes (5): Análisis del Schema SQL, 🔴 SEC-004 — ALTO: Función `SECURITY DEFINER` sin restricción de invocador, 🔴 SEC-011 — MEDIO: Condición `deleted_at IS NULL` en políticas de tablas sin esa columna, Tablas y Estado de RLS, Área 2: Datos en Reposo — Servidor (RLS y DB)

### Community 64 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.40
Nodes (5): Headers de Seguridad — Netlify, 🟠 SEC-003 — ALTO: CORS Wildcard en Edge Function sin Autenticación de Llamante, 🟡 SEC-007 — MEDIO: URLs de Recibos en Storage No Firmadas (Públicas), SEC-016 — BAJO: Datos sensibles en logs de consola, Área 6: Seguridad de la Plataforma y Configuración

### Community 65 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.40
Nodes (5): 🟠 PRIORIDAD 2: Altos (Semana 2), SEC-003 — Asegurar la Edge Function send-reminders, SEC-004 — Restringir SECURITY DEFINER a llamadas autenticadas, SEC-005 — Añadir filtro `user_id` en operaciones de servicio, SEC-006 — Rotación de claves Supabase

### Community 66 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.40
Nodes (5): 🟡 PRIORIDAD 3: Medios (Semana 3-4), SEC-007 — URLs firmadas para recibos, SEC-009 — Reemplazar djb2 por SHA-256 en audit logger, SEC-011 — Corregir columnas `deleted_at` faltantes en esquema, SEC-012 — Restringir validación de localhost a paths y puertos conocidos

### Community 67 - "dependabot.yml Subsystem"
Cohesion: 0.40
Nodes (4): @radix-ui/react-tabs, TabsContent, TabsList, TabsTrigger

### Community 68 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.60
Nodes (4): exists(), main(), path, usage()

### Community 69 - "ci.yml Subsystem"
Cohesion: 0.60
Nodes (4): exists(), main(), path, usage()

### Community 70 - "dependabot-auto-merge.yml Subsystem"
Cohesion: 0.60
Nodes (3): idx_push_subs_endpoint, idx_push_subs_user_id, public.push_subscriptions

### Community 73 - "robots.txt Subsystem"
Cohesion: 0.50
Nodes (3): next-themes, Toaster(), ToasterProps

### Community 74 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.67
Nodes (3): @radix-ui/react-scroll-area, ScrollArea, ScrollBar

## Knowledge Gaps
- **31 isolated node(s):** `autoprefixer`, `@capacitor/android`, `cross-env`, `cssnano`, `date-fns` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 542 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `System Architecture & Core Contracts`, `Autonomous Notification & Scheduling Engine`, `Session Lifecycle & Device Management`, `Cloud Sync & Offline State Engine`, `Navigation Shell & Responsive Drawers`, `Autonomous Notification & Scheduling Engine`, `Core Dependencies & Third-Party Packages`, `Autonomous Notification & Scheduling Engine`, `Supabase Authentication & Security Context`, `Autonomous Notification & Scheduling Engine`, `Schema Validation & Domain Rules`, `carousel.tsx`, `form.tsx`, `Core Dependencies & Third-Party Packages`, `Android Native Integration & Build Pipeline`, `Android Native Integration & Build Pipeline`, `FolderChips.tsx`, `Core Dependencies & Third-Party Packages`, `navigation-menu.tsx`, `Command Palette & Search Quick Actions`, `dependabot.yml Subsystem`, `Autonomous Notification & Scheduling Engine`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **What connects `autoprefixer`, `@capacitor/android`, `cross-env` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `System Architecture & Core Contracts` be split into smaller, more focused modules?**
  _Cohesion score 0.07021276595744681 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Session Lifecycle & Device Management` to `System Architecture & Core Contracts`, `Autonomous Notification & Scheduling Engine`, `cn`, `Autonomous Notification & Scheduling Engine`, `Cloud Sync & Offline State Engine`, `Navigation Shell & Responsive Drawers`, `Savings Goals & Folder Organization`, `Interactive Toast Notification System`, `Autonomous Notification & Scheduling Engine`, `Core Dependencies & Third-Party Packages`, `sync-engine.ts`, `Debt Management & Loan Tracking`, `Autonomous Notification & Scheduling Engine`, `Build Configuration & Tooling Infrastructure`, `Supabase Authentication & Security Context`, `Autonomous Notification & Scheduling Engine`, `SyncIndicator.tsx`, `Schema Validation & Domain Rules`, `carousel.tsx`, `form.tsx`, `Core Dependencies & Third-Party Packages`, `Android Native Integration & Build Pipeline`, `Android Native Integration & Build Pipeline`, `FolderChips.tsx`, `Core Dependencies & Third-Party Packages`, `navigation-menu.tsx`, `Command Palette & Search Quick Actions`, `dependabot.yml Subsystem`, `Autonomous Notification & Scheduling Engine`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Should `Autonomous Notification & Scheduling Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.0583804143126177 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Core Dependencies & Third-Party Packages` to `Autonomous Notification & Scheduling Engine`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `Autonomous Notification & Scheduling Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.05824175824175824 - nodes in this community are weakly interconnected._