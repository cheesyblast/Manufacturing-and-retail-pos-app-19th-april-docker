"""V6 - Phase 4: Shift reconciliation, petty cash."""
VERSION = "006"
DESCRIPTION = "Phase 4 - Shift records for daily reconciliation, petty cash transactions"


def up(executor):
    # === Shift Records (Daily Reconciliation) ===
    executor.execute("""
        CREATE TABLE IF NOT EXISTS shift_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            location_id UUID NOT NULL REFERENCES locations(id),
            cashier_id UUID NOT NULL REFERENCES users(id),
            cashier_name VARCHAR(255),
            shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
            opening_float DECIMAL(12,2) DEFAULT 0,
            cash_sales DECIMAL(12,2) DEFAULT 0,
            card_sales DECIMAL(12,2) DEFAULT 0,
            transfer_sales DECIMAL(12,2) DEFAULT 0,
            manual_income DECIMAL(12,2) DEFAULT 0,
            manual_expenses DECIMAL(12,2) DEFAULT 0,
            expected_cash DECIMAL(12,2) DEFAULT 0,
            actual_cash DECIMAL(12,2),
            discrepancy DECIMAL(12,2) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
            notes TEXT,
            closed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)

    # === Petty Cash Transactions (per-outlet manual income/expense) ===
    executor.execute("""
        CREATE TABLE IF NOT EXISTS petty_cash (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            shift_id UUID REFERENCES shift_records(id),
            location_id UUID NOT NULL REFERENCES locations(id),
            type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
            category VARCHAR(100) NOT NULL,
            description TEXT,
            amount DECIMAL(12,2) NOT NULL,
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)

    # Indexes
    executor.execute("CREATE INDEX IF NOT EXISTS idx_shift_records_location ON shift_records(location_id);")
    executor.execute("CREATE INDEX IF NOT EXISTS idx_shift_records_date ON shift_records(shift_date);")
    executor.execute("CREATE INDEX IF NOT EXISTS idx_petty_cash_location ON petty_cash(location_id);")
    executor.execute("CREATE INDEX IF NOT EXISTS idx_petty_cash_shift ON petty_cash(shift_id);")

    # RLS
    for table in ["shift_records", "petty_cash"]:
        executor.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        executor.execute(f"""
            DO $$ BEGIN
                CREATE POLICY "Allow all for {table}" ON {table}
                    FOR ALL USING (true) WITH CHECK (true);
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """)
