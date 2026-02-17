# Transporti V1 — Frontend Architecture

## Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4 |
| Maps | Leaflet + react-leaflet |
| Icons | Lucide React |
| Auth | JWT (access + refresh tokens) |

## Directory Structure
```
frontend/
├── app/                    # Next.js App Router pages
│   ├── (admin)/           # Admin panel (AuthGuard: admin only)
│   ├── (app)/             # Main app (AuthGuard: client, transporter, admin)
│   ├── (auth)/            # Login, Register (public)
│   ├── (marketing)/       # Landing page (public)
│   ├── layout.tsx         # Root layout: AuthProvider + ToastProvider
│   └── page.tsx           # Root landing page
├── components/            # Reusable UI components (16 domain folders)
│   ├── admin/             # Admin-specific (StatusBadge, etc.)
│   ├── auth/              # AuthGuard, RoleSwitcher
│   ├── booking/           # Booking flow
│   ├── dashboard/         # Dashboard cards
│   ├── jobs/              # Job listing, creation, preview
│   ├── layout/            # Header, Footer, TrustFooter
│   ├── map/               # RouteMap, MapMarkers
│   ├── messaging/         # Chat, ContactReveal
│   ├── navigation/        # AppSidebar, AppHeader, BottomNav
│   ├── offers/            # Offer forms, lists, status
│   ├── profile/           # Profile cards, stats, reviews
│   └── ui/                # Toast, generic UI
├── contexts/              # React contexts (AuthContext)
├── hooks/                 # Custom hooks (useAuth, useDashboard, useJobs, useAdminData)
└── lib/                   # Business logic & data
    ├── api/               # API client (fetch + JWT), tokenManager
    ├── services/          # Data services (jobs, dashboard, admin, notifications)
    ├── auth.ts            # Types, mock users, route access config
    ├── config.ts          # Runtime config (USE_BACKEND, FALLBACK_TO_MOCK)
    └── dashboard.ts       # Dashboard types & mock data
```

## Key Patterns

### API Dual-Mode
```typescript
// lib/config.ts → config.USE_BACKEND toggles real/mock
// lib/services/*.ts → each service tries API first, falls back to mock
const result = await getJobs(); // → { data: Job[], source: 'api' | 'mock' }
```

### Authentication
- `AuthContext` provides `login()` (mock) and `loginWithCredentials()` (real JWT)
- `AuthGuard` wraps route groups with role-based access control
- `routeAccess` map in `lib/auth.ts` defines per-route permissions
- Default access policy: **deny** (secure by default)

### Route Groups
| Group | Auth | Layout |
|-------|------|--------|
| `(marketing)` | Public | Header + Footer |
| `(auth)` | Public | Minimal |
| `(app)` | Require login | Sidebar + AppHeader + BottomNav |
| `(admin)` | Require admin | Admin layout |

## Running
```bash
npm run dev     # Development (port 3000)
npm run build   # Production build
npm run lint    # ESLint check
```

## Environment
See `.env.local` for backend API configuration.
