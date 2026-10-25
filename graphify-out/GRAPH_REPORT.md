# Graph Report - builder  (2026-10-24)

## Corpus Check
- 298 files · ~516,098 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 34 file(s) not represented in the graph (top: .xml 14, (none) 7, .toml 4)

## Summary
- 2053 nodes · 6225 edges · 143 communities (88 shown, 55 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 85 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `703c21be`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- migration.ts
- react-router-dom
- Autonomous Notification & Scheduling Engine
- Core Dependencies & Third-Party Packages
- framer.tsx
- Autonomous Notification & Scheduling Engine
- ui-version-deudas-metas.test.tsx
- sync-engine.ts
- App.tsx
- Navigation Shell & Responsive Drawers
- GoalFolder
- Build Configuration & Tooling Infrastructure
- encrypted-storage.ts
- useNotificationScheduler.ts
- Interactive Toast Notification System
- Autonomous Notification & Scheduling Engine
- react
- useFinanceData.ts
- Account
- Brand Identity & Accent Palettes
- Debt Management & Loan Tracking
- Navigation Shell & Responsive Drawers
- Autonomous Notification & Scheduling Engine
- architecture.md
- Build Configuration & Tooling Infrastructure
- Supabase Authentication & Security Context
- LoginClassic.tsx
- LoginV2.tsx
- Button
- AppError
- Core Dependencies & Third-Party Packages
- Schema Validation & Domain Rules
- App Version Check & Update Toast
- Session Lifecycle & Device Management
- Savings Goals & Folder Organization
- ui-version-navigation.test.tsx
- Build Configuration & Tooling Infrastructure
- chart.tsx
- Transaction
- Core Dependencies & Third-Party Packages
- useReceiptMutations.ts
- 📐 Arquitectura & Plan Maestro: Rediseño Integral Finance Pal v2 (Sprint 6: Vistas Secundarias, Pulido Final & Accesibilidad)
- 🔐 Auditoría de Seguridad y Privacidad — Finance Pal
- Core Dependencies & Third-Party Packages
- find-unused-deps.cjs
- Android Native Integration & Build Pipeline
- useAccountMutations.ts
- ui-version-secondary.test.tsx
- Build Configuration & Tooling Infrastructure
- Core Dependencies & Third-Party Packages
- AppShell.tsx
- Área 3: Datos en Reposo — Cliente (Zustand / Storage)
- sync-store.ts
- scroll-area.tsx
- finance.ts
- Command Palette & Search Quick Actions
- 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity (`03_ANTIGRAVITY_REVIEW.md`)
- Directivas Principales
- Área 4: Autenticación y Manejo de Tokens JWT
- Command Palette & Search Quick Actions
- 🛠️ Registro de Ejecución y Checkpoints: Constructor CLI (`02_OPENCODE_TASKS.md`)
- useFinance
- Login.tsx
- audit-logger.ts
- 📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA]
- Build Configuration & Tooling Infrastructure
- dependabot.yml Subsystem
- Build Configuration & Tooling Infrastructure
- ci.yml Subsystem
- dependabot-auto-merge.yml Subsystem
- index.html Subsystem
- PENTEST_CHECKLIST.md Subsystem
- robots.txt Subsystem
- 🧭 Re-auditoría Integral v2 — 2026-10 — Finance Pal v1.19.38
- cleanup-receipts.cjs
- Área 6: Seguridad de la Plataforma y Configuración
- mfa-auth.test.ts
- cleanup-receipts.js
- input-otp.tsx
- 📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA]
- ref_path
- MainActivity
- 📜 Protocolo Operativo Multi-Agente: Antigravity ↔ OpenCode
- 🛠️ Registro de Ejecución y Checkpoints: OpenCode CLI
- sheet.tsx
- ui-version-movimientos.test.tsx
- HistorialV2.tsx
- ⚡ Guía Paso a Paso: Ciclo Completo de una Tarea
- 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI
- finance-store.ts
- validators.test.ts
- 12.11 Verificación de cierre y limitaciones
- 🟢 PRIORIDAD 4: Bajos (Backlog)
- Plan de Mitigación Accionable
- ZAP Scanning Report
- Área 5: IDOR, Inyección y Lógica de Aplicación
- Directivas Principales
- AGENTS.md
- capacitor.config.ts
- Context and Knowledge Protocol (Mandatory for Antigravity & Gemini Agents)
- @radix-ui/react-aspect-ratio
- SyncIndicator.tsx
- 2. `F3.2` — OAuth, PKCE, redirects y callback (`T10`, `SEC-012`)
- 🧪 Evidencia F0 — Preparación, Estructura y Verificación de Entorno
- @radix-ui/react-collapsible
- MockResizeObserver
- vitest
- [ Cross-Origin-Opener-Policy Header Missing or Invalid ](https://www.zaproxy.org/docs/alerts/90004/)
- vitest

## God Nodes (most connected - your core abstractions)
1. `cn()` - 261 edges
2. `react` - 115 edges
3. `useFinance` - 99 edges
4. `useFinanceData()` - 95 edges
5. `Button` - 79 edges
6. `lucide-react` - 73 edges
7. `AppError` - 62 edges
8. `Input` - 44 edges
9. `Label` - 43 edges
10. `vitest` - 39 edges

## Surprising Connections (you probably didn't know these)
- `12.1 Dictamen ejecutivo` --references--> `MainActivity`  [INFERRED]
  .agent/security_audit.md → android/app/src/main/java/app/financepal/com/MainActivity.java
- `Directivas Principales` --references--> `useFinanceData()`  [INFERRED]
  .agent/workflow/prompts/01_antigravity_architect.prompt.md → src/hooks/useFinanceData.ts
- `Directivas Principales` --references--> `useFinanceData()`  [INFERRED]
  .agent/workflow/prompts/02_opencode_builder.prompt.md → src/hooks/useFinanceData.ts
- `5. Reglas Invariables de Seguridad y Arquitectura` --references--> `useFinanceData()`  [INFERRED]
  .agent/workflow/protocol.md → src/hooks/useFinanceData.ts
- `Fase 1: Planificación Arquitectónica` --references--> `useFinanceData()`  [INFERRED]
  .agent/workflow/protocol.md → src/hooks/useFinanceData.ts

## Import Cycles
- None detected.

## Communities (143 total, 55 thin omitted)

### Community 0 - "migration.ts"
Cohesion: 0.12
Nodes (27): Props, State, Card, CardContent, CardHeader, CardTitle, Progress, migrateLocalDataToSupabase() (+19 more)

### Community 1 - "react-router-dom"
Cohesion: 0.19
Nodes (12): react-router-dom, BottomNav, BrandLogo, DesktopSidebar, DesktopSidebarV2, PRIMARY_NAV, SECONDARY_NAV, NavItem (+4 more)

### Community 2 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.03
Nodes (68): dependencies, @capacitor/app, @capacitor/browser, @capacitor/core, @capacitor/filesystem, @capacitor/local-notifications, @capacitor/network, @capacitor/push-notifications (+60 more)

### Community 3 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.06
Nodes (47): @radix-ui/react-accordion, @radix-ui/react-context-menu, @radix-ui/react-menubar, @radix-ui/react-tabs, react-resizable-panels, AccordionContent, AccordionItem, AccordionTrigger (+39 more)

### Community 4 - "framer.tsx"
Cohesion: 0.14
Nodes (9): Finance Pal Core Product Spec, BrandLogoProps, SIZE_MAP, UIVersion, AnyProps, fallback, make(), motion (+1 more)

### Community 5 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.04
Nodes (48): name, private, type, version, autoprefixer, @capacitor/android, @capacitor/app, @capacitor/share (+40 more)

### Community 6 - "ui-version-deudas-metas.test.tsx"
Cohesion: 0.13
Nodes (14): debtPaymentSchema, mockAddDebt, mockAddDebtPayment, mockAddGoal, mockAddGoalFolder, mockContributeGoal, mockRemoveDebt, mockRemoveDebtPayment (+6 more)

### Community 7 - "sync-engine.ts"
Cohesion: 0.16
Nodes (15): logger, abortControllers, ALLOWED_TABLES, getUserLock(), processingLocks, processSyncQueue(), setAbortController(), setUserLock() (+7 more)

### Community 8 - "App.tsx"
Cohesion: 0.06
Nodes (48): next-themes, react-dom, web-vitals, Ajustes, AnimatedRoutes(), Anual, App(), AuthCallback (+40 more)

### Community 9 - "Navigation Shell & Responsive Drawers"
Cohesion: 0.07
Nodes (29): Separator, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel (+21 more)

### Community 10 - "GoalFolder"
Cohesion: 0.12
Nodes (21): @radix-ui/react-dropdown-menu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut() (+13 more)

### Community 11 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.06
Nodes (33): devDependencies, autoprefixer, @capacitor/android, @capacitor/cli, cross-env, cssnano, eslint, @eslint/js (+25 more)

### Community 12 - "encrypted-storage.ts"
Cohesion: 0.09
Nodes (46): ALL_ENCRYPTED_STATE_KEYS, base64ToBytes(), bytesToBase64(), clearAllReceipts(), clearDevicePeppers(), clearEncryptedState(), clearKeyCache(), decryptData() (+38 more)

### Community 13 - "useNotificationScheduler.ts"
Cohesion: 0.22
Nodes (16): isRecentlyDismissed(), NotificationPermissionPrompt(), listeners, notifySchedulerListeners(), SharedSchedulerState, sharedState, useNotificationScheduler(), NotificationPermissionState (+8 more)

### Community 14 - "Interactive Toast Notification System"
Cohesion: 0.12
Nodes (25): @radix-ui/react-toast, Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle (+17 more)

### Community 15 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.06
Nodes (30): zod, AccountType, ChangeAction, ChangeEntity, Frequency, ItemType, Priority, accountTypeSchema (+22 more)

### Community 16 - "react"
Cohesion: 0.07
Nodes (25): @radix-ui/react-avatar, @radix-ui/react-hover-card, @radix-ui/react-popover, @radix-ui/react-radio-group, @radix-ui/react-scroll-area, react, StatPill, NavLink (+17 more)

### Community 17 - "useFinanceData.ts"
Cohesion: 0.14
Nodes (21): Vistas de Seguridad (Column-Level Security), @supabase/supabase-js, @tanstack/react-query, DataConflictDialog(), Props, AuthContext, AuthContextType, useAuth() (+13 more)

### Community 18 - "Account"
Cohesion: 0.20
Nodes (21): zustand, extractReceiptsToIndexedDB(), saveReceipt(), Account, ChangeLogEntry, diffFields(), generateSecureId(), logEntry() (+13 more)

### Community 19 - "Brand Identity & Accent Palettes"
Cohesion: 0.10
Nodes (22): @radix-ui/react-alert-dialog, react-day-picker, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader() (+14 more)

### Community 20 - "Debt Management & Loan Tracking"
Cohesion: 0.20
Nodes (19): AddDebtPaymentInput, DebtMutations, isOffline(), RemoveDebtPaymentInput, useDebtMutations(), Debt, DebtPayment, DebtInsertPayload (+11 more)

### Community 21 - "Navigation Shell & Responsive Drawers"
Cohesion: 0.30
Nodes (13): cmdk, CommandPalette, CommandPaletteProps, Command, CommandDialog(), CommandDialogProps, CommandEmpty, CommandGroup (+5 more)

### Community 22 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.15
Nodes (30): CloudSyncMutations, useCloudSyncMutations(), scheduledInFlightKeys, UiSelection, NotificationPreferences, ThemeMode, UserProfile, isSupabaseEnabled (+22 more)

### Community 23 - "architecture.md"
Cohesion: 0.40
Nodes (3): Antigravity Architect Role Contract, Local-First Architecture Pattern, Virtual Debt Transactions Engine

### Community 24 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 25 - "Supabase Authentication & Security Context"
Cohesion: 0.20
Nodes (11): class-variance-authority, @radix-ui/react-toggle, @radix-ui/react-toggle-group, Badge(), BadgeProps, badgeVariants, ToggleGroup, ToggleGroupContext (+3 more)

### Community 26 - "LoginClassic.tsx"
Cohesion: 0.21
Nodes (15): @capacitor/browser, AnimatedBackground(), calculatePasswordStrength(), checkAuthRateLimit(), DEV_REDIRECT_PORTS, FloatingParticles(), getSafeAuthError(), getValidatedRedirectUri() (+7 more)

### Community 27 - "LoginV2.tsx"
Cohesion: 0.24
Nodes (13): @capacitor/core, calculatePasswordStrength(), checkAuthRateLimit(), DEV_REDIRECT_PORTS, getSafeAuthError(), getValidatedRedirectUri(), isValidRedirectUri(), NATIVE_REDIRECT_URIS (+5 more)

### Community 28 - "Button"
Cohesion: 0.06
Nodes (135): Sprint 6 — Vistas Secundarias, Pulido Final & Accesibilidad, 2. ✅ Elementos Revisados (Sprint 5), lucide-react, react-easy-crop, sonner, AccessibilitySettings, ElegantConfirm(), ElegantConfirmProps (+127 more)

### Community 29 - "AppError"
Cohesion: 0.12
Nodes (26): isOffline(), useGoalFolderMutations(), useFixedItemsQuery(), useGoalFoldersQuery(), useGoalsQuery(), AppError, ErrorCode, ErrorCodes (+18 more)

### Community 30 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.11
Nodes (18): scripts, analyze, android:build:release, android:build:release:win, android:copy, browserslist:update-db, build, build:dev (+10 more)

### Community 31 - "Schema Validation & Domain Rules"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 32 - "App Version Check & Update Toast"
Cohesion: 0.28
Nodes (13): FixedItemMutations, isOffline(), useFixedItemMutations(), FixedItem, deleteFixedItem(), FixedItemInsertPayload, FixedItemRow, FixedItemUpdatePayload (+5 more)

### Community 33 - "Session Lifecycle & Device Management"
Cohesion: 0.18
Nodes (11): corsHeaders, daysBetween(), DEFAULT_PREFS, getNextFixedDueDates(), isDateInQuietHours(), isFixedActiveInMonth(), parseDateSafe(), parseTimeHHMM() (+3 more)

### Community 34 - "Savings Goals & Folder Organization"
Cohesion: 0.17
Nodes (19): ContributeToGoalInput, GoalMutations, isOffline(), useGoalMutations(), Goal, GoalCompactCardProps, GoalDetailContentProps, GoalFormProps (+11 more)

### Community 35 - "ui-version-navigation.test.tsx"
Cohesion: 0.22
Nodes (7): BottomNavV2, NAV_ITEMS_V2, QuickTxModalState, useQuickTxModal, mockAddTransaction, mockAddTx, MockResizeObserver

### Community 36 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 37 - "chart.tsx"
Cohesion: 0.18
Nodes (12): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+4 more)

