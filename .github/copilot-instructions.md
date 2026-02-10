# Transporti V1 - AI Assistant Instructions

## Project Overview
**Transporti** is a peer-to-peer ride and logistics platform with role-based marketplace features. It uses Django REST Framework (backend) + Next.js (frontend) with a trust-based verification system to manage transporter eligibility.

## Architecture

### Backend Stack (Django)
- **Framework**: Django 5.0+ with Django REST Framework
- **Auth**: JWT-based via `rest_framework_simplejwt`
- **Database**: SQLite (development), PostgreSQL-ready
- **Custom User Model**: `users.User` with roles (CLIENT, TRANSPORTER, ADMIN, MODERATOR)

### Core Modules (9 apps)
| Module | Purpose | Key Pattern |
|--------|---------|-------------|
| **users** | Auth, roles, profiles | Custom `User` model with `role` field |
| **trust** | Transporter verification & scoring | Gates logistics operations; admin-enforced approval |
| **logistics** | Jobs & offers marketplace | JSONB specs; explicit status workflows |
| **payments** | COD ledger & escrow | State-machine transactions; integrity constraints |
| **analytics** | User presence & session tracking | Middleware-driven, throttled writes |
| **notifications** | Event-driven alerts | Connects to other modules via service calls |
| **messaging** | User-to-user chat | Encrypted fields expected (TBD) |
| **reviews** | Ratings after job completion | Post-transaction feedback system |
| **support** | Dispute/help tickets | Cross-module issue resolution |

### Frontend (Next.js 14)
- **Routing**: File-based with route groups `(admin)`, `(app)`, `(marketing)`
- **Styling**: Tailwind CSS + custom globals
- **Maps**: React Leaflet (logistics visualization)
- **HTTP**: Axios or fetch to `/api/` endpoints

## Critical Patterns

### 1. Trust Guard System
All transporter operations flow through `check_transporter_trust()` in `logistics/services.py`:
```python
# Enforced in logistics operations
profile = check_transporter_trust(user, require_verified=True, scope='ACCEPT_OFFER')
# Raises: TrustProfileMissingError, TrustVerificationRequiredError, TrustRejectededError
```
**Key Rule**: Rejected transporters are FULLY BLOCKED; no overrides allowed. Admin overrides exist only for other cases.

### 2. Model Integrity Constraints
Models use Django `CheckConstraint` for critical rules:
- **Offers**: `total_price >= price_net` (no negative commission)
- **Payments**: All monetary fields >= 0; ledger accuracy enforced
- Example: `logistics.Offer` ensures triple-entry accounting (price_net + commission_amount = total_price)

### 3. Service Layer Architecture
Every app has a `services.py` with:
- Business logic separated from views
- Explicit exceptions with domain context
- Production logging with scoped loggers (e.g., `logger = logging.getLogger('transporti')`)
- Example: `logistics.services.check_transporter_trust()` logs all guard decisions

### 4. Status Machines (State Transitions)
Resources use `TextChoices` enums for state management:
- **Jobs**: DRAFT → PUBLISHED → MATCHED → IN_PROGRESS → COMPLETED (or CANCELLED/DISPUTED)
- **Offers**: PENDING → ACCEPTED/REJECTED/EXPIRED/WITHDRAWN
- **Verification**: UNVERIFIED → PENDING → VERIFIED (or REJECTED/SUSPENDED)
- **Escrow**: INITIATED → HELD → RELEASED/REFUNDED/FAILED

### 5. Middleware-Driven Analytics
`analytics.middleware.PresenceMiddleware` auto-tracks:
- User `last_seen_at` (throttled: 30s minimum between writes)
- Session enforcement (one active per user)
- Attached to request as `request.analytics_session`

### 6. Async/Background Work (Redis + Celery)
Project includes Celery + Redis in requirements. Patterns likely used for:
- Notification dispatch (see `notifications.services`)
- Scheduled offer expiry
- Large data aggregations

## Development Workflow

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

### Testing
- Run tests: `python manage.py test <app_name>`
- Each module has `tests.py`; priority modules: users, trust, logistics, payments

### API Documentation
- OpenAPI/Swagger available at `/api/docs/`
- Schema endpoint: `/api/schema/`
- Powered by `drf_spectacular`

## Key Conventions

### Exception Handling
Prefer explicit domain exceptions over generic ones:
```python
# Good
raise TrustScoreInsufficientError("Score below policy threshold")
# Avoid
raise ValidationError("Invalid state")
```

### Serializers Pattern
Use `rest_framework.serializers.ModelSerializer` with explicit field lists:
- Admin serializers in separate files (e.g., `serializers_admin.py`)
- Validates data before service layer
- Returns dicts that map to model constraints

### Logging Strategy
- Scope all loggers: `logger = logging.getLogger('transporti')`
- Log guard decisions (TRUST_GUARD_BLOCKED, TRUST_GUARD_OVERRIDE) with user context
- Include action/reason for audit trails

### Database Indexes
Always add `db_index=True` for frequently queried fields:
- Status fields (workflow filtering)
- User/owner ForeignKeys (permission checks)
- Timestamps (range queries)
- Composite indexes in `Meta.indexes` for complex queries

## Integration Points

### Transporter Workflow
1. **User Register** → `users.User(role=TRANSPORTER)`
2. **Trust Init** → `trust.models.TrustProfile.create()`
3. **Submit Verification** → `trust.models.VerificationRequest`
4. **Admin Approval** → Status changes to VERIFIED
5. **Create Offer** → `check_transporter_trust()` gates the operation
6. **Payment/Escrow** → `payments.models.EscrowTransaction` created on acceptance

### Event Cascade Example
Job state change: DRAFT → PUBLISHED
- Triggers offer notification in `notifications.services`
- Queried by `analytics` for marketplace metrics
- Affects `reviews` eligibility (only completed jobs)

## Security Considerations

### Production Hardening (settings.py)
- HTTPS enforced when `ENV=production`
- HSTS headers, secure cookies
- CORS configured (cross-origin with frontend origin)
- No debug mode in production

### User Auth Flow
- JWT tokens via `rest_framework_simplejwt`
- Custom `User` model (email as USERNAME_FIELD, not username)
- Role-based access in views/serializers

### Data Sensitivity
- **Payments**: All monetary values use `DecimalField` (no floats)
- **Escrow**: State machine prevents double-release
- **Verification**: Admin-only actions on trust profiles

## Code Style Notes

- Use full module imports in services: `from trust.models import TrustProfile`
- Avoid circular imports; use string refs in ForeignKey choices
- Docstrings include business context (e.g., "Raised when transporter trust is rejected")
- Use `related_name` for reverse queries: `transporter.offers.all()`

## Common Tasks

### Add a New Endpoint
1. Define model or extend existing (with proper indexes/constraints)
2. Create serializer in `app/serializers.py`
3. Add view method/class in `app/views.py`
4. Register URL in `app/urls.py` → imported in `transporti_core/urls.py`
5. Add trust checks if affecting transporter operations

### Fix a Constraint Violation
1. Check model `Meta.constraints` and `Meta.indexes`
2. Review service layer logic that creates/updates the record
3. Add validation in serializer if user-facing
4. Update migration if schema changed

### Debug a Trust Guard Block
- Enable `DEBUG=True` and check logs
- Review `check_transporter_trust()` in `logistics/services.py`
- Check `TrustProfile.verification_status` and active overrides in `trust.services_admin`
- Verify trust policy thresholds in `trust.models.TrustPolicy`
