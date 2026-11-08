# Canonical Enums & Activity Key Specifications (`contracts/ENUMS.md`)

This document freezes the canonical shared enums, activity keys, and metrics scales across the Next.js frontend, FastAPI backend, and AI module.

---

## 1. Shared Enums

| Enum | Allowed Values | Description / Semantics |
|---|---|---|
| `category` | `transport`, `electricity`, `food`, `shopping`, `waste` | Five standard greenhouse gas emission sectors |
| `source` | `manual`, `csv`, `strava`, `maps` | Provenance of the logged user activity data |
| `validation_status` | `accepted`, `flagged`, `rejected` | Intelligent rule-based plausibility outcome |
| `recommendation_status` | `proposed`, `accepted`, `modified`, `skipped`, `rejected`, `completed`, `expired` | Recommendation lifecycle state |
| `feedback_response` | `accepted`, `modified`, `skipped`, `rejected` | User action response type |
| `reason_code` | `not_practical`, `too_costly`, `not_relevant`, `already_doing`, `other` | Specific rationale supplied during skip/rejection |
| `basis` | `estimated`, `measured` | Provenance of carbon saving figure |
| `period` | `day`, `week`, `month` | Aggregation rollup interval |
| `difficulty` | Integer `1` to `5` | `1-2`: Easy, `3`: Medium, `4-5`: Hard |
| `cost_level` | Integer `1` to `3` | `1`: Saves money, `2`: Neutral, `3`: Costs money |
| `confidence` | Float `0.0` to `1.0` | `low` (<0.4), `medium` (0.4-0.7), `high` (>0.7) |

---

## 2. Activity Key Canonical Format

All activity keys follow the strict dot-separated hierarchy `<category>.<name>`:

| Category | Canonical Activity Key | Primary Unit | Default Emission Factor (IN) |
|---|---|---|---|
| **transport** | `transport.car_petrol_km` | `km` | 0.174 kg CO₂e/km |
| **transport** | `transport.car_diesel_km` | `km` | 0.165 kg CO₂e/km |
| **transport** | `transport.car_cng_km` | `km` | 0.118 kg CO₂e/km |
| **transport** | `transport.car_ev_km` | `km` | 0.123 kg CO₂e/km |
| **transport** | `transport.two_wheeler_petrol_km` | `km` | 0.045 kg CO₂e/km |
| **transport** | `transport.two_wheeler_ev_km` | `km` | 0.019 kg CO₂e/km |
| **transport** | `transport.bus_km` | `km` | 0.080 kg CO₂e/km |
| **transport** | `transport.metro_km` | `km` | 0.035 kg CO₂e/km |
| **transport** | `transport.auto_cng_km` | `km` | 0.068 kg CO₂e/km |
| **transport** | `transport.flight_domestic_km` | `km` | 0.198 kg CO₂e/km |
| **electricity** | `electricity.grid_kwh` | `kWh` | 0.820 kg CO₂e/kWh |
| **electricity** | `electricity.ac_hours` | `hours` | 1.230 kg CO₂e/hour (1.5 kW compressor) |
| **electricity** | `electricity.lpg_cylinder` | `cylinder` | 42.500 kg CO₂e/14.2kg cylinder |
| **electricity** | `electricity.solar_offset_kwh` | `kWh` | -0.820 kg CO₂e/kWh |
| **food** | `food.meal_veg` | `meal` | 0.780 kg CO₂e/meal |
| **food** | `food.meal_non_veg` | `meal` | 2.150 kg CO₂e/meal |
| **food** | `food.meal_vegan` | `meal` | 0.520 kg CO₂e/meal |
| **food** | `food.waste_kg` | `kg` | 1.900 kg CO₂e/kg |
| **shopping** | `shopping.clothing_item` | `item` | 8.500 kg CO₂e/garment |
| **shopping** | `shopping.delivery_package` | `package` | 0.450 kg CO₂e/delivery |
| **waste** | `waste.landfill_kg` | `kg` | 0.950 kg CO₂e/kg |
| **waste** | `waste.compost_kg` | `kg` | 0.080 kg CO₂e/kg |

---

## 3. Data Integrity Invariant Rules

1. **Immutable Factors**: Emission factor rows in database are versioned and append-only. A factor row is never modified in-place so historical calculations remain permanently reproducible.
2. **Single Deterministic Scenario Function**: What-If Simulator and Recommendation Saving Estimator use the identical `project_scenario()` Python function.
3. **Basis Classification**: Every reported carbon reduction MUST explicitly carry `basis = 'estimated'` or `basis = 'measured'`. It is labeled `measured` ONLY if verified activity telemetry confirms a real reduction against baseline across a minimum 14-day window.
