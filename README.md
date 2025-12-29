# Transporti V1 (Production)

This is the production codebase for Transporti V1, built as a Modular Monolith.

## Architecture

- **Backend**: Django (Python)
- **Database**: PostgreSQL (Schematic isolation per module)
- **Frontend**: Flutter / React

## Directory Structure

```
transporti_v1/
├── backend/                # Django Backend
│   ├── transporti_core/    # Core Settings & Config
│   ├── users/              # Auth & User Management
│   ├── trust/              # Verification & Security
│   ├── logistics/          # Jobs & Offers
│   ├── payments/           # Escrow & Transaction
│   ├── reviews/            # Reputation System
│   ├── support/            # Disputes
│   ├── notifications/      # Real-time alerts
│   └── messaging/          # In-app chat (Anti-bypass)
└── docs/                   # Architecture Documentation
```

## Setup

1. Run `setup_v1_scaffold.bat` to initialize the project structure.
2. Configure `.env` with DB credentials.
3. Run migrations.
