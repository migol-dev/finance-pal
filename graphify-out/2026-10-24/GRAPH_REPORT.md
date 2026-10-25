# Graph Report - finance-pal  (2026-10-24)

## Corpus Check
- 283 files · ~495,699 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 33 file(s) not represented in the graph (top: .xml 14, (none) 6, .toml 4)

## Summary
- 1966 nodes · 5725 edges · 135 communities (84 shown, 51 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1c70e5b2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Button
- DashboardV2.tsx
- Autonomous Notification & Scheduling Engine
- Core Dependencies & Third-Party Packages
- notifications.ts
- Autonomous Notification & Scheduling Engine
- finance.ts
- class-variance-authority
- Cloud Sync & Offline State Engine
- Navigation Shell & Responsive Drawers
- QuickTransactionSheet.tsx
- Build Configuration & Tooling Infrastructure
- encrypted-storage.ts
- AppShell.tsx
- Interactive Toast Notification System
- Autonomous Notification & Scheduling Engine
- react
- useFinanceData.ts
- finance-store.ts
- Brand Identity & Accent Palettes
- Debt Management & Loan Tracking
- Navigation Shell & Responsive Drawers
- Autonomous Notification & Scheduling Engine
- app-error.ts
- Build Configuration & Tooling Infrastructure
- Supabase Authentication & Security Context
- version-check.ts
- lucide-react
- Ajustes.tsx
- Savings Goals & Folder Organization
- Core Dependencies & Third-Party Packages
- Schema Validation & Domain Rules
- App Version Check & Update Toast
- Session Lifecycle & Device Management
- Savings Goals & Folder Organization
- ui-version-navigation.test.tsx
- Build Configuration & Tooling Infrastructure
- chart.tsx
- transactions.service.ts
- Core Dependencies & Third-Party Packages
- GoalDetailContent.tsx
- useFinanceData
- 🔐 Auditoría de Seguridad y Privacidad — Finance Pal
- Core Dependencies & Third-Party Packages
- useFinanceData.ts
- Android Native Integration & Build Pipeline
- useAccountMutations.ts
- Login.tsx
- Build Configuration & Tooling Infrastructure
- Core Dependencies & Third-Party Packages
- accent-palette.ts
- Área 3: Datos en Reposo — Cliente (Zustand / Storage)
- sync-store.ts
- scroll-area.tsx
- PillTabs.tsx
- Command Palette & Search Quick Actions
- encrypted-storage.test.ts
- Directivas Principales
- Área 4: Autenticación y Manejo de Tokens JWT
- Command Palette & Search Quick Actions
- 🛠️ Registro de Ejecución y Checkpoints: Constructor CLI (`02_OPENCODE_TASKS.md`)
- 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity (`03_ANTIGRAVITY_REVIEW.md`)
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
- App
- Área 6: Seguridad de la Plataforma y Configuración
- mfa-auth.test.ts
- 🟠 PRIORIDAD 2: Altos (Semana 2)
- 📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA]
- ref_path
- MainActivity
- 📜 Protocolo Operativo Multi-Agente: Antigravity ↔ OpenCode
- 🛠️ Registro de Ejecución y Checkpoints: OpenCode CLI
- sheet.tsx
- ui-version-movimientos.test.tsx
- Directivas Principales
- ⚡ Guía Paso a Paso: Ciclo Completo de una Tarea
- 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI
- framer.tsx
- AGENTS.md
- Plan de Mitigación Accionable
- ZAP Scanning Report
- Área 5: IDOR, Inyección y Lógica de Aplicación
- 🟡 PRIORIDAD 3: Medios (Semana 3-4)
- Context and Knowledge Protocol (Mandatory for Antigravity & Gemini Agents)
- SyncIndicator.tsx
- 2. `F3.2` — OAuth, PKCE, redirects y callback (`T10`, `SEC-012`)
- 🧪 Evidencia F0 — Preparación, Estructura y Verificación de Entorno
- MigracionNube.tsx
- [ Cross-Origin-Opener-Policy Header Missing or Invalid ](https://www.zaproxy.org/docs/alerts/90004/)
- SyncIndicator.tsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 261 edges
2. `react` - 108 edges
3. `useFinance` - 97 edges
4. `useFinanceData()` - 74 edges
5. `Button` - 70 edges
6. `lucide-react` - 67 edges
7. `AppError` - 62 edges
8. `Label` - 38 edges
9. `vitest` - 37 edges
10. `Input` - 37 edges

## Surprising Connections (you probably didn't know these)
- `12.1 Dictamen ejecutivo` --references--> `MainActivity`  [INFERRED]
  .agent/security_audit.md → android/app/src/main/java/app/financepal/com/MainActivity.java
- `2. ✅ Elementos Revisados (Sprint 3)` --references--> `DashboardV2()`  [INFERRED]
  .agent/workflow/03_ANTIGRAVITY_REVIEW.md → src/components/dashboard/DashboardV2.tsx
- `5. Dictamen Final` --references--> `MovimientosV2()`  [INFERRED]
  .agent/workflow/03_ANTIGRAVITY_REVIEW.md → src/components/movimientos/MovimientosV2.tsx
- `4. Verificación de Criterios de Aceptación (Sign-off)` --references--> `useFinanceData()`  [INFERRED]
  .agent/workflow/03_ANTIGRAVITY_REVIEW.md → src/hooks/useFinanceData.ts
- `Directivas Principales` --references--> `useFinanceData()`  [INFERRED]
  .agent/workflow/prompts/01_antigravity_architect.prompt.md → src/hooks/useFinanceData.ts

## Import Cycles
- None detected.

## Communities (135 total, 51 thin omitted)

### Community 0 - "Button"
Cohesion: 0.24
Nodes (28): AccessibilitySettings, IconPicker(), TransactionCreateForm(), TransactionEditForm(), Button, DenominationsEditor(), Input, Label (+20 more)

### Community 1 - "DashboardV2.tsx"
Cohesion: 0.18
Nodes (9): react-router-dom, AppShell(), BottomNav, Dashboard(), Index(), queryClient, mockEnsureScheduledTransactions, MockResizeObserver (+1 more)

### Community 2 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.03
Nodes (68): dependencies, @capacitor/app, @capacitor/browser, @capacitor/core, @capacitor/filesystem, @capacitor/local-notifications, @capacitor/network, @capacitor/push-notifications (+60 more)

### Community 3 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.08
Nodes (41): @radix-ui/react-dropdown-menu, @radix-ui/react-menubar, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator (+33 more)

### Community 4 - "notifications.ts"
Cohesion: 0.07
Nodes (55): @capacitor/local-notifications, @capacitor/push-notifications, isRecentlyDismissed(), NotificationPermissionPrompt(), listeners, notifySchedulerListeners(), SharedSchedulerState, sharedState (+47 more)

### Community 5 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.04
Nodes (46): config, name, private, type, version, autoprefixer, @capacitor/android, @capacitor/app (+38 more)

### Community 6 - "finance.ts"
Cohesion: 0.10
Nodes (31): react-easy-crop, Props, Props, DATE_PRESETS, FILTER_TABS, MovimientoRow, TransactionDetailView(), TxType (+23 more)

### Community 7 - "class-variance-authority"
Cohesion: 0.17
Nodes (14): abortControllers, ALLOWED_TABLES, getUserLock(), processingLocks, processSyncQueue(), setAbortController(), setUserLock(), sleep() (+6 more)

### Community 8 - "Cloud Sync & Offline State Engine"
Cohesion: 0.12
Nodes (26): @tanstack/query-async-storage-persister, Ajustes, AnimatedRoutes(), Anual, App(), AuthCallback, AuthGuard(), containsImplicitTokens() (+18 more)

### Community 9 - "Navigation Shell & Responsive Drawers"
Cohesion: 0.07
Nodes (30): @radix-ui/react-tooltip, Separator, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent (+22 more)

### Community 10 - "QuickTransactionSheet.tsx"
Cohesion: 0.15
Nodes (23): QuickTransactionSheet, Drawer(), DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle (+15 more)

### Community 11 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.06
Nodes (33): devDependencies, autoprefixer, @capacitor/android, @capacitor/cli, cross-env, cssnano, eslint, @eslint/js (+25 more)

### Community 12 - "encrypted-storage.ts"
Cohesion: 0.12
Nodes (31): AuthProvider(), ALL_ENCRYPTED_STATE_KEYS, base64ToBytes(), bytesToBase64(), clearAllReceipts(), clearDevicePeppers(), clearEncryptedState(), clearKeyCache() (+23 more)

### Community 13 - "AppShell.tsx"
Cohesion: 0.23
Nodes (10): BrandLogo, SIZE_MAP, DesktopSidebar, DesktopSidebarV2, PRIMARY_NAV, SECONDARY_NAV, NavItem, navItems (+2 more)

### Community 14 - "Interactive Toast Notification System"
Cohesion: 0.12
Nodes (25): @radix-ui/react-toast, Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle (+17 more)

### Community 15 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.07
Nodes (31): AccountType, ChangeAction, ChangeEntity, accountSchema, accountTypeSchema, changeActionSchema, changeEntitySchema, changeLogEntrySchema (+23 more)

### Community 16 - "react"
Cohesion: 0.04
Nodes (41): clsx, input-otp, @radix-ui/react-accordion, @radix-ui/react-avatar, @radix-ui/react-checkbox, @radix-ui/react-hover-card, @radix-ui/react-popover, @radix-ui/react-radio-group (+33 more)

### Community 17 - "useFinanceData.ts"
Cohesion: 0.13
Nodes (26): Vistas de Seguridad (Column-Level Security), @supabase/supabase-js, @tanstack/react-query, AuthContext, AuthContextType, useAuth(), useAccountsQuery(), useDebtsQuery() (+18 more)

### Community 18 - "finance-store.ts"
Cohesion: 0.06
Nodes (79): Antigravity Architect Role Contract, Local-First Architecture Pattern, Virtual Debt Transactions Engine, @capacitor/filesystem, vitest, zustand, Props, extractReceiptsToIndexedDB() (+71 more)

### Community 19 - "Brand Identity & Accent Palettes"
Cohesion: 0.07
Nodes (31): @radix-ui/react-alert-dialog, @radix-ui/react-slot, react-day-picker, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter() (+23 more)

### Community 20 - "Debt Management & Loan Tracking"
Cohesion: 0.20
Nodes (19): AddDebtPaymentInput, DebtMutations, isOffline(), RemoveDebtPaymentInput, useDebtMutations(), Debt, DebtPayment, DebtInsertPayload (+11 more)

### Community 21 - "Navigation Shell & Responsive Drawers"
Cohesion: 0.30
Nodes (13): cmdk, CommandPalette, CommandPaletteProps, Command, CommandDialog(), CommandDialogProps, CommandEmpty, CommandGroup (+5 more)

### Community 22 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.15
Nodes (29): CloudSyncMutations, useCloudSyncMutations(), scheduledInFlightKeys, UiSelection, NotificationPreferences, ThemeMode, UserProfile, mapAccountFromDb() (+21 more)

### Community 23 - "app-error.ts"
Cohesion: 0.22
Nodes (7): ErrorCode, errorFromUnknown(), ErrorSeverity, LogEntry, LogLevel, logs, showUserError()

### Community 24 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 25 - "Supabase Authentication & Security Context"
Cohesion: 0.14
Nodes (15): class-variance-authority, @radix-ui/react-toggle, @radix-ui/react-toggle-group, Alert, AlertDescription, AlertTitle, alertVariants, Badge() (+7 more)

### Community 26 - "version-check.ts"
Cohesion: 0.20
Nodes (15): UpdateNotification(), check(), UpdateNotificationProps, useUpdateToast(), check(), checkForUpdates(), compareVersions(), dismissVersion() (+7 more)

### Community 27 - "lucide-react"
Cohesion: 0.24
Nodes (23): lucide-react, sonner, ElegantConfirm(), ElegantConfirmProps, DialogContent, DialogContentProps, DialogDescription, DialogHeader() (+15 more)

### Community 28 - "Ajustes.tsx"
Cohesion: 0.14
Nodes (21): @radix-ui/react-switch, Header, Switch, AnimatePresence(), getCurrentVersion(), Ajustes, AjustesHub, AjustesHubProps (+13 more)

### Community 29 - "Savings Goals & Folder Organization"
Cohesion: 0.26
Nodes (12): GoalFolderMutations, isOffline(), useGoalFolderMutations(), deleteGoalFolder(), GoalFolderInsertPayload, GoalFolderRow, GoalFolderUpdatePayload, insertGoalFolder() (+4 more)

### Community 30 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.11
Nodes (18): scripts, analyze, android:build:release, android:build:release:win, android:copy, browserslist:update-db, build, build:dev (+10 more)

### Community 31 - "Schema Validation & Domain Rules"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 32 - "App Version Check & Update Toast"
Cohesion: 0.26
Nodes (12): FixedItemMutations, isOffline(), useFixedItemMutations(), deleteFixedItem(), FixedItemInsertPayload, FixedItemRow, FixedItemUpdatePayload, insertFixedItem() (+4 more)

### Community 33 - "Session Lifecycle & Device Management"
Cohesion: 0.18
Nodes (11): corsHeaders, daysBetween(), DEFAULT_PREFS, getNextFixedDueDates(), isDateInQuietHours(), isFixedActiveInMonth(), parseDateSafe(), parseTimeHHMM() (+3 more)

### Community 34 - "Savings Goals & Folder Organization"
Cohesion: 0.20
Nodes (15): ContributeToGoalInput, GoalMutations, isOffline(), useGoalMutations(), addGoalContribution(), deleteGoal(), GoalContributionInput, GoalContributionRow (+7 more)

### Community 35 - "ui-version-navigation.test.tsx"
Cohesion: 0.22
Nodes (7): BottomNavV2, NAV_ITEMS_V2, QuickTxModalState, useQuickTxModal, mockAddTransaction, mockAddTx, MockResizeObserver

### Community 36 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 37 - "chart.tsx"
Cohesion: 0.22
Nodes (12): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+4 more)

