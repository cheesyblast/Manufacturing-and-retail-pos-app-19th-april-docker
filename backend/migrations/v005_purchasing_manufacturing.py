"""V5 - Phase 3: Landed cost on POs, wastage on BOMs, labor cost on production."""
VERSION = "005"
DESCRIPTION = "Phase 3 - Purchasing landed cost, BOM wastage %, production costing"


def up(executor):
    # === Purchasing: Landed Cost ===
    executor.execute("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS global_charges DECIMAL(12,2) DEFAULT 0;")
    executor.execute("ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS unit_landed_cost DECIMAL(12,2) DEFAULT 0;")

    # === Manufacturing: Wastage & Costing ===
    executor.execute("ALTER TABLE bom_items ADD COLUMN IF NOT EXISTS wastage_percent DECIMAL(5,2) DEFAULT 0;")
    executor.execute("ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(12,2) DEFAULT 0;")
    executor.execute("ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS wastage_cost DECIMAL(12,2) DEFAULT 0;")
    executor.execute("ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS material_cost DECIMAL(12,2) DEFAULT 0;")
    executor.execute("ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12,2) DEFAULT 0;")

    # === Weighted Average Cost tracking on products ===
    executor.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS weighted_avg_cost DECIMAL(12,2) DEFAULT 0;")
