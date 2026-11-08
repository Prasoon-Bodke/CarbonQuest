import sys
import os
import csv
import json
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models import EmissionFactor, ActionCatalog, Badge
import uuid

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        data_dir = backend_dir / "data"

        # 1. Seed Emission Factors from CSV
        csv_path = data_dir / "emission_factors_seed.csv"
        print(f"-> Seeding verified Emission Factors from {csv_path.name}...")
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                existing = (
                    db.query(EmissionFactor)
                    .filter(
                        EmissionFactor.activity_key == row["activity_key"],
                        EmissionFactor.region_code == row["region_code"],
                        EmissionFactor.version == int(row["version"]),
                    )
                    .first()
                )
                if not existing:
                    factor = EmissionFactor(
                        id=str(uuid.uuid4()),
                        category=row["category"],
                        activity_key=row["activity_key"],
                        unit=row["unit"],
                        kg_co2e_per_unit=float(row["kg_co2e_per_unit"]),
                        region_code=row["region_code"],
                        source_name=row["source_name"],
                        source_url=row.get("source_url"),
                        source_year=int(row["source_year"]),
                        version=int(row["version"]),
                        notes=row.get("notes"),
                    )
                    db.add(factor)
        db.commit()

        # 2. Seed Action Catalog from JSON
        catalog_path = data_dir / "action_catalog_seed.json"
        print(f"-> Seeding Action Catalog from {catalog_path.name}...")
        with open(catalog_path, mode="r", encoding="utf-8") as f:
            actions = json.load(f)
            for act in actions:
                existing = db.query(ActionCatalog).filter(ActionCatalog.action_key == act["action_key"]).first()
                if not existing:
                    item = ActionCatalog(
                        id=str(uuid.uuid4()),
                        action_key=act["action_key"],
                        title=act["title"],
                        description=act["description"],
                        category=act["category"],
                        activity_key=act["activity_key"],
                        change_type=act["change_type"],
                        default_params=act["default_params"],
                        difficulty=act["difficulty"],
                        cost_level=act["cost_level"],
                        tags=act["tags"],
                        is_active=act.get("is_active", True),
                    )
                    db.add(item)
                else:
                    existing.title = act["title"]
                    existing.description = act["description"]
                    existing.category = act["category"]
                    existing.activity_key = act["activity_key"]
                    existing.change_type = act["change_type"]
                    existing.default_params = act["default_params"]
                    existing.difficulty = act["difficulty"]
                    existing.cost_level = act["cost_level"]
                    existing.tags = act["tags"]
                    existing.is_active = act.get("is_active", True)
        db.commit()

        # 3. Seed Badges from JSON
        badges_path = data_dir / "badges_seed.json"
        print(f"-> Seeding Badges from {badges_path.name}...")
        with open(badges_path, mode="r", encoding="utf-8") as f:
            badges = json.load(f)
            for b in badges:
                existing = db.query(Badge).filter(Badge.key == b["key"]).first()
                if not existing:
                    badge_item = Badge(
                        id=str(uuid.uuid4()),
                        key=b["key"],
                        title=b["title"],
                        description=b["description"],
                        criteria=b["criteria"],
                        icon=b["icon"],
                    )
                    db.add(badge_item)
        db.commit()
        print("[OK] Sourced factors, action catalog, and badges successfully seeded.")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