### Community 38 - "transactions.service.ts"
Cohesion: 0.29
Nodes (12): isOffline(), TransactionMutations, useTransactionMutations(), Transaction, deleteTransaction(), insertTransaction(), toInsertPayload(), toUpdatePayload() (+4 more)

### Community 39 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.17
Nodes (14): embla-carousel-react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+6 more)

### Community 40 - "GoalDetailContent.tsx"
Cohesion: 0.20
Nodes (25): Series, SimpleAreaChart(), Slider, actualGoalAt(), daysBetween(), expectedGoalAt(), fmt2(), fmtDate() (+17 more)

### Community 41 - "useFinanceData"
Cohesion: 0.12
Nodes (40): State Synchronization Facade, 1. Resumen Ejecutivo del Sprint 4, 2. Razonamiento de Diseño Obligatorio (`frontend-ui-craft`), 3. Mapa de Archivos e Impacto (Sprint 4), 4. Tareas Secuenciales para el Constructor (Fase 2), 📐 Arquitectura & Plan Maestro: Rediseño Integral Finance Pal v2 (Sprint 4: Movimientos y Transacciones v2 — Warm Editorial Wealth & Master-Detail), Sprint 4 — Movimientos y Transacciones v2 (`MovimientosV2`), Autonomous Notification Scheduler Engine (+32 more)

