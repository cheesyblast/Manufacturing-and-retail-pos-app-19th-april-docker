# TextileERP - Manufacturing & Retail ERP with POS

## Original Problem Statement
Build a full-stack manufacturing and retail ERP with POS using Supabase relational database. Flow: Purchasing -> Manufacturing -> Inventory -> Sales & POS. Accounting module with Revenue, COGS, Expenses, Daily Sales Report, Income Statements and Balance Sheet.

## Architecture
- **Backend**: FastAPI (Python) + supabase-py client + psycopg2 (direct DB for migrations)
- **Frontend**: React + Tailwind CSS + Shadcn UI + Phosphor Icons + Recharts
- **Database**: Supabase (PostgreSQL) - 25+ relational tables
- **Auth**: Custom JWT with bcrypt password hashing
- **Design**: Quiet Luxury aesthetic (beige/navy), Cabinet Grotesk + Manrope fonts
- **Migration Framework**: Auto-run on startup via Supabase RPC exec_sql()

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
- **Auto Migration Framework**: 6 versioned migrations, database-agnostic, auto-runs on startup
- **Multi-Location Support**: location_id on users, expenses, manual_transactions
- **Product Attributes & Variants**: Dynamic attributes (Color, Batch, Size), variant SKUs
- **Tax & Compliance (Sri Lanka 2026)**: VAT 18%, SSCL 2.5%, global toggle, tax on POS/receipts
- **Purchasing Landed Cost**: Global charges distributed proportionally, unit landed cost
- **Manufacturing Wastage**: BOM wastage %, material decrement with wastage on production
- **Shift Reconciliation**: Open/close shifts, petty cash, expected vs actual cash, discrepancy flagging
- **Dashboard Analytics**: Recharts (Line/Pie/Bar), Profit Center filter (location + 7d/30d/90d)
- **User Location Assignment**: Assign cashiers/staff to specific outlets

## Database Tables (V3)
users, suppliers, raw_materials, purchase_orders, purchase_order_items, locations, products, inventory, stock_transfers, stock_transfer_items, bill_of_materials, bom_items, production_orders, production_logs, customers, sales, sale_items, payments, expenses, app_settings, manual_transactions, transaction_categories, custom_orders, custom_order_items, custom_order_payments, product_attributes, product_variants, product_variant_attributes, shift_records, petty_cash, _migrations

## Prioritized Backlog
### P1
- Location-based access filtering (auto-filter POS/inventory views by user's assigned location on login)

### P2
- notify.lk SMS integration for receipts & custom order notifications
- WhatsApp Business API for "Ready for Pickup" messages
- Barcode label printing
- Customer loyalty tiers
- Multi-currency support
- Export reports to PDF/Excel
- Sample inventory data for POS demonstration
