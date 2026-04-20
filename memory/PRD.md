# ERP SaaS - Manufacturing & Retail ERP with POS

## Original Problem Statement
Build a SaaS-ready full-stack manufacturing and retail ERP with POS using Supabase relational database. The system must support multi-tenant deployment with a first-time setup wizard, white-label branding, and automatic database provisioning.

## Architecture
- **Backend**: FastAPI (Python 3.11) + supabase-py + psycopg2 (direct DB for migrations)
- **Frontend**: React + Tailwind CSS + Shadcn UI + Phosphor Icons + Recharts
- **Database**: Supabase (PostgreSQL) - 25+ relational tables
- **Auth**: Custom JWT with bcrypt password hashing
- **Design**: Quiet Luxury aesthetic (beige/navy)
- **Migration Framework**: Auto-run on startup via Supabase RPC exec_sql()
- **SaaS Model**: Setup wizard for per-instance configuration, .env-based config storage
- **Production**: Gunicorn + Uvicorn workers, Nginx reverse proxy, systemd service

## What's Been Implemented

### V1 (April 15, 2026)
- 18 core Supabase tables with indexes and RLS
- JWT auth with role-based access (admin, production_staff, cashier)
- Full Purchasing, Manufacturing, Inventory, POS, Accounting modules
- Quiet Luxury UI

### V2 (April 15, 2026)
- Performance: Server-side pagination, in-memory caching, debounced search
- Brand Management: Logo upload, dynamic sidebar/receipt branding
- Manual Transactions: Income/expense recording with custom categories
- Print Receipts: 80mm thermal printer CSS
- Bulk Import: CSV templates + upload with SKU validation
- Custom Orders: Full module with status tracking, partial payments
- Income Statement & Balance Sheet

### V3 (April 17, 2026)
- Auto Migration Framework (6 versioned migrations, database-agnostic)
- Multi-Location Support (location_id on users, expenses, transactions)
- Product Attributes & Variants (dynamic: Color, Batch, Size, etc.)
- Tax & Compliance (Sri Lanka 2026): VAT 18%, SSCL 2.5%, global toggle
- Purchasing Landed Cost (global charges, unit landed price)
- Manufacturing Wastage (BOM wastage %, auto-adjusted inventory)
- Shift Reconciliation (open/close shifts, petty cash, discrepancy flagging)
- Dashboard Analytics (Recharts: Line/Pie/Bar, Profit Center filter)

### V4 — SaaS (April 17, 2026)
- **Setup Wizard** (/setup): Detects fresh install, collects Supabase credentials, auto-creates exec_sql, runs all migrations, creates admin
- **White-Label Branding**: Dynamic business name in title, sidebar, login, receipts. No hardcoded product names.
- **Setup Guard**: /setup/initialize blocked once SETUP_COMPLETE=true. Middleware blocks API access until configured.
- **Dynamic Config**: .env-based per-instance configuration. Fresh deploy → wizard → new client.
- **Email Config UI**: Settings tab for SMTP (Forgot Password ready when SMTP configured)
- **Sidebar Brand Caching**: localStorage cache to eliminate flash of default name

### V5 — Deployment Readiness (April 19, 2026)
- **Cleaned requirements.txt**: Trimmed from 142 to 11 direct dependencies
- **Removed Emergent tooling**: @emergentbase/visual-edits, PostHog analytics, Emergent badge
- **Simplified craco.config.js**: Minimal webpack alias config only
- **Cleaned index.html**: No third-party scripts or tracking
- **Fixed ESLint build error**: DISABLE_ESLINT_PLUGIN=true for production build
- **Deployment artifacts**: deploy.sh, update.sh, nginx/erp.conf, systemd/erp-backend.service
- **Documentation**: DEPLOYMENT.md with full manual + automated deployment steps
- **Environment templates**: backend/.env.example, frontend/.env.example
- **Runtime pinning**: .nvmrc (Node 20.20.2), .python-version (Python 3.11)
- **Cleaned .gitignore**: Production-appropriate ignore rules
- **Removed dead files**: Unused SetupPage.jsx, legacy migration SQL files, orphaned test file
- **Yarn-only**: Removed npm/eslint dev tooling, standardized on yarn
- **Setup Wizard Bug Fix**: SETUP_COMPLETE=true now only set after admin creation (was premature). Intermediate state detection added — wizard auto-skips to step 3 if DB is ready but no admin exists. create-admin endpoint gracefully handles existing admin.
- **Docker Deployment**: Multi-stage Dockerfile (Node 20 builds frontend, Python 3.11 runs backend), docker-compose.yml, .dockerignore. One container serves both API + frontend static files. deploy.sh and update.sh updated for Docker workflow. Nginx on host handles SSL.

## Database Tables (25+)
users, suppliers, raw_materials, purchase_orders, purchase_order_items, locations, products, inventory, stock_transfers, stock_transfer_items, bill_of_materials, bom_items, production_orders, production_logs, customers, sales, sale_items, payments, expenses, app_settings, manual_transactions, transaction_categories, custom_orders, custom_order_items, custom_order_payments, product_attributes, product_variants, product_variant_attributes, shift_records, petty_cash, _migrations

## Prioritized Backlog
### P1
- Forgot Password / Reset Password flow using SMTP settings
- Location-based access filtering (auto-filter POS/inventory by user's assigned outlet)

### P2
- Customer loyalty tiers (Bronze/Silver/Gold)
- Sample inventory data for POS demo
- Multi-currency support
- Export reports to PDF/Excel
- SMS/WhatsApp notifications (notify.lk)
- Barcode label printing
- Weighted Average Cost recalculation on PO receive
