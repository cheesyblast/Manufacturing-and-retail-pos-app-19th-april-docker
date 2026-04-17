"""V4 - Phase 2: Tax & Compliance (Sri Lanka 2026) - VAT 18%, SSCL 2.5%."""
VERSION = "004"
DESCRIPTION = "Phase 2 - Tax settings, VAT/SSCL fields on sales, global tax toggle"


def up(executor):
    # Add tax breakdown columns to sales
    executor.execute("ALTER TABLE sales ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(12,2) DEFAULT 0;")
    executor.execute("ALTER TABLE sales ADD COLUMN IF NOT EXISTS sscl_amount DECIMAL(12,2) DEFAULT 0;")
    executor.execute("ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT FALSE;")

    # Seed default tax settings
    executor.execute("""
        INSERT INTO app_settings (key, value)
        SELECT 'tax_active', 'false'
        WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'tax_active');
    """)
    executor.execute("""
        INSERT INTO app_settings (key, value)
        SELECT 'vat_rate', '18'
        WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'vat_rate');
    """)
    executor.execute("""
        INSERT INTO app_settings (key, value)
        SELECT 'sscl_rate', '2.5'
        WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'sscl_rate');
    """)