### Community 38 - "Transaction"
Cohesion: 0.29
Nodes (12): isOffline(), TransactionMutations, useTransactionMutations(), Transaction, deleteTransaction(), insertTransaction(), toInsertPayload(), toUpdatePayload() (+4 more)

### Community 39 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.17
Nodes (14): embla-carousel-react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+6 more)

### Community 40 - "useReceiptMutations.ts"
Cohesion: 0.30
Nodes (10): DeleteReceiptForTransactionInput, ReceiptMutations, UploadReceiptForTransactionInput, useReceiptMutations(), dataUrlToBlob(), deleteReceipt(), getReceiptSignedUrl(), ReceiptUploadInput (+2 more)

### Community 41 - "📐 Arquitectura & Plan Maestro: Rediseño Integral Finance Pal v2 (Sprint 6: Vistas Secundarias, Pulido Final & Accesibilidad)"
Cohesion: 0.29
Nodes (6): 1. Resumen Ejecutivo del Sprint 6, 2. Razonamiento de Diseño Obligatorio (`frontend-ui-craft`), 3. Mapa de Archivos e Impacto (Sprint 6), 4. Tareas Secuenciales para el Constructor (Fase 2), 📐 Arquitectura & Plan Maestro: Rediseño Integral Finance Pal v2 (Sprint 6: Vistas Secundarias, Pulido Final & Accesibilidad), Requerimiento Fundamental de Rendimiento

