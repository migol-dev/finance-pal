# Graph Report - finance-pal  (2026-10-25)

## Corpus Check
- 304 files · ~525,919 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 33 file(s) not represented in the graph (top: .xml 14, (none) 6, .toml 4)

## Summary
- 2098 nodes · 6517 edges · 145 communities (92 shown, 53 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 98 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `43fb5340`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- migration.ts
- AppShell.tsx
- Autonomous Notification & Scheduling Engine
- Core Dependencies & Third-Party Packages
- HistorialV2.tsx
- Autonomous Notification & Scheduling Engine
- ui-version-deudas-metas.test.tsx
- sync-engine.ts
- App.tsx
- Navigation Shell & Responsive Drawers
- useGoalFolderMutations.ts
- Build Configuration & Tooling Infrastructure
- generateSecureId
- useFinanceData
- Interactive Toast Notification System
- Autonomous Notification & Scheduling Engine
- react
- DatosSection.tsx
- finance-store.ts
- Brand Identity & Accent Palettes
- Debt Management & Loan Tracking
- Navigation Shell & Responsive Drawers
- app-error.ts
- architecture.md
- Build Configuration & Tooling Infrastructure
- Supabase Authentication & Security Context
- sync-store.ts
- LoginV2.tsx
- ui-version-dashboard.test.tsx
- supabase
- Core Dependencies & Third-Party Packages
- Schema Validation & Domain Rules
- App Version Check & Update Toast
- Session Lifecycle & Device Management
- Savings Goals & Folder Organization
- useSessionManager.ts
- Build Configuration & Tooling Infrastructure
- chart.tsx
- Transaction
- Core Dependencies & Third-Party Packages
- supabase.ts
- settings-slice.ts
- 🔐 Auditoría de Seguridad y Privacidad — Finance Pal
- Core Dependencies & Third-Party Packages
- schema-migrations.ts
- Android Native Integration & Build Pipeline
- useAccountMutations.ts
- MockResizeObserver
- Build Configuration & Tooling Infrastructure
- Core Dependencies & Third-Party Packages
- sonner.tsx
- Área 3: Datos en Reposo — Cliente (Zustand / Storage)
- settings.service.ts
- scroll-area.tsx
- notifications.ts
- Command Palette & Search Quick Actions
- 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity (`03_ANTIGRAVITY_REVIEW.md`)
- scroll-area.tsx
- Área 4: Autenticación y Manejo de Tokens JWT
- Command Palette & Search Quick Actions
- breadcrumb.tsx
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
- web-vitals.ts
- Área 6: Seguridad de la Plataforma y Configuración
- encrypted-storage.ts
- PageSkeleton.tsx
- react-router-dom
- 📐 Arquitectura & Plan Maestro: [NOMBRE_DE_LA_CARACTERÍSTICA]
- ref_path
- MainActivity
- 📜 Protocolo Operativo Multi-Agente: Antigravity ↔ OpenCode
- 🛠️ Registro de Ejecución y Checkpoints: OpenCode CLI
- sheet.tsx
- ui-version-movimientos.test.tsx
- finance.ts
- ⚡ Guía Paso a Paso: Ciclo Completo de una Tarea
- 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI
- Directivas Principales
- LoginClassic.tsx
- Directivas Principales
- Plan de Mitigación Accionable
- 🟠 PRIORIDAD 2: Altos (Semana 2)
- ZAP Scanning Report
- Área 5: IDOR, Inyección y Lógica de Aplicación
- AGENTS.md
- Context and Knowledge Protocol (Mandatory for Antigravity & Gemini Agents)
- MockResizeObserver
- AuthGuard
- SyncIndicator.tsx
- 2. `F3.2` — OAuth, PKCE, redirects y callback (`T10`, `SEC-012`)
- 🧪 Evidencia F0 — Preparación, Estructura y Verificación de Entorno
- input-otp.tsx
- 🟡 PRIORIDAD 3: Medios (Semana 3-4)
- accordion.tsx
- mfa-auth.test.ts
- Goal
- ui-version-mobile-a11y.test.tsx
- [ Cross-Origin-Opener-Policy Header Missing or Invalid ](https://www.zaproxy.org/docs/alerts/90004/)
- vitest

## God Nodes (most connected - your core abstractions)
1. `cn()` - 267 edges
2. `react` - 119 edges
3. `useFinance` - 104 edges
4. `useFinanceData()` - 99 edges
5. `Button` - 83 edges
6. `lucide-react` - 77 edges
7. `AppError` - 62 edges
8. `Input` - 48 edges
9. `Label` - 48 edges
10. `vitest` - 41 edges

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

## Communities (145 total, 53 thin omitted)

### Community 0 - "migration.ts"
Cohesion: 0.09
Nodes (30): ErrorBoundary, Props, State, Card, CardContent, CardDescription, CardFooter, CardHeader (+22 more)

### Community 1 - "AppShell.tsx"
Cohesion: 0.20
Nodes (15): react, applyAccentVars(), AppShell(), SWIPE_ROUTES, DesignCompareToggle, DesktopSidebar, DesktopSidebarV2, PRIMARY_NAV (+7 more)

### Community 2 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.03
Nodes (68): dependencies, @capacitor/app, @capacitor/browser, @capacitor/core, @capacitor/filesystem, @capacitor/local-notifications, @capacitor/network, @capacitor/push-notifications (+60 more)

### Community 3 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.06
Nodes (52): @radix-ui/react-avatar, @radix-ui/react-context-menu, @radix-ui/react-dropdown-menu, @radix-ui/react-menubar, @radix-ui/react-radio-group, @radix-ui/react-tabs, Avatar, AvatarFallback (+44 more)

### Community 4 - "HistorialV2.tsx"
Cohesion: 0.24
Nodes (10): Historial, ACTION_CONFIG, ENTITY_CONFIG, fmtVal(), formatChangeLogLabel(), getDayHeader(), HistorialV2, ChangeAction (+2 more)

### Community 5 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.04
Nodes (45): config, name, private, type, version, autoprefixer, @capacitor/android, @capacitor/app (+37 more)

### Community 6 - "ui-version-deudas-metas.test.tsx"
Cohesion: 0.11
Nodes (15): debtPaymentSchema, mockAddDebt, mockAddDebtPayment, mockAddGoal, mockAddGoalFolder, mockContributeGoal, mockRemoveDebt, mockRemoveDebtPayment (+7 more)

### Community 7 - "sync-engine.ts"
Cohesion: 0.17
Nodes (15): abortControllers, ALLOWED_TABLES, getUserLock(), processingLocks, processSyncQueue(), setAbortController(), setupSyncListener(), setUserLock() (+7 more)

### Community 8 - "App.tsx"
Cohesion: 0.14
Nodes (19): Ajustes, AnimatedRoutes(), Anual, App(), AuthCallback, containsImplicitTokens(), Deudas, encryptedQueryStorage (+11 more)

### Community 9 - "Navigation Shell & Responsive Drawers"
Cohesion: 0.07
Nodes (31): @radix-ui/react-separator, @radix-ui/react-tooltip, Separator, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction (+23 more)

### Community 10 - "useGoalFolderMutations.ts"
Cohesion: 0.38
Nodes (9): isOffline(), useGoalFolderMutations(), deleteGoalFolder(), GoalFolderUpdatePayload, insertGoalFolder(), reorderGoalFolders(), toInsertPayload(), toUpdatePayload() (+1 more)

### Community 11 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.06
Nodes (33): devDependencies, autoprefixer, @capacitor/android, @capacitor/cli, cross-env, cssnano, eslint, @eslint/js (+25 more)

### Community 12 - "generateSecureId"
Cohesion: 0.20
Nodes (20): zustand, AccountMutations, saveReceipt(), Account, ChangeLogEntry, diffFields(), generateSecureId(), logEntry() (+12 more)

### Community 13 - "useFinanceData"
Cohesion: 0.06
Nodes (155): State Synchronization Facade, 5.4. Tarea F8.4: Nuevo Apartado `"Categorías"` en Ajustes + Opción Directa `"+ Crear nueva"` en Movimientos, Autonomous Notification Scheduler Engine, lucide-react, react-easy-crop, sonner, AnualV2, CATEGORY_COLORS (+147 more)

### Community 14 - "Interactive Toast Notification System"
Cohesion: 0.12
Nodes (25): @radix-ui/react-toast, Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle (+17 more)

### Community 15 - "Autonomous Notification & Scheduling Engine"
Cohesion: 0.08
Nodes (28): zod, accountSchema, accountTypeSchema, changeActionSchema, changeEntitySchema, changeLogEntrySchema, currencySchema, debtSchema (+20 more)

### Community 16 - "react"
Cohesion: 0.08
Nodes (17): clsx, @radix-ui/react-checkbox, @radix-ui/react-hover-card, @radix-ui/react-popover, @radix-ui/react-slider, react-resizable-panels, tailwind-merge, StatPill (+9 more)

### Community 17 - "DatosSection.tsx"
Cohesion: 0.07
Nodes (52): @capacitor/share, UpdateNotification(), check(), UpdateNotificationProps, useUpdateToast(), check(), Checkbox, Switch (+44 more)

### Community 18 - "finance-store.ts"
Cohesion: 0.16
Nodes (18): @capacitor/filesystem, clearEncryptedState(), extractReceiptsToIndexedDB(), isEncryptionAvailable(), restoreReceiptsFromIndexedDB(), getDueOccurrencesForFixedItem(), sanitizeAccountForExport(), sanitizeDebtPaymentForExport() (+10 more)

### Community 19 - "Brand Identity & Accent Palettes"
Cohesion: 0.11
Nodes (22): @radix-ui/react-alert-dialog, react-day-picker, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader() (+14 more)

### Community 20 - "Debt Management & Loan Tracking"
Cohesion: 0.18
Nodes (20): AddDebtPaymentInput, DebtMutations, isOffline(), RemoveDebtPaymentInput, useDebtMutations(), Debt, DebtPayment, CloudSyncInput (+12 more)

### Community 21 - "Navigation Shell & Responsive Drawers"
Cohesion: 0.30
Nodes (13): cmdk, CommandPalette, CommandPaletteProps, Command, CommandDialog(), CommandDialogProps, CommandEmpty, CommandGroup (+5 more)

### Community 22 - "app-error.ts"
Cohesion: 0.20
Nodes (8): ErrorCode, errorFromUnknown(), ErrorSeverity, LogEntry, logger, LogLevel, logs, showUserError()

### Community 23 - "architecture.md"
Cohesion: 0.40
Nodes (3): Antigravity Architect Role Contract, Local-First Architecture Pattern, Virtual Debt Transactions Engine

### Community 24 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 25 - "Supabase Authentication & Security Context"
Cohesion: 0.14
Nodes (15): class-variance-authority, @radix-ui/react-toggle, @radix-ui/react-toggle-group, Alert, AlertDescription, AlertTitle, alertVariants, Badge() (+7 more)

### Community 26 - "sync-store.ts"
Cohesion: 0.24
Nodes (7): DataConflictDialog(), Props, encryptedStorage, SyncActionType, SyncMutation, SyncState, useSyncStore

### Community 27 - "LoginV2.tsx"
Cohesion: 0.12
Nodes (22): @capacitor/browser, @capacitor/core, calculatePasswordStrength(), checkAuthRateLimit(), DEV_REDIRECT_PORTS, getSafeAuthError(), getValidatedRedirectUri(), isValidRedirectUri() (+14 more)

### Community 28 - "ui-version-dashboard.test.tsx"
Cohesion: 0.21
Nodes (6): Dashboard, Dashboard(), Index(), mockEnsureScheduledTransactions, MockResizeObserver, mockState

### Community 29 - "supabase"
Cohesion: 0.28
Nodes (11): DeleteReceiptForTransactionInput, ReceiptMutations, UploadReceiptForTransactionInput, useReceiptMutations(), supabase, dataUrlToBlob(), deleteReceipt(), getReceiptSignedUrl() (+3 more)

### Community 30 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.11
Nodes (18): scripts, analyze, android:build:release, android:build:release:win, android:copy, browserslist:update-db, build, build:dev (+10 more)

### Community 31 - "Schema Validation & Domain Rules"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 32 - "App Version Check & Update Toast"
Cohesion: 0.25
Nodes (14): FixedItemMutations, isOffline(), useFixedItemMutations(), FixedItem, deleteFixedItem(), FixedItemInsertPayload, FixedItemRow, FixedItemUpdatePayload (+6 more)

### Community 33 - "Session Lifecycle & Device Management"
Cohesion: 0.18
Nodes (11): corsHeaders, daysBetween(), DEFAULT_PREFS, getNextFixedDueDates(), isDateInQuietHours(), isFixedActiveInMonth(), parseDateSafe(), parseTimeHHMM() (+3 more)

### Community 34 - "Savings Goals & Folder Organization"
Cohesion: 0.23
Nodes (14): ContributeToGoalInput, isOffline(), useGoalMutations(), addGoalContribution(), deleteGoal(), fetchGoals(), GoalContributionInput, GoalContributionRow (+6 more)

### Community 35 - "useSessionManager.ts"
Cohesion: 0.53
Nodes (4): getDeviceId(), getDeviceName(), SessionState, useSessionManager()

### Community 36 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 37 - "chart.tsx"
Cohesion: 0.18
Nodes (12): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+4 more)

### Community 38 - "Transaction"
Cohesion: 0.26
Nodes (12): isOffline(), TransactionMutations, useTransactionMutations(), Transaction, deleteTransaction(), insertTransaction(), toInsertPayload(), toUpdatePayload() (+4 more)

### Community 39 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.17
Nodes (14): embla-carousel-react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+6 more)