### Community 42 - "🔐 Auditoría de Seguridad y Privacidad — Finance Pal"
Cohesion: 0.25
Nodes (7): Análisis del Cliente Supabase, 🔐 Auditoría de Seguridad y Privacidad — Finance Pal, Controles de Seguridad Positivos Detectados, Matriz de Riesgo Residual, Resumen Ejecutivo, Tabla de Contenidos, Área 1: Datos en Tránsito

### Community 43 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.19
Nodes (12): @radix-ui/react-label, react-hook-form, FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext (+4 more)

### Community 44 - "useFinanceData.ts"
Cohesion: 0.22
Nodes (13): DeleteReceiptForTransactionInput, ReceiptMutations, UploadReceiptForTransactionInput, useReceiptMutations(), useGoalsQuery(), AppError, fetchGoals(), dataUrlToBlob() (+5 more)

### Community 46 - "useAccountMutations.ts"
Cohesion: 0.24
Nodes (12): AccountMutations, isOffline(), useAccountMutations(), ErrorCodes, AccountInsertPayload, AccountRow, AccountUpdatePayload, deleteAccount() (+4 more)

### Community 47 - "Login.tsx"
Cohesion: 0.15
Nodes (19): Resumen de Hallazgos por Severidad, 🟡 SEC-012 — MEDIO: `isValidRedirectUri` permite cualquier `localhost`, @capacitor/browser, @radix-ui/react-progress, Progress, AnimatedBackground(), calculatePasswordStrength(), checkAuthRateLimit() (+11 more)