### Community 42 - "🔐 Auditoría de Seguridad y Privacidad — Finance Pal"
Cohesion: 0.22
Nodes (8): Análisis del Cliente Supabase, 🔐 Auditoría de Seguridad y Privacidad — Finance Pal, Controles de Seguridad Positivos Detectados, Matriz de Riesgo Residual, Resumen de Hallazgos por Severidad, Resumen Ejecutivo, Tabla de Contenidos, Área 1: Datos en Tránsito

### Community 43 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.10
Nodes (20): @radix-ui/react-label, @radix-ui/react-slot, react-hook-form, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList (+12 more)

### Community 44 - "find-unused-deps.cjs"
Cohesion: 0.43
Nodes (6): fs, main(), path, readFileSafe(), readRoots(), walk()

### Community 46 - "useAccountMutations.ts"
Cohesion: 0.27
Nodes (11): AccountMutations, isOffline(), useAccountMutations(), AccountInsertPayload, AccountRow, AccountUpdatePayload, deleteAccount(), insertAccount() (+3 more)

### Community 47 - "ui-version-secondary.test.tsx"
Cohesion: 0.13
Nodes (9): mockAuthState, mockCheckMfaStatus, mockClearChangeLog, mockRefreshSession, MockResizeObserver, mockSetActive, mockSignOut, mockState (+1 more)

