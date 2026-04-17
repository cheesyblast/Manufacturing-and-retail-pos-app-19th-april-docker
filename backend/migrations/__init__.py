"""
Database Migration Framework for TextileERP.
Auto-detects missing tables/columns and runs migrations from scratch on any fresh database.
Tracks applied migrations in a `_migrations` table.

Execution strategy:
  1. Try direct PostgreSQL via DATABASE_URL (fastest, for local/VM deployments)
  2. Fall back to Supabase RPC exec_sql() function (for containerized/serverless)
"""
import os
import importlib
import pkgutil
import logging

logger = logging.getLogger(__name__)


class DirectPGExecutor:
    """Execute SQL via direct psycopg2 connection."""

    def __init__(self):
        import psycopg2
        db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            raise ValueError("DATABASE_URL not set")
        self.conn = psycopg2.connect(db_url, connect_timeout=5)
        self.conn.autocommit = False

    def execute(self, sql, params=None):
        cursor = self.conn.cursor()
        cursor.execute(sql, params)
        return cursor

    def fetchall(self, sql, params=None):
        cursor = self.execute(sql, params)
        return cursor.fetchall()

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()


class SupabaseRPCExecutor:
    """Execute SQL via Supabase exec_sql() RPC function."""

    def __init__(self):
        from database import supabase
        self.sb = supabase
        # Verify exec_sql function exists
        self.sb.rpc("exec_sql", {"sql_text": "SELECT 1"}).execute()

    def execute(self, sql, params=None):
        if params:
            # Simple parameter substitution for %s style params
            import re
            for p in params:
                escaped = str(p).replace("'", "''")
                sql = sql.replace("%s", f"'{escaped}'", 1)
        self.sb.rpc("exec_sql", {"sql_text": sql}).execute()

    def fetchall(self, sql, params=None):
        """For SELECT queries, use the REST API instead."""
        return []

    def commit(self):
        pass  # Each RPC call auto-commits

    def rollback(self):
        pass

    def close(self):
        pass


def get_executor():
    """Get the best available SQL executor."""
    # Try direct PostgreSQL first
    try:
        executor = DirectPGExecutor()
        logger.info("Migration executor: Direct PostgreSQL connection")
        return executor
    except Exception as e:
        logger.info(f"Direct PG unavailable ({str(e)[:60]}), trying Supabase RPC...")

    # Fall back to Supabase RPC
    try:
        executor = SupabaseRPCExecutor()
        logger.info("Migration executor: Supabase RPC (exec_sql)")
        return executor
    except Exception as e:
        logger.error(f"Supabase RPC unavailable: {e}")
        raise RuntimeError("No SQL executor available. Ensure DATABASE_URL or exec_sql() function exists.")


def ensure_migrations_table(executor):
    executor.execute("""
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            version VARCHAR(10) NOT NULL UNIQUE,
            description TEXT,
            applied_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    executor.execute("ALTER TABLE _migrations ENABLE ROW LEVEL SECURITY;")
    executor.execute("""
        DO $$ BEGIN
            CREATE POLICY "Allow all for _migrations" ON _migrations
                FOR ALL USING (true) WITH CHECK (true);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    executor.commit()


def get_applied_migrations(executor):
    """Check which migrations have been applied using the Supabase REST API."""
    try:
        from database import supabase
        result = supabase.table("_migrations").select("version").execute()
        return {row["version"] for row in result.data}
    except Exception:
        return set()


def discover_migrations():
    """Discover all migration modules in the migrations package, sorted by version."""
    migrations = []
    package_dir = os.path.dirname(__file__)
    for _, name, _ in pkgutil.iter_modules([package_dir]):
        if name.startswith("v"):
            mod = importlib.import_module(f"migrations.{name}")
            migrations.append({
                "module_name": name,
                "version": getattr(mod, "VERSION"),
                "description": getattr(mod, "DESCRIPTION"),
                "up": getattr(mod, "up"),
            })
    migrations.sort(key=lambda m: m["version"])
    return migrations


def run_migrations():
    """Run all pending migrations. Safe to call on every startup."""
    try:
        executor = get_executor()
        ensure_migrations_table(executor)

        applied = get_applied_migrations(executor)
        all_migrations = discover_migrations()
        pending = [m for m in all_migrations if m["version"] not in applied]

        if not pending:
            logger.info("Database is up to date. No migrations to run.")
            executor.close()
            return True

        for migration in pending:
            version = migration["version"]
            desc = migration["description"]
            logger.info(f"Running migration {version}: {desc}")
            try:
                migration["up"](executor)
                executor.execute(
                    "INSERT INTO _migrations (version, description) VALUES (%s, %s);",
                    (version, desc),
                )
                executor.commit()
                logger.info(f"Migration {version} applied successfully.")
            except Exception as e:
                executor.rollback()
                logger.error(f"Migration {version} FAILED: {e}")
                executor.close()
                return False

        executor.close()
        logger.info(f"All {len(pending)} migration(s) applied successfully.")
        return True

    except Exception as e:
        logger.error(f"Migration framework error: {e}")
        return False
