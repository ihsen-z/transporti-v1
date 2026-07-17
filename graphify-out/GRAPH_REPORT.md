# Graph Report - frontend  (2026-07-17)

## Corpus Check
- 174 files · ~123,461 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 935 nodes · 2068 edges · 76 communities (62 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.72)
- Token cost: 26,000 input · 3,859 output

## Community Hubs (Navigation)
- Components + Admin UI
- Components + UI Components
- Lib/Utils + API Layer
- Components + App Router
- Components + Lib/Utils
- Components + App Router
- Components + Lib/Utils
- Components + App Router
- Components + App Router
- Components + App Router
- Community 10
- Lib/Utils + API Services
- App Router + Lib/Utils
- Lib/Utils + App Router
- App Router + Lib/Utils
- Community 15
- Community 16
- Components + App Router
- App Router + Admin UI
- Community 19
- Admin UI + Lib/Utils
- Components + Admin UI
- Admin UI + App Router
- Admin UI + App Router
- Components + App Router
- App Router + Components
- Admin UI + App Router
- App Router + Components
- Components + Admin UI
- App Router + Admin UI
- App Router + Hooks
- Lib/Utils + API Services
- Lib/Utils
- Components + UI Components
- Lib/Utils + API Services
- Admin UI + App Router
- Components + Lib/Utils
- Community 37
- App Router + Admin UI
- Components + Auth
- Components + UI Components
- Components
- Components + UI Components
- Community 43
- Scripts
- Components + Lib/Utils
- Community 46
- Types
- App Router
- Components
- Components + Lib/Utils
- Lib/Utils + Types
- Components + UI Components
- Components + UI Components
- Components + Dashboard
- Community 63
- Community 64
- Community 66
- .Husky
- .Husky
- .Husky
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74