### Community 48 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

### Community 49 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.28
Nodes (8): @radix-ui/react-navigation-menu, NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 50 - "accent-palette.ts"
Cohesion: 0.27
Nodes (9): applyAccentVars(), SWIPE_ROUTES, BrandLogoProps, ACCENT_PALETTES, ACCENT_PALETTES_V2, AccentColor, AccentPalette, getAccentPalette() (+1 more)

### Community 51 - "Área 3: Datos en Reposo — Cliente (Zustand / Storage)"
Cohesion: 0.29
Nodes (7): Análisis del Audit Logger (IndexedDB), Análisis del IndexedDB (Recibos), 🔴 SEC-001 — CRÍTICO: Estado Zustand persistido en TEXTO PLANO en localStorage como almacenamiento PRIMARIO, 🔴 SEC-002 — CRÍTICO: La clave de cifrado AES-GCM se deriva de un secreto almacenado en texto plano en localStorage, 🟡 SEC-009 — MEDIO: Hash de audit log usa djb2 (hash de 32 bits, no criptográfico), SEC-015 — BAJO: Email del perfil persistido en estado de Zustand, Área 3: Datos en Reposo — Cliente (Zustand / Storage)

### Community 52 - "sync-store.ts"
Cohesion: 0.23
Nodes (11): ensureFilesystem(), isEncryptionAvailable(), isNativePlatform(), loadEncryptedState(), readFileNative(), saveEncryptedState(), writeFileNative(), encryptedStorage (+3 more)