### Community 40 - "supabase.ts"
Cohesion: 0.22
Nodes (19): @supabase/supabase-js, @tanstack/react-query, AuthContext, AuthContextType, useAuth(), useAccountsQuery(), useDebtsQuery(), useFixedItemsQuery() (+11 more)

### Community 41 - "settings-slice.ts"
Cohesion: 0.18
Nodes (22): 5.3. Tarea F8.3: Categorías Generales + Modelo `CustomCategory` (Máx. 20 Caracteres + Emoji), 5.6. Tarea F8.6: Tema desde el Segundo 1 (Cero Flash Claro) + Selector Dinámico en Login y Register, BLOQUE 2 — Segundas Observaciones (Categorías Generales + Creación Personalizada, Orden de Boot y Tema desde el Segundo 1), BrandLogoProps, AccentColor, AccessibilitySettings, AppSettings, CustomCategory (+14 more)

### Community 42 - "🔐 Auditoría de Seguridad y Privacidad — Finance Pal"
Cohesion: 0.25
Nodes (8): Análisis del Cliente Supabase, 🔐 Auditoría de Seguridad y Privacidad — Finance Pal, Controles de Seguridad Positivos Detectados, Matriz de Riesgo Residual, Resumen de Hallazgos por Severidad, Resumen Ejecutivo, Tabla de Contenidos, Área 1: Datos en Tránsito

### Community 43 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.19
Nodes (12): @radix-ui/react-label, react-hook-form, FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext (+4 more)

### Community 44 - "schema-migrations.ts"
Cohesion: 0.29
Nodes (8): Currency, CURRENT_SCHEMA_VERSION, getDefaultAppSettings(), mergeLocalCloudData(), MigrationContext, MigrationResult, migrations, sanitizeMigratedData()

### Community 46 - "useAccountMutations.ts"
Cohesion: 0.19
Nodes (15): Vistas de Seguridad (Column-Level Security), isOffline(), useAccountMutations(), AppError, AccountInsertPayload, AccountRow, AccountUpdatePayload, deleteAccount() (+7 more)

### Community 48 - "Build Configuration & Tooling Infrastructure"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

### Community 49 - "Core Dependencies & Third-Party Packages"
Cohesion: 0.28
Nodes (8): @radix-ui/react-navigation-menu, NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 50 - "sonner.tsx"
Cohesion: 0.50
Nodes (3): next-themes, Toaster(), ToasterProps

### Community 51 - "Área 3: Datos en Reposo — Cliente (Zustand / Storage)"
Cohesion: 0.29
Nodes (7): Análisis del Audit Logger (IndexedDB), Análisis del IndexedDB (Recibos), 🔴 SEC-001 — CRÍTICO: Estado Zustand persistido en TEXTO PLANO en localStorage como almacenamiento PRIMARIO, 🔴 SEC-002 — CRÍTICO: La clave de cifrado AES-GCM se deriva de un secreto almacenado en texto plano en localStorage, 🟡 SEC-009 — MEDIO: Hash de audit log usa djb2 (hash de 32 bits, no criptográfico), SEC-015 — BAJO: Email del perfil persistido en estado de Zustand, Área 3: Datos en Reposo — Cliente (Zustand / Storage)