## God Nodes (most connected - your core abstractions)
1. `useAppI18n()` - 122 edges
2. `useAuth()` - 60 edges
3. `formatDate()` - 44 edges
4. `useToast()` - 41 edges
5. `apiClient` - 38 edges
6. `interpolate()` - 38 edges
7. `formatTND` - 27 edges
8. `ApiError` - 24 edges
9. `useI18n()` - 24 edges
10. `getMediaUrl()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `ActionModalProps` --references--> `AdminUser`  [EXTRACTED]
  app/(admin)/admin/users/page.tsx → lib/services/types.ts
- `ClientDashboard()` --calls--> `useAppI18n()`  [EXTRACTED]
  app/(app)/dashboard/page.tsx → lib/i18n/useAppI18n.tsx
- `JobsListPage()` --calls--> `useAuth()`  [EXTRACTED]
  app/(app)/jobs/page.tsx → contexts/AuthContext.tsx
- `AppLayout()` --calls--> `useAppI18n()`  [EXTRACTED]
  app/(app)/layout.tsx → lib/i18n/useAppI18n.tsx
- `StatusBadge()` --calls--> `useAppI18n()`  [EXTRACTED]
  app/(app)/messages/page.tsx → lib/i18n/useAppI18n.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Role-Based Access Control Flow** — readme_auth_guard, readme_route_access, readme_route_groups, readme_deny_by_default [EXTRACTED 0.90]
- **API/Mock Dual-Mode Data Flow** — readme_api_dual_mode, readme_config, readme_data_services, readme_api_client [INFERRED 0.85]

## Communities (76 total, 14 thin omitted)

### Community 0 - "Components + Admin UI"
Cohesion: 0.05
Nodes (44): AdminLayoutInner(), MOCK_PROFILE, MOCK_REVIEWS, TransporterProfilePage(), AdminHeader(), AdminHeaderProps, AdminSidebar(), DashboardConfigContext (+36 more)

### Community 1 - "Components + UI Components"
Cohesion: 0.05
Nodes (25): ClientDashboard(), ClientStats, DashboardPage(), RecentJob, TransporterStats, ClientJobsView(), JOB_TYPE_CONFIG, JobsListPage() (+17 more)

### Community 2 - "Lib/Utils + API Layer"
Cohesion: 0.08
Nodes (34): GOVERNORATES, NotificationPrefsResponse, ProfileApiResponse, ProfileUpdateResponse, SettingsPage(), SettingsTab, TABS, CATEGORY_TO_BACKEND (+26 more)

### Community 3 - "Components + App Router"
Cohesion: 0.08
Nodes (18): ForgotPasswordPage(), ResetPasswordPage(), roleOptions, SelectableRole, AnimatedSection(), Home(), AuthLogo(), COLORS (+10 more)

### Community 4 - "Components + Lib/Utils"
Cohesion: 0.09
Nodes (28): MapPreviewCard(), MapPreviewCardProps, RouteMap, COLORS, createPremiumMarker(), createSimpleMarker(), generateCircleShape(), generateDiamondShape() (+20 more)

### Community 5 - "Components + App Router"
Cohesion: 0.15
Nodes (22): JobDetailsPage(), TransporterMissionsView(), WalletData, WalletHistoryItem, WalletPage(), SelectRolePage(), MyOffer, MyOfferCard() (+14 more)

### Community 6 - "Components + Lib/Utils"
Cohesion: 0.12
Nodes (22): makeInitialFormData(), NewJobPage(), STEPS, toLocalDatetimeValue(), JobTypeSelector(), JobTypeSelectorProps, GOVERNORATES, GpsState (+14 more)

### Community 7 - "Components + App Router"
Cohesion: 0.12
Nodes (19): TransporterDashboard(), AppError(), BookingPage(), BookingStep, JobData, OfferData, NotFound(), BookingSummary() (+11 more)

### Community 8 - "Components + App Router"
Cohesion: 0.12
Nodes (20): ConversationCard, ConversationItem, LastMessage, MessagesInboxPage(), relativeTime(), STATUS_STYLES, StatusBadge(), ActionButton (+12 more)

### Community 9 - "Components + App Router"
Cohesion: 0.13
Nodes (17): GOVERNORATES, TransporterData, TransporterProfilePage(), VerificationDoc, VerificationPage(), PhotoUploader(), PhotoUploaderProps, UploadResponse (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 11 - "Lib/Utils + API Services"
Cohesion: 0.19
Nodes (20): AdminPaymentsPage(), PaymentStatusFilter, emptyStats, useAdminPayments(), useAdminUsers(), BackendEscrow, getAdminJobs(), getAdminPayments() (+12 more)

### Community 12 - "App Router + Lib/Utils"
Cohesion: 0.12
Nodes (18): CreateDisputeModal(), Dispute, DisputesPage(), DisputesT, getJobTypeLabels(), getReasonLabels(), getStatusConfig(), UserJob (+10 more)

### Community 13 - "Lib/Utils + App Router"
Cohesion: 0.15
Nodes (16): cairo, inter, metadata, categoryIcons, NotificationDropdown(), NotificationDropdownProps, ToastProvider(), NotificationContext (+8 more)

### Community 14 - "App Router + Lib/Utils"
Cohesion: 0.14
Nodes (17): ConversationInfo, dateSeparatorLabel(), isDifferentDay(), JobInfo, MessageItem, MessagesResponse, MessagingPage(), OtherParty (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (19): @commitlint/cli, eslint, lint-staged, devDependencies, @commitlint/cli, eslint, lint-staged, tailwindcss (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (19): API Client (lib/api, fetch + JWT, tokenManager), API Dual-Mode Pattern, App Router Pages (app/), AuthContext, AuthGuard, Runtime Config (lib/config.ts), Custom Hooks (useAuth, useDashboard, useJobs, useAdminData), Data Services (lib/services) (+11 more)

### Community 17 - "Components + App Router"
Cohesion: 0.18
Nodes (12): ClientData, ClientProfilePage(), ReviewData, ProfilePage(), AppHeader(), BottomNav(), CLIENT_STEPS, OnboardingStep (+4 more)

### Community 18 - "App Router + Admin UI"
Cohesion: 0.15
Nodes (16): AdminVerificationsPage(), MainView, ProfileFilterTab, profileStatusLabels, statusColors, statusLabels, VerifFilterTab, VerificationStatus (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (17): date-fns, leaflet, lucide-react, next, dependencies, date-fns, leaflet, lucide-react (+9 more)

### Community 20 - "Admin UI + Lib/Utils"
Cohesion: 0.18
Nodes (12): DashboardContent(), RevenueChart, StatCardProps, useActivityLogs(), useAdminJobs(), useAdminStats(), useSystemAlerts(), formatTimeAgoShort() (+4 more)

### Community 21 - "Components + Admin UI"
Cohesion: 0.18
Nodes (12): AdminJobDetailPage(), RevenueChart(), RevenueChartProps, ASPECT_LABELS, ReviewCard(), ReviewCardProps, ReviewData, ASPECT_LABELS (+4 more)

### Community 22 - "Admin UI + App Router"
Cohesion: 0.16
Nodes (11): AdminReviewsPage(), FilterTab, severityColors, Column, DataTableProps, useAdminReviews(), BackendReview, BackendReviewAbuseLog (+3 more)

### Community 23 - "Admin UI + App Router"
Cohesion: 0.17
Nodes (12): ActionModalProps, AdminUsersPage(), ModalAction, RoleFilter, UserDetail, UserDetailDrawer(), RoleBadge(), UserStatusBadge() (+4 more)

### Community 24 - "Components + App Router"
Cohesion: 0.16
Nodes (8): JobBrowsePage(), GOVERNORATES, ReturnTripsPage(), JobFeedCard(), JobFeedCardProps, JobFilters(), JobFiltersProps, JobFiltersValue

### Community 25 - "App Router + Components"
Cohesion: 0.16
Nodes (12): ApiOffer, mapApiOffer(), MappedOffer, MyOffersPage(), shortAddress(), TabFilter, TABS, JOB_TYPE_STYLES (+4 more)

### Community 26 - "Admin UI + App Router"
Cohesion: 0.18
Nodes (12): ConversationData, DisputeData, EscrowData, JobDetail, OfferData, offerStatusColors, offerStatusLabels, JobStatusBadge() (+4 more)

### Community 27 - "App Router + Components"
Cohesion: 0.14
Nodes (11): BookingData, BookingPage(), EscrowData, JobData, GOVERNORATES, ReturnTripPage(), VEHICLE_TYPES, Toast (+3 more)

### Community 28 - "Components + Admin UI"
Cohesion: 0.21
Nodes (13): DOC_PAIR_MAP, DocGroup, docStatusConfig, DocumentReviewDrawer(), DocumentReviewDrawerProps, getDocStatus(), groupDocuments(), isImageFile() (+5 more)

### Community 29 - "App Router + Admin UI"
Cohesion: 0.21
Nodes (12): AdminDisputesPage(), DisputeStatus, FilterTab, reasonLabels, statusColors, statusLabels, useAdminDisputes(), BackendDispute (+4 more)

### Community 30 - "App Router + Hooks"
Cohesion: 0.22
Nodes (10): LoginPage(), RegisterPage(), RegisterRole, roleOptions, GoogleTokenClient, GoogleTokenResponse, loadScript(), useSocialAuth() (+2 more)

### Community 31 - "Lib/Utils + API Services"
Cohesion: 0.27
Nodes (8): UseDataResult, useDataService(), useJobById(), useJobs(), getJobById(), getJobs(), DataSource, PaginatedResponse

### Community 32 - "Lib/Utils"
Cohesion: 0.15
Nodes (3): CURRENCY_SUFFIX, NUM_LOCALE, TIME_AGO_LABELS

### Community 33 - "Components + UI Components"
Cohesion: 0.18
Nodes (7): FieldWrapperProps, Input, InputProps, Select, SelectProps, Textarea, TextareaProps

### Community 34 - "Lib/Utils + API Services"
Cohesion: 0.29
Nodes (9): emptyProfile, emptyStats, useDashboardStats(), useUserProfile(), getDashboardStats(), getUserProfile(), DashboardStats, ServiceResult (+1 more)

### Community 35 - "Admin UI + App Router"
Cohesion: 0.27
Nodes (8): AdminJobsPage(), SortDir, SortKey, StatusFilter, Pagination(), PaginationProps, cancelJob(), forceJobStatus()

### Community 36 - "Components + Lib/Utils"
Cohesion: 0.29
Nodes (6): NotificationBell(), NotificationBellProps, LanguageSwitcher(), roleColors, roleLabels, routeAccess

### Community 37 - "Community 37"
Cohesion: 0.20
Nodes (9): extends, rules, @next/next/no-img-element, react/no-unescaped-entities, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, next/core-web-vitals, next/typescript (+1 more)

### Community 38 - "App Router + Admin UI"
Cohesion: 0.28
Nodes (8): ACTION_COLORS, ACTION_ICONS, AdminAuditLogPage(), AuditEntry, AuditResponse, formatDateTime(), formatTimeAgo(), TARGET_ICONS

### Community 39 - "Components + Auth"
Cohesion: 0.33
Nodes (6): AppLayout(), AuthGuard(), AuthGuardProps, TrustFooter(), canAccess(), UserRole

### Community 40 - "Components + UI Components"
Cohesion: 0.32
Nodes (5): SidebarLogo(), AppSidebar(), NavItem(), NavItemProps, ThemeToggle()

### Community 41 - "Components"
Cohesion: 0.33
Nodes (4): DevNavMenu(), ROUTE_MAP, RouteGroup, RouteItem

### Community 42 - "Components + UI Components"
Cohesion: 0.29
Nodes (6): Button, ButtonProps, ButtonSize, ButtonVariant, SIZE_CLASSES, VARIANT_CLASSES

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, prepare, start, typecheck

### Community 44 - "Scripts"
Cohesion: 0.33
Nodes (6): { execSync }, fs, getCurrentBranch(), validateBranchName(), validBranchPrefixes, validExceptions

### Community 45 - "Components + Lib/Utils"
Cohesion: 0.40
Nodes (5): JobTimeline(), JobTimelineProps, statusToIndex, TimelineStep, Job

### Community 46 - "Community 46"
Cohesion: 0.33
Nodes (5): engines, node, name, private, version

### Community 47 - "Types"
Cohesion: 0.33
Nodes (5): Area, Cropper, CropperProps, Point, react-easy-crop

### Community 48 - "App Router"
Cohesion: 0.40
Nodes (4): FAQ_SECTIONS, HelpCenterPage(), react, react

### Community 49 - "Components"
Cohesion: 0.60
Nodes (4): createImage(), getCroppedImg(), ImageCropper(), ImageCropperProps

### Community 50 - "Components + Lib/Utils"
Cohesion: 0.50
Nodes (4): JobPreview(), JobPreviewData, JobPreviewProps, JobSpecifications

### Community 51 - "Lib/Utils + Types"
Cohesion: 0.40
Nodes (4): ClientDashboardStats, DashboardResponse, DashboardStats, TransporterDashboardStats

## Knowledge Gaps
- **327 isolated node(s):** `next/core-web-vitals`, `next/typescript`, `@typescript-eslint/no-explicit-any`, `warn`, `@next/next/no-img-element` (+322 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAppI18n()` connect `Components + App Router` to `Components + Admin UI`, `Components + UI Components`, `Lib/Utils + API Layer`, `Components + App Router`, `Components + App Router`, `Components + Lib/Utils`, `Components + App Router`, `Components + App Router`, `App Router + Lib/Utils`, `App Router + Lib/Utils`, `Components + App Router`, `Components + App Router`, `App Router + Components`, `App Router + Components`, `App Router + Hooks`, `Components + Lib/Utils`, `Components + Auth`, `Components + UI Components`, `Components + Lib/Utils`, `Components + Lib/Utils`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Components + App Router` to `Components + UI Components`, `Lib/Utils + API Layer`, `Components + App Router`, `Components + Lib/Utils`, `Components + App Router`, `Components + Lib/Utils`, `Components + App Router`, `Components + App Router`, `Components + App Router`, `Components + Auth`, `Components + UI Components`, `App Router + Lib/Utils`, `Lib/Utils + App Router`, `App Router + Lib/Utils`, `Components + App Router`, `App Router + Components`, `App Router + Components`, `App Router + Hooks`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `apiClient` connect `Components + App Router` to `Components + UI Components`, `Lib/Utils + API Layer`, `Components + Lib/Utils`, `Components + App Router`, `Components + App Router`, `Components + App Router`, `Lib/Utils + API Services`, `App Router + Lib/Utils`, `Lib/Utils + App Router`, `App Router + Lib/Utils`, `Components + App Router`, `Admin UI + App Router`, `Components + App Router`, `App Router + Components`, `Admin UI + App Router`, `App Router + Components`, `Lib/Utils + API Services`, `Lib/Utils + API Services`, `Admin UI + App Router`, `App Router + Admin UI`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `next/typescript`, `@typescript-eslint/no-explicit-any` to the rest of the system?**
  _327 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Components + Admin UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05129561078794289 - nodes in this community are weakly interconnected._
- **Should `Components + UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.051515151515151514 - nodes in this community are weakly interconnected._
- **Should `Lib/Utils + API Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.08130081300813008 - nodes in this community are weakly interconnected._