### Community 53 - "scroll-area.tsx"
Cohesion: 0.20
Nodes (19): accounts, debt_payments, debts, fixed_items, goal_folders, goals, idx_fixed_items_user_active, idx_goal_folders_parent_id (+11 more)

### Community 54 - "PillTabs.tsx"
Cohesion: 0.43
Nodes (6): PILL_TAB_ACTIVE, PILL_TAB_BASE, PILL_TAB_INACTIVE, PILL_TABS_CONTAINER, PillTabs(), PillTabsProps

### Community 55 - "Command Palette & Search Quick Actions"
Cohesion: 0.18
Nodes (10): buildCommand, builder/*, redesign/*, framework, git, deploymentEnabled, headers, installCommand (+2 more)

### Community 56 - "encrypted-storage.test.ts"
Cohesion: 0.25
Nodes (9): deleteReceipt(), encryptData(), loadReceipt(), migrateReceiptsToEncrypted(), openReceiptDB(), restoreReceiptsFromIndexedDB(), STORAGE_KEY, encryptWithKey() (+1 more)

### Community 58 - "Área 4: Autenticación y Manejo de Tokens JWT"
Cohesion: 0.33
Nodes (6): Almacenamiento del JWT de Sesión, Análisis del Flujo de Autenticación, 🟠 SEC-006 — ALTO: Clave ANON de Supabase comprometida en `.env` local, 🟡 SEC-008 — MEDIO: Rate limiting del Login es Client-Side (bypasseable), 🟡 SEC-010 — MEDIO: Takeover de sesión multi-dispositivo sin confirmación MFA, Área 4: Autenticación y Manejo de Tokens JWT

### Community 61 - "🛠️ Registro de Ejecución y Checkpoints: Constructor CLI (`02_OPENCODE_TASKS.md`)"
Cohesion: 0.29
Nodes (6): 1. Panel de Control de Progreso (Progress Dashboard), 2. Lista de Tareas Detallada y Estado de Ejecución, 3. ⚠️ Registro de Bloqueos, Fallos y Dificultades (Escalation Log), 4. Registro Histórico de Checkpoints (Commits en Worktree Builder), 5. Resumen de Entrega de Fase 2 (Construcción Concluida), 🛠️ Registro de Ejecución y Checkpoints: Constructor CLI (`02_OPENCODE_TASKS.md`)

### Community 62 - "🔍 Registro de Revisión, Auditoría y Cierre: Antigravity (`03_ANTIGRAVITY_REVIEW.md`)"
Cohesion: 0.29
Nodes (6): 1. Panel de Control, 2. ✅ Elementos Revisados (Sprint 3), 3. 🛠️ Correcciones y Endurecimiento de Revisión, 4. Verificación de Criterios de Aceptación (Sign-off), 5. Dictamen Final, 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity (`03_ANTIGRAVITY_REVIEW.md`)

### Community 63 - "Login.tsx"
Cohesion: 0.15
Nodes (9): 12.6 Hallazgos nuevos materiales (`F2`–`F10`), checkHibpPwnedPassword(), createRateLimitedFunction(), getClientIdentifier(), RateLimitConfig, rateLimiter, RateLimitInfo, validatePasswordStrength() (+1 more)

### Community 64 - "audit-logger.ts"
Cohesion: 0.22
Nodes (18): 12.10 Certificación del Sprint de Remediación P0 (`v1.21.1-p0-remediation` — 2026-10-20), audit, AuditAction, AuditEntry, clearAuditLogs(), computeHash(), exportAuditLogs(), GENESIS_HASH (+10 more)

### Community 65 - "📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA]"
Cohesion: 0.06
Nodes (17): @testing-library/jest-dom, cloneValue(), compareKeys(), FakeCursor, FakeDatabase, FakeIDBFactory, FakeIDBKeyRange, FakeIndex (+9 more)

### Community 75 - "🧭 Re-auditoría Integral v2 — 2026-10 — Finance Pal v1.19.38"
Cohesion: 0.12
Nodes (17): 12.10 Estado de producción y desfase de esquema, 12.11.1 Cero cambios en código fuente, 12.11.2 Escaneo de secretos, 12.11.3 Limitaciones, 12.11.4 Firma de cierre, 12.11 Verificación de cierre y limitaciones, 12.1 Dictamen ejecutivo, 12.2 Cobertura ejecutada (+9 more)

### Community 76 - "App"
Cohesion: 0.18
Nodes (8): @capacitor/core, next-themes, react-dom, web-vitals, Toaster(), ToasterProps, initWebVitals(), send()

### Community 101 - "Área 6: Seguridad de la Plataforma y Configuración"
Cohesion: 0.40
Nodes (5): Headers de Seguridad — Netlify, 🟠 SEC-003 — ALTO: CORS Wildcard en Edge Function sin Autenticación de Llamante, 🟡 SEC-007 — MEDIO: URLs de Recibos en Storage No Firmadas (Públicas), SEC-016 — BAJO: Datos sensibles en logs de consola, Área 6: Seguridad de la Plataforma y Configuración

### Community 103 - "🟠 PRIORIDAD 2: Altos (Semana 2)"
Cohesion: 0.40
Nodes (5): 🟠 PRIORIDAD 2: Altos (Semana 2), SEC-003 — Asegurar la Edge Function send-reminders, SEC-004 — Restringir SECURITY DEFINER a llamadas autenticadas, SEC-005 — Añadir filtro `user_id` en operaciones de servicio, SEC-006 — Rotación de claves Supabase

### Community 105 - "📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA]"
Cohesion: 0.15
Nodes (12): 1. Resumen Ejecutivo y Objetivos, 2. Alineación Arquitectónica (Finance Pal Local-First), 3. Mapa de Archivos e Impacto, 4. Tipos, Interfaces y Contratos de Datos, 5. Plan de Ejecución Secuencial para OpenCode CLI (DeepSeek 4.1 Flash), 6. Criterios de Aceptación y Checklist de Calidad, 7. Protocolo de Traspaso a OpenCode, 📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA] (+4 more)

### Community 106 - "ref_path"
Cohesion: 0.07
Nodes (27): lovable-tagger, rollup-plugin-visualizer, sharp, vite, @vitejs/plugin-react-swc, exists(), main(), path (+19 more)

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

### Community 114 - "⚡ Guía Paso a Paso: Ciclo Completo de una Tarea"
Cohesion: 0.14
Nodes (9): 🛠️ Comandos Rápidos, 📁 Estructura del Directorio `.agent/workflow/`, 🔄 Flujo de Trabajo Colaborativo: Antigravity ↔ OpenCode, ⚡ Guía Paso a Paso: Ciclo Completo de una Tarea, Paso 1: Planificación (Antigravity CLI — Gemini 3.8 Flash / Argon 4), Paso 2: Configuración del Worktree & Construcción (OpenCode CLI — DeepSeek 4.1 Flash), Paso 3: Revisión y Cierre (Antigravity CLI — Gemini 3.8 Flash / Argon 4), Paso 4: Limpieza y Merge (+1 more)

### Community 115 - "🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI"
Cohesion: 0.22
Nodes (8): 1. Panel de Control de la Revisión, 2. 🔍 Cosas que se están revisando actualmente (In Progress), 3. ✅ Cosas que ya se revisaron (Audited & Closed), 4. ⏳ Cosas que se van a revisar (Backlog de Revisión), 5. 🛠️ Tareas y Lógica Completadas por Antigravity (Lo que quedó pendiente), 6. Verificación de Criterios de Aceptación (Sign-off), 7. Dictamen Final y Recomendación de Fusión (Merge), 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI

### Community 117 - "framer.tsx"
Cohesion: 0.23
Nodes (7): DesignCompareToggle, SplashScreen, AnyProps, fallback, make(), motion, stripAnimProps()

### Community 120 - "Plan de Mitigación Accionable"
Cohesion: 0.25
Nodes (8): Plan de Mitigación Accionable, 🔴 PRIORIDAD 1: Críticos (Semana 1), 🟢 PRIORIDAD 4: Bajos (Backlog), SEC-001 — Inmediato: Borrar texto plano de localStorage existente, SEC-001 y SEC-002 — Rediseño del modelo de persistencia cifrada, SEC-014 — Añadir headers COOP/COEP al netlify.toml, SEC-015 — Excluir email del estado persistido, SEC-018 — Límite de tamaño en importación JSON

### Community 121 - "ZAP Scanning Report"
Cohesion: 0.46
Nodes (7): cmd_create(), cmd_list(), cmd_remove(), cmd_status(), cmd_sync(), worktree-manager.sh script, show_help()

### Community 122 - "Área 5: IDOR, Inyección y Lógica de Aplicación"
Cohesion: 0.40
Nodes (5): Análisis de Inyección SQL / NoSQL, Análisis de XSS, 🟠 SEC-005 — ALTO: IDOR Potencial en Servicios de Update/Delete, SEC-018 — BAJO: Importación JSON sin límite de tamaño previo al parse, Área 5: IDOR, Inyección y Lógica de Aplicación

### Community 123 - "🟡 PRIORIDAD 3: Medios (Semana 3-4)"
Cohesion: 0.40
Nodes (5): 🟡 PRIORIDAD 3: Medios (Semana 3-4), SEC-007 — URLs firmadas para recibos, SEC-009 — Reemplazar djb2 por SHA-256 en audit logger, SEC-011 — Corregir columnas `deleted_at` faltantes en esquema, SEC-012 — Restringir validación de localhost a paths y puertos conocidos

### Community 128 - "SyncIndicator.tsx"
Cohesion: 0.40
Nodes (5): Análisis del Schema SQL, 🔴 SEC-004 — ALTO: Función `SECURITY DEFINER` sin restricción de invocador, 🔴 SEC-011 — MEDIO: Condición `deleted_at IS NULL` en políticas de tablas sin esa columna, Tablas y Estado de RLS, Área 2: Datos en Reposo — Servidor (RLS y DB)

### Community 129 - "2. `F3.2` — OAuth, PKCE, redirects y callback (`T10`, `SEC-012`)"
Cohesion: 0.67
Nodes (5): cmd_next(), cmd_prompt(), cmd_status(), handoff.sh script, show_help()

### Community 130 - "🧪 Evidencia F0 — Preparación, Estructura y Verificación de Entorno"
Cohesion: 0.47
Nodes (3): idx_push_subs_endpoint, idx_push_subs_user_id, public.push_subscriptions

### Community 146 - "MigracionNube.tsx"
Cohesion: 0.10
Nodes (29): ErrorBoundary, Props, State, Card, CardContent, CardDescription, CardFooter, CardHeader (+21 more)

### Community 178 - "SyncIndicator.tsx"
Cohesion: 0.20
Nodes (10): @capacitor/network, @testing-library/react, DesktopSyncIcon(), isNative, SyncIcon(), SyncIndicator(), SyncState, UploadDots() (+2 more)

## Knowledge Gaps
- **31 isolated node(s):** `@hookform/resolvers`, `@tanstack/query-sync-storage-persister`, `@types/react-window`, `date-fns`, `framer-motion` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 674 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Core Dependencies & Third-Party Packages` to `Button`, `DashboardV2.tsx`, `finance.ts`, `Navigation Shell & Responsive Drawers`, `QuickTransactionSheet.tsx`, `AppShell.tsx`, `Interactive Toast Notification System`, `react`, `MigracionNube.tsx`, `Brand Identity & Accent Palettes`, `Navigation Shell & Responsive Drawers`, `Supabase Authentication & Security Context`, `lucide-react`, `Ajustes.tsx`, `ui-version-navigation.test.tsx`, `chart.tsx`, `Core Dependencies & Third-Party Packages`, `GoalDetailContent.tsx`, `useFinanceData`, `Core Dependencies & Third-Party Packages`, `Login.tsx`, `Core Dependencies & Third-Party Packages`, `PillTabs.tsx`, `sheet.tsx`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `useFinanceData()` (e.g. with `1. Resumen Ejecutivo del Sprint 4` and `4. Verificación de Criterios de Aceptación (Sign-off)`) actually correct?**
  _`useFinanceData()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@hookform/resolvers`, `@tanstack/query-sync-storage-persister`, `@types/react-window` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Autonomous Notification & Scheduling Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.029411764705882353 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `Button`, `DashboardV2.tsx`, `Core Dependencies & Third-Party Packages`, `notifications.ts`, `Autonomous Notification & Scheduling Engine`, `finance.ts`, `Cloud Sync & Offline State Engine`, `Navigation Shell & Responsive Drawers`, `QuickTransactionSheet.tsx`, `AppShell.tsx`, `Interactive Toast Notification System`, `useFinanceData.ts`, `finance-store.ts`, `MigracionNube.tsx`, `Brand Identity & Accent Palettes`, `Navigation Shell & Responsive Drawers`, `Autonomous Notification & Scheduling Engine`, `Supabase Authentication & Security Context`, `version-check.ts`, `lucide-react`, `Ajustes.tsx`, `ui-version-navigation.test.tsx`, `chart.tsx`, `Core Dependencies & Third-Party Packages`, `GoalDetailContent.tsx`, `useFinanceData`, `Core Dependencies & Third-Party Packages`, `Login.tsx`, `Core Dependencies & Third-Party Packages`, `accent-palette.ts`, `SyncIndicator.tsx`, `sheet.tsx`, `framer.tsx`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Should `Core Dependencies & Third-Party Packages` be split into smaller, more focused modules?**
  _Cohesion score 0.0797979797979798 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Autonomous Notification & Scheduling Engine` to `Autonomous Notification & Scheduling Engine`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._