### Community 52 - "settings.service.ts"
Cohesion: 0.22
Nodes (17): CloudSyncMutations, useCloudSyncMutations(), mapAccountFromDb(), CloudSnapshot, CloudSyncResult, downloadAllFromCloud(), loadSettingsFromCloud(), syncAllToCloud() (+9 more)

### Community 53 - "scroll-area.tsx"
Cohesion: 0.20
Nodes (19): accounts, debt_payments, debts, fixed_items, goal_folders, goals, idx_fixed_items_user_active, idx_goal_folders_parent_id (+11 more)

### Community 54 - "notifications.ts"
Cohesion: 0.07
Nodes (66): @capacitor/local-notifications, @capacitor/push-notifications, isRecentlyDismissed(), NotificationPermissionPrompt(), listeners, notifySchedulerListeners(), SharedSchedulerState, sharedState (+58 more)

### Community 55 - "Command Palette & Search Quick Actions"
Cohesion: 0.18
Nodes (10): buildCommand, builder/*, redesign/*, framework, git, deploymentEnabled, headers, installCommand (+2 more)

### Community 56 - "🔍 Registro de Revisión, Auditoría y Cierre: Antigravity (`03_ANTIGRAVITY_REVIEW.md`)"
Cohesion: 0.33
Nodes (5): 1. Panel de Control de Cierre Global, 2. ✅ Elementos Revisados (Sprint 6), 3. 🛠️ Correcciones y Endurecimiento de Revisión (Sprint 6), 4. Verificación de Criterios de Aceptación Finales (Sign-off), 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity (`03_ANTIGRAVITY_REVIEW.md`)

### Community 57 - "scroll-area.tsx"
Cohesion: 0.67
Nodes (3): @radix-ui/react-scroll-area, ScrollArea, ScrollBar

### Community 58 - "Área 4: Autenticación y Manejo de Tokens JWT"
Cohesion: 0.29
Nodes (7): Almacenamiento del JWT de Sesión, Análisis del Flujo de Autenticación, 🟠 SEC-006 — ALTO: Clave ANON de Supabase comprometida en `.env` local, 🟡 SEC-008 — MEDIO: Rate limiting del Login es Client-Side (bypasseable), 🟡 SEC-010 — MEDIO: Takeover de sesión multi-dispositivo sin confirmación MFA, 🟡 SEC-012 — MEDIO: `isValidRedirectUri` permite cualquier `localhost`, Área 4: Autenticación y Manejo de Tokens JWT

### Community 61 - "breadcrumb.tsx"
Cohesion: 0.22
Nodes (8): @radix-ui/react-slot, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 62 - "useFinance"
Cohesion: 0.39
Nodes (17): inSet(), isBool(), isNum(), isObj(), isStr(), isValidUUID(), migrateImported(), REPEAT_FREQS (+9 more)

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
Cohesion: 0.11
Nodes (17): 12.10 Estado de producción y desfase de esquema, 12.11.1 Cero cambios en código fuente, 12.11.2 Escaneo de secretos, 12.11.3 Limitaciones, 12.11.4 Firma de cierre, 12.11 Verificación de cierre y limitaciones, 12.1 Dictamen ejecutivo, 12.2 Cobertura ejecutada (+9 more)

### Community 76 - "web-vitals.ts"
Cohesion: 0.33
Nodes (4): react-dom, web-vitals, initWebVitals(), send()

### Community 101 - "Área 6: Seguridad de la Plataforma y Configuración"
Cohesion: 0.40
Nodes (5): Headers de Seguridad — Netlify, 🟠 SEC-003 — ALTO: CORS Wildcard en Edge Function sin Autenticación de Llamante, 🟡 SEC-007 — MEDIO: URLs de Recibos en Storage No Firmadas (Públicas), SEC-016 — BAJO: Datos sensibles en logs de consola, Área 6: Seguridad de la Plataforma y Configuración

### Community 102 - "encrypted-storage.ts"
Cohesion: 0.10
Nodes (43): ALL_ENCRYPTED_STATE_KEYS, base64ToBytes(), bytesToBase64(), clearAllReceipts(), clearDevicePeppers(), clearKeyCache(), decryptData(), deleteFileNative() (+35 more)

### Community 103 - "PageSkeleton.tsx"
Cohesion: 1.00
Nodes (3): PageSkeleton, Shimmer(), SkeletonHeader()

### Community 104 - "react-router-dom"
Cohesion: 0.17
Nodes (13): react-router-dom, BottomNav, BrandLogo, SIZE_MAP, NavItem, navItems, AnyProps, fallback (+5 more)

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

### Community 112 - "finance.ts"
Cohesion: 0.12
Nodes (16): AccountType, ColorBlindMode, DEFAULT_ACCESSIBILITY_SETTINGS, DEFAULT_CATEGORY_EMOJI, FixedOccurrenceInfo, FREQ_LABEL, Frequency, GoalPaceInfo (+8 more)

### Community 114 - "⚡ Guía Paso a Paso: Ciclo Completo de una Tarea"
Cohesion: 0.14
Nodes (9): 🛠️ Comandos Rápidos, 📁 Estructura del Directorio `.agent/workflow/`, 🔄 Flujo de Trabajo Colaborativo: Antigravity ↔ OpenCode, ⚡ Guía Paso a Paso: Ciclo Completo de una Tarea, Paso 1: Planificación (Antigravity CLI — Gemini 3.8 Flash / Argon 4), Paso 2: Configuración del Worktree & Construcción (OpenCode CLI — DeepSeek 4.1 Flash), Paso 3: Revisión y Cierre (Antigravity CLI — Gemini 3.8 Flash / Argon 4), Paso 4: Limpieza y Merge (+1 more)

### Community 115 - "🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI"
Cohesion: 0.22
Nodes (8): 1. Panel de Control de la Revisión, 2. 🔍 Cosas que se están revisando actualmente (In Progress), 3. ✅ Cosas que ya se revisaron (Audited & Closed), 4. ⏳ Cosas que se van a revisar (Backlog de Revisión), 5. 🛠️ Tareas y Lógica Completadas por Antigravity (Lo que quedó pendiente), 6. Verificación de Criterios de Aceptación (Sign-off), 7. Dictamen Final y Recomendación de Fusión (Merge), 🔍 Registro de Revisión, Auditoría y Cierre: Antigravity CLI

### Community 117 - "LoginClassic.tsx"
Cohesion: 0.23
Nodes (14): AnimatedBackground(), calculatePasswordStrength(), checkAuthRateLimit(), DEV_REDIRECT_PORTS, FloatingParticles(), getSafeAuthError(), getValidatedRedirectUri(), GitHubIcon() (+6 more)

### Community 119 - "Plan de Mitigación Accionable"
Cohesion: 0.25
Nodes (8): Plan de Mitigación Accionable, 🔴 PRIORIDAD 1: Críticos (Semana 1), 🟢 PRIORIDAD 4: Bajos (Backlog), SEC-001 — Inmediato: Borrar texto plano de localStorage existente, SEC-001 y SEC-002 — Rediseño del modelo de persistencia cifrada, SEC-014 — Añadir headers COOP/COEP al netlify.toml, SEC-015 — Excluir email del estado persistido, SEC-018 — Límite de tamaño en importación JSON

### Community 120 - "🟠 PRIORIDAD 2: Altos (Semana 2)"
Cohesion: 0.40
Nodes (5): 🟠 PRIORIDAD 2: Altos (Semana 2), SEC-003 — Asegurar la Edge Function send-reminders, SEC-004 — Restringir SECURITY DEFINER a llamadas autenticadas, SEC-005 — Añadir filtro `user_id` en operaciones de servicio, SEC-006 — Rotación de claves Supabase

### Community 121 - "ZAP Scanning Report"
Cohesion: 0.46
Nodes (7): cmd_create(), cmd_list(), cmd_remove(), cmd_status(), cmd_sync(), worktree-manager.sh script, show_help()

### Community 122 - "Área 5: IDOR, Inyección y Lógica de Aplicación"
Cohesion: 0.40
Nodes (5): Análisis de Inyección SQL / NoSQL, Análisis de XSS, 🟠 SEC-005 — ALTO: IDOR Potencial en Servicios de Update/Delete, SEC-018 — BAJO: Importación JSON sin límite de tamaño previo al parse, Área 5: IDOR, Inyección y Lógica de Aplicación

### Community 126 - "AuthGuard"
Cohesion: 0.12
Nodes (16): 1. Resumen Ejecutivo del Sprint 8, 2. División de Roles y Modelos de IA, 3. Razonamiento de Diseño Obligatorio (`frontend-ui-craft`), 4. Arquitectura de Bloques de Ejecución, 5.1. Tarea F8.1: Rediseño del Selector de Pestañas en Resumen Anual, 5.2. Tarea F8.2: Simplificación de la Barra de Carpetas en Metas Móvil, 5.5. Tarea F8.5: Orden Estricto de Arranque (Primero Animación `SplashScreen`, Después `PageSkeleton`), 5. Especificación Técnica Detallada por Bloque (+8 more)

### Community 128 - "SyncIndicator.tsx"
Cohesion: 0.40
Nodes (5): Análisis del Schema SQL, 🔴 SEC-004 — ALTO: Función `SECURITY DEFINER` sin restricción de invocador, 🔴 SEC-011 — MEDIO: Condición `deleted_at IS NULL` en políticas de tablas sin esa columna, Tablas y Estado de RLS, Área 2: Datos en Reposo — Servidor (RLS y DB)

### Community 129 - "2. `F3.2` — OAuth, PKCE, redirects y callback (`T10`, `SEC-012`)"
Cohesion: 0.67
Nodes (5): cmd_next(), cmd_prompt(), cmd_status(), handoff.sh script, show_help()

### Community 130 - "🧪 Evidencia F0 — Preparación, Estructura y Verificación de Entorno"
Cohesion: 0.47
Nodes (3): idx_push_subs_endpoint, idx_push_subs_user_id, public.push_subscriptions

### Community 132 - "input-otp.tsx"
Cohesion: 0.33
Nodes (5): input-otp, InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 133 - "🟡 PRIORIDAD 3: Medios (Semana 3-4)"
Cohesion: 0.40
Nodes (5): 🟡 PRIORIDAD 3: Medios (Semana 3-4), SEC-007 — URLs firmadas para recibos, SEC-009 — Reemplazar djb2 por SHA-256 en audit logger, SEC-011 — Corregir columnas `deleted_at` faltantes en esquema, SEC-012 — Restringir validación de localhost a paths y puertos conocidos

### Community 134 - "accordion.tsx"
Cohesion: 0.40
Nodes (4): @radix-ui/react-accordion, AccordionContent, AccordionItem, AccordionTrigger

### Community 138 - "Goal"
Cohesion: 0.10
Nodes (25): 1. Panel de Control de Progreso (Progress Dashboard), 2. Lista de Tareas Detallada para el Constructor (Gemini 3.8 Flash), BLOQUE 1 — Primeras Observaciones (Correcciones UI en Resumen Anual y Metas Móvil), BLOQUE 3 — Pruebas Automatizadas, Verificación y Auditoría (Gemini 4 Argon), 🛠️ Registro de Ejecución y Checkpoints: Constructor CLI (`02_OPENCODE_TASKS.md`), DropdownMenuContent, DropdownMenuItem, GoalFolderMutations (+17 more)

### Community 146 - "ui-version-mobile-a11y.test.tsx"
Cohesion: 0.13
Nodes (16): BottomNavV2, MORE_ROUTES, PRIMARY_LEFT_NAV, PRIMARY_RIGHT_NAV, MORE_NAV_LINKS, MoreNavSheet, MoreNavSheetProps, QuickTxModalState (+8 more)

### Community 178 - "vitest"
Cohesion: 0.15
Nodes (13): @capacitor/network, @testing-library/react, vitest, BOOT_STEPS, SplashScreen, DesktopSyncIcon(), isNative, SyncIcon() (+5 more)

## Knowledge Gaps
- **31 isolated node(s):** `@hookform/resolvers`, `@tanstack/query-sync-storage-persister`, `@types/react-window`, `date-fns`, `framer-motion` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 726 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Core Dependencies & Third-Party Packages` to `migration.ts`, `AppShell.tsx`, `input-otp.tsx`, `accordion.tsx`, `Navigation Shell & Responsive Drawers`, `Goal`, `useFinanceData`, `Interactive Toast Notification System`, `react`, `DatosSection.tsx`, `ui-version-mobile-a11y.test.tsx`, `Brand Identity & Accent Palettes`, `Navigation Shell & Responsive Drawers`, `Supabase Authentication & Security Context`, `chart.tsx`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `scroll-area.tsx`, `breadcrumb.tsx`, `PageSkeleton.tsx`, `react-router-dom`, `sheet.tsx`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `useFinanceData()` (e.g. with `Directivas Principales` and `Directivas Principales`) actually correct?**
  _`useFinanceData()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@hookform/resolvers`, `@tanstack/query-sync-storage-persister`, `@types/react-window` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `migration.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09407665505226481 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Autonomous Notification & Scheduling Engine` to `Autonomous Notification & Scheduling Engine`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Should `Autonomous Notification & Scheduling Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.029411764705882353 - nodes in this community are weakly interconnected._
- **Why does `react` connect `AppShell.tsx` to `migration.ts`, `Core Dependencies & Third-Party Packages`, `HistorialV2.tsx`, `Autonomous Notification & Scheduling Engine`, `accordion.tsx`, `input-otp.tsx`, `App.tsx`, `Navigation Shell & Responsive Drawers`, `Goal`, `useFinanceData`, `Interactive Toast Notification System`, `react`, `DatosSection.tsx`, `ui-version-mobile-a11y.test.tsx`, `Brand Identity & Accent Palettes`, `Navigation Shell & Responsive Drawers`, `Supabase Authentication & Security Context`, `sync-store.ts`, `LoginV2.tsx`, `useSessionManager.ts`, `chart.tsx`, `Core Dependencies & Third-Party Packages`, `supabase.ts`, `Core Dependencies & Third-Party Packages`, `Core Dependencies & Third-Party Packages`, `vitest`, `notifications.ts`, `scroll-area.tsx`, `breadcrumb.tsx`, `PageSkeleton.tsx`, `react-router-dom`, `sheet.tsx`, `LoginClassic.tsx`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._