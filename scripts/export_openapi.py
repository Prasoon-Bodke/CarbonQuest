import json
import sys
from pathlib import Path

repo_root = Path(__file__).resolve().parent.parent
backend_path = repo_root / "backend"
sys.path.insert(0, str(backend_path))

try:
    from app.main import app
    openapi_schema = app.openapi()
    output_path = repo_root / "contracts" / "openapi.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)
    print(f"[OK] Exported OpenAPI specification to {output_path}")
except Exception as e:
    print(f"[ERROR] Could not export live OpenAPI spec: {e}")