### Community 48 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

### Community 49 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.28
Nodes (8): @radix-ui/react-navigation-menu, NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 50 - "AppShell.tsx"
Cohesion: 0.20
Nodes (12): applyAccentVars(), AppShell(), SWIPE_ROUTES, DesignCompareToggle, SplashScreen, ACCENT_PALETTES, ACCENT_PALETTES_V2, AccentColor (+4 more)

### Community 51 - "Área 3: Datos en Reposo — Cliente (Zustand / Storage)"
Cohesion: 0.29
Nodes (7): Análisis del Audit Logger (IndexedDB), Análisis del IndexedDB (Recibos), 🔴 SEC-001 — CRÍTICO: Estado Zustand persistido en TEXTO PLANO en localStorage como almacenamiento PRIMARIO, 🔴 SEC-002 — CRÍTICO: La clave de cifrado AES-GCM se deriva de un secreto almacenado en texto plano en localStorage, 🟡 SEC-009 — MEDIO: Hash de audit log usa djb2 (hash de 32 bits, no criptográfico), SEC-015 — BAJO: Email del perfil persistido en estado de Zustand, Área 3: Datos en Reposo — Cliente (Zustand / Storage)

### Community 52 - "sync-store.ts"
Cohesion: 0.33
Nodes (4): encryptedStorage, SyncActionType, SyncMutation, SyncState

