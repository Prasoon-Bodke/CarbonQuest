#!/usr/bin/env python3
"""
Automated Database Migration & Seeding CLI for CarbonQuest.
Seamlessly initializes either local SQLite or production Supabase PostgreSQL.

Usage:
    python backend/scripts/migrate_supabase.py [--seed-demo]
"""
import sys
import os
import argparse
from pathlib import Path
from sqlalchemy import text, inspect

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from alembic.config import Config
from alembic import command
from app.core.config import settings
from app.db.session import engine, SessionLocal
from scripts.seed_factors import seed as seed_factors
from scripts.seed_demo import seed_demo

def run_migration_and_seeds(seed_demo_account: bool = False):
    print("=" * 65)
    print("CarbonQuest Database Setup & Supabase Migration Tool")
    print("=" * 65)

    # 1. Inspect target database
    masked_url = settings.DATABASE_URL
    if "@" in masked_url:
        prefix, host_part = masked_url.split("@", 1)
        scheme = prefix.split(":", 1)[0]
        masked_url = f"{scheme}://***:***@{host_part}"

    print(f"[*] Target Database: {engine.dialect.name.upper()} ({masked_url})")

    # 2. Test connectivity
    print("[*] Testing database connectivity...")
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("    [OK] Database connection established successfully.")
    except Exception as e:
        print(f"    [ERROR] Failed to connect to database: {e}")
        sys.exit(1)

    # 3. Execute Alembic Migrations
    print("[*] Applying Alembic schema migrations (head)...")
    try:
        ini_path = backend_dir / "alembic.ini"
        alembic_cfg = Config(str(ini_path))
        alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
        command.upgrade(alembic_cfg, "head")
        print("    [OK] Schema migrations applied successfully.")
    except Exception as e:
        print(f"    [ERROR] Migration failed: {e}")
        sys.exit(1)

    # 4. Run Verified Seed Data
    print("[*] Seeding verified emission factors, action catalog, and badges...")
    try:
        seed_factors()
        print("    [OK] Baseline catalog & factors seeded.")
    except Exception as e:
        print(f"    [ERROR] Seeding baseline data failed: {e}")
        sys.exit(1)

    # 5. Optionally seed 8-week demo user
    if seed_demo_account:
        print("[*] Seeding 8-week demonstration user (Prasoon Bodke)...")
        try:
            seed_demo()
            print("    [OK] Demonstration user profile and history created.")
        except Exception as e:
            print(f"    [!] Demo seed encountered note: {e}")

    # 6. Audit Table Summary
    print("\n" + "-" * 65)
    print("Database Verification Summary:")
    print("-" * 65)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    with SessionLocal() as db:
        for t in sorted(tables):
            try:
                count = db.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
                print(f"  * {t:<28} : {count} rows")
            except Exception:
                print(f"  * {t:<28} : exists")

    print("-" * 65)
    print("Database is fully migrated, seeded, and ready for production.")
    print("=" * 65)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate and seed database.")
    parser.add_argument("--seed-demo", action="store_true", help="Also seed 8-week demo account")
    args = parser.parse_args()
    run_migration_and_seeds(seed_demo_account=args.seed_demo)