### Community 53 - "scroll-area.tsx"
Cohesion: 0.20
Nodes (19): accounts, debt_payments, debts, fixed_items, goal_folders, goals, idx_fixed_items_user_active, idx_goal_folders_parent_id (+11 more)

### Community 54 - "finance.ts"
Cohesion: 0.05
Nodes (100): @capacitor/local-notifications, @capacitor/push-notifications, AnualV2, CATEGORY_COLORS, MonthRow, Tab, YoyBadge(), YoyTile() (+92 more)

### Community 55 - "Command Palette & Search Quick Actions"
Cohesion: 0.18
Nodes (10): buildCommand, builder/*, redesign/*, framework, git, deploymentEnabled, headers, installCommand (+2 more)

### Community 56 - "🔍 Registro de Revisión, Auditoría y Cierre: Antigravity (`03_ANTIGRAVITY_REVIEW.md`)"
Cohesion: 0.40
Nodes (4): 1. Panel de Control, 3. 🛠️ Correcciones y Endurecimiento de Revisión, 4. Verificación de Criterios de Aceptación (Sign-off), 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity (`03_ANTIGRAVITY_REVIEW.md`)

### Community 58 - "Área 4: Autenticación y Manejo de Tokens JWT"
Cohesion: 0.29
Nodes (7): Almacenamiento del JWT de Sesión, Análisis del Flujo de Autenticación, 🟠 SEC-006 — ALTO: Clave ANON de Supabase comprometida en `.env` local, 🟡 SEC-008 — MEDIO: Rate limiting del Login es Client-Side (bypasseable), 🟡 SEC-010 — MEDIO: Takeover de sesión multi-dispositivo sin confirmación MFA, 🟡 SEC-012 — MEDIO: `isValidRedirectUri` permite cualquier `localhost`, Área 4: Autenticación y Manejo de Tokens JWT

### Community 61 - "🛠️ Registro de Ejecución y Checkpoints: Constructor CLI (`02_OPENCODE_TASKS.md`)"
Cohesion: 0.29
Nodes (6): 1. Panel de Control de Progreso (Progress Dashboard), 2. Lista de Tareas Detallada y Estado de Ejecución, 3. ⚠️ Registro de Bloqueos, Fallos y Dificultades (Escalation Log), 4. Registro Histórico de Checkpoints (Commits en Worktree Builder), 5. Resumen de Entrega de Fase 2 (Construcción Concluida), 🛠️ Registro de Ejecución y Checkpoints: Constructor CLI (`02_OPENCODE_TASKS.md`)

### Community 62 - "useFinance"
Cohesion: 0.27
Nodes (25): inSet(), isBool(), isNum(), isObj(), isStr(), isValidUUID(), migrateImported(), normalizeImportKeys() (+17 more)

### Community 63 - "Login.tsx"
Cohesion: 0.18
Nodes (8): checkHibpPwnedPassword(), createRateLimitedFunction(), getClientIdentifier(), RateLimitConfig, rateLimiter, RateLimitInfo, validatePasswordStrength(), withRateLimit()

### Community 64 - "audit-logger.ts"
Cohesion: 0.22
Nodes (18): 12.10 Certificación del Sprint de Remediación P0 (`v1.21.1-p0-remediation` — 2026-10-20), audit, AuditAction, AuditEntry, clearAuditLogs(), computeHash(), exportAuditLogs(), GENESIS_HASH (+10 more)

### Community 65 - "📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA]"
Cohesion: 0.06
Nodes (17): @testing-library/jest-dom, cloneValue(), compareKeys(), FakeCursor, FakeDatabase, FakeIDBFactory, FakeIDBKeyRange, FakeIndex (+9 more)

### Community 75 - "🧭 Re-auditoría Integral v2 — 2026-10 — Finance Pal v1.19.38"
Cohesion: 0.14
Nodes (13): 12.10 Estado de producción y desfase de esquema, 12.1 Dictamen ejecutivo, 12.2 Cobertura ejecutada, 12.3.1 Ítems planificados (`SEC-*` + `NEW-*`), 12.3.2 Hallazgos nuevos materiales (`F2`–`F10`), 12.3 Resumen de hallazgos, 12.4 Hallazgos previos (`SEC-001`–`SEC-021`), 12.5 Hipótesis nuevas (`NEW-01`–`NEW-12`) (+5 more)

### Community 76 - "cleanup-receipts.cjs"
Cohesion: 0.60
Nodes (4): exists(), main(), path, usage()

### Community 101 - "Área 6: Seguridad de la Plataforma y Configuración"
Cohesion: 0.40
Nodes (5): Headers de Seguridad — Netlify, 🟠 SEC-003 — ALTO: CORS Wildcard en Edge Function sin Autenticación de Llamante, 🟡 SEC-007 — MEDIO: URLs de Recibos en Storage No Firmadas (Públicas), SEC-016 — BAJO: Datos sensibles en logs de consola, Área 6: Seguridad de la Plataforma y Configuración

### Community 103 - "cleanup-receipts.js"
Cohesion: 0.60
Nodes (4): exists(), main(), path, usage()

### Community 104 - "input-otp.tsx"
Cohesion: 0.33
Nodes (5): input-otp, InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 105 - "📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA]"
Cohesion: 0.15
Nodes (12): 1. Resumen Ejecutivo y Objetivos, 2. Alineación Arquitectónica (Finance Pal Local-First), 3. Mapa de Archivos e Impacto, 4. Tipos, Interfaces y Contratos de Datos, 5. Plan de Ejecución Secuencial para OpenCode CLI (DeepSeek 4.1 Flash), 6. Criterios de Aceptación y Checklist de Calidad, 7. Protocolo de Traspaso a OpenCode, 📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA] (+4 more)

### Community 106 - "ref_path"
Cohesion: 0.11
Nodes (13): lovable-tagger, rollup-plugin-visualizer, sharp, vite, @vitejs/plugin-react-swc, __dirname, __filename, INDEX_HTML_PATH (+5 more)

### Community 108 - "📜 Protocolo Operativo Multi-Agente: Antigravity ↔ OpenCode"
Cohesion: 0.17
Nodes (11): 1. Declaración de Agentes y Modelos Autorizados, 2. Máquina de Estados del Ciclo de Vida, 3. Especificación de Fases y Archivos de Registro, 4. Estrategia de Git Worktree (Aislamiento de Entorno), 5. Reglas Invariables de Seguridad y Arquitectura, Comandos de Gestión:, Esquema de Directorios:, Fase 1: Planificación Arquitectónica (+3 more)

### Community 109 - "🛠️ Registro de Ejecución y Checkpoints: OpenCode CLI"
Cohesion: 0.18
Nodes (10): 1. Panel de Control de Progreso (Progress Dashboard), 2. Lista de Tareas Detallada y Estado de Ejecución, 3. ⚠️ Registro de Bloqueos, Fallos y Dificultades (Escalation Log), 4. Registro Histórico de Checkpoints (Commits), 5. Resumen de Entrega para Antigravity Reviewer, Fase A: Tipado y Modelado de Datos, Fase B: Capa de Servicios y Estado, Fase C: Componentes UI (+2 more)

### Community 110 - "sheet.tsx"
Cohesion: 0.22
Nodes (10): @radix-ui/react-dialog, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle (+2 more)

### Community 111 - "ui-version-movimientos.test.tsx"
Cohesion: 0.17
Nodes (8): mockAddTx, mockRemoveDebt, mockRemoveDebtPayment, mockRemoveTx, MockResizeObserver, mockSetSyncFiltersToURL, mockState, mockUpdateTx

### Community 112 - "HistorialV2.tsx"
Cohesion: 0.27
Nodes (9): State Synchronization Facade, Autonomous Notification Scheduler Engine, ACTION_CONFIG, ENTITY_CONFIG, fmtVal(), getDayHeader(), HistorialV2, useFinanceData() (+1 more)

### Community 114 - "⚡ Guía Paso a Paso: Ciclo Completo de una Tarea"
Cohesion: 0.25
Nodes (8): 🛠️ Comandos Rápidos, 📁 Estructura del Directorio `.agent/workflow/`, 🔄 Flujo de Trabajo Colaborativo: Antigravity ↔ OpenCode, ⚡ Guía Paso a Paso: Ciclo Completo de una Tarea, Paso 1: Planificación (Antigravity CLI — Gemini 3.8 Flash / Argon 4), Paso 2: Configuración del Worktree & Construcción (OpenCode CLI — DeepSeek 4.1 Flash), Paso 3: Revisión y Cierre (Antigravity CLI — Gemini 3.8 Flash / Argon 4), Paso 4: Limpieza y Merge

### Community 115 - "🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI"
Cohesion: 0.22
Nodes (8): 1. Panel de Control de la Revisión, 2. 🔍 Cosas que se están revisando actualmente (In Progress), 3. ✅ Cosas que ya se revisaron (Audited & Closed), 4. ⏳ Cosas que se van a revisar (Backlog de Revisión), 5. 🛠️ Tareas y Lógica Completadas por Antigravity (Lo que quedó pendiente), 6. Verificación de Criterios de Aceptación (Sign-off), 7. Dictamen Final y Recomendación de Fusión (Merge), 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI

### Community 116 - "finance-store.ts"
Cohesion: 0.12
Nodes (24): @capacitor/filesystem, AccentColor, AccessibilitySettings, AppSettings, Currency, DEFAULT_ACCESSIBILITY_SETTINGS, DEFAULT_NOTIFICATION_PREFS, SCHEMA_VERSION (+16 more)

### Community 117 - "validators.test.ts"
Cohesion: 0.40
Nodes (4): accountSchema, sanitizeForLog(), transactionSchema, validateEntity()

### Community 118 - "12.11 Verificación de cierre y limitaciones"
Cohesion: 0.40
Nodes (5): 12.11.1 Cero cambios en código fuente, 12.11.2 Escaneo de secretos, 12.11.3 Limitaciones, 12.11.4 Firma de cierre, 12.11 Verificación de cierre y limitaciones

### Community 119 - "🟢 PRIORIDAD 4: Bajos (Backlog)"
Cohesion: 0.50
Nodes (4): 🟢 PRIORIDAD 4: Bajos (Backlog), SEC-014 — Añadir headers COOP/COEP al netlify.toml, SEC-015 — Excluir email del estado persistido, SEC-018 — Límite de tamaño en importación JSON

### Community 120 - "Plan de Mitigación Accionable"
Cohesion: 0.14
Nodes (14): Plan de Mitigación Accionable, 🔴 PRIORIDAD 1: Críticos (Semana 1), 🟠 PRIORIDAD 2: Altos (Semana 2), 🟡 PRIORIDAD 3: Medios (Semana 3-4), SEC-001 — Inmediato: Borrar texto plano de localStorage existente, SEC-001 y SEC-002 — Rediseño del modelo de persistencia cifrada, SEC-003 — Asegurar la Edge Function send-reminders, SEC-004 — Restringir SECURITY DEFINER a llamadas autenticadas (+6 more)

### Community 121 - "ZAP Scanning Report"
Cohesion: 0.46
Nodes (7): cmd_create(), cmd_list(), cmd_remove(), cmd_status(), cmd_sync(), worktree-manager.sh script, show_help()

### Community 122 - "Área 5: IDOR, Inyección y Lógica de Aplicación"
Cohesion: 0.40
Nodes (5): Análisis de Inyección SQL / NoSQL, Análisis de XSS, 🟠 SEC-005 — ALTO: IDOR Potencial en Servicios de Update/Delete, SEC-018 — BAJO: Importación JSON sin límite de tamaño previo al parse, Área 5: IDOR, Inyección y Lógica de Aplicación

### Community 128 - "SyncIndicator.tsx"
Cohesion: 0.40
Nodes (5): Análisis del Schema SQL, 🔴 SEC-004 — ALTO: Función `SECURITY DEFINER` sin restricción de invocador, 🔴 SEC-011 — MEDIO: Condición `deleted_at IS NULL` en políticas de tablas sin esa columna, Tablas y Estado de RLS, Área 2: Datos en Reposo — Servidor (RLS y DB)

### Community 129 - "2. `F3.2` — OAuth, PKCE, redirects y callback (`T10`, `SEC-012`)"
Cohesion: 0.67
Nodes (5): cmd_next(), cmd_prompt(), cmd_status(), handoff.sh script, show_help()

### Community 130 - "🧪 Evidencia F0 — Preparación, Estructura y Verificación de Entorno"
Cohesion: 0.47
Nodes (3): idx_push_subs_endpoint, idx_push_subs_user_id, public.push_subscriptions

### Community 146 - "vitest"
Cohesion: 0.11
Nodes (7): @testing-library/react, vitest, queryClient, renderWithProviders(), mockEnsureScheduledTransactions, MockResizeObserver, mockState

### Community 178 - "vitest"
Cohesion: 0.32
Nodes (9): @capacitor/network, DesktopSyncIcon(), isNative, SyncIcon(), SyncIndicator(), SyncState, UploadDots(), useNetwork() (+1 more)

## Knowledge Gaps
- **31 isolated node(s):** `@hookform/resolvers`, `@tanstack/query-sync-storage-persister`, `@types/react-window`, `date-fns`, `framer-motion` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 712 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **55 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `migration.ts`, `react-router-dom`, `Core Dependencies & Third-Party Packages`, `framer.tsx`, `Autonomous Notification & Scheduling Engine`, `App.tsx`, `Navigation Shell & Responsive Drawers`, `GoalFolder`, `useNotificationScheduler.ts`, `Interactive Toast Notification System`, `useFinanceData.ts`, `Brand Identity & Accent Palettes`, `Navigation Shell & Responsive Drawers`, `Autonomous Notification & Scheduling Engine`, `Supabase Authentication & Security Context`, `LoginClassic.tsx`, `LoginV2.tsx`, `Button`, `ui-version-navigation.test.tsx`, `chart.tsx`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `AppShell.tsx`, `vitest`, `finance.ts`, `input-otp.tsx`, `sheet.tsx`, `HistorialV2.tsx`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `useFinanceData()` (e.g. with `Sprint 6 — Vistas Secundarias, Pulido Final & Accesibilidad` and `Directivas Principales`) actually correct?**
  _`useFinanceData()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@hookform/resolvers`, `@tanstack/query-sync-storage-persister`, `@types/react-window` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `migration.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11932773109243698 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `Core Dependencies & Third-Party Packages` to `migration.ts`, `react-router-dom`, `framer.tsx`, `Navigation Shell & Responsive Drawers`, `GoalFolder`, `Interactive Toast Notification System`, `react`, `Brand Identity & Accent Palettes`, `Navigation Shell & Responsive Drawers`, `Supabase Authentication & Security Context`, `Button`, `ui-version-navigation.test.tsx`, `chart.tsx`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `finance.ts`, `input-otp.tsx`, `sheet.tsx`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Should `Autonomous Notification & Scheduling Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.029411764705882353 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Autonomous Notification & Scheduling Engine` to `Autonomous Notification & Scheduling Engine`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._