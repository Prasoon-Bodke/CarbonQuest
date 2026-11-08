# Verified Emission Factor Sourcing & Methodologies (`docs/SOURCES.md`)

> **Architectural Law (Day 0 Decision 9)**: Emission factors are never typed from memory. Every factor row in the database cites a published institutional source, valid URL, reference year, geographic region, unit, and version.

---

## 1. Verified Institutional Emission Factors

| Sector | Activity Key | Emission Factor | Unit | Source Citation | Year | Official Reference / URL |
|---|---|---|---|---|---|---|
| **Electricity** | `electricity.grid_kwh` | `0.820` | kg CO₂e / kWh | Central Electricity Authority (CEA) Baseline Database v19 | 2024 | [https://cea.nic.in](https://cea.nic.in) |
| **Electricity** | `electricity.ac_hours` | `1.230` | kg CO₂e / hour | CEA Grid Factor v19 × 1.5 kW 3-Star AC Power Draw | 2024 | BEE Star Labeling / CEA |
| **Electricity** | `electricity.lpg_cylinder` | `42.500` | kg CO₂e / cylinder | IPCC 2006 Guidelines / Indian Oil Corporation Ltd | 2023 | 14.2 kg domestic LPG cylinder combustion |
| **Electricity** | `electricity.solar_offset_kwh` | `-0.820` | kg CO₂e / kWh | Avoided thermal generation baseline | 2024 | CEA Baseline v19 |
| **Transport** | `transport.car_petrol_km` | `0.174` | kg CO₂e / km | ARAI / MoEFCC GHG Third National Communication | 2023 | [https://moef.gov.in](https://moef.gov.in) |
| **Transport** | `transport.car_diesel_km` | `0.165` | kg CO₂e / km | ARAI / UK DEFRA Conversion Factors 2023 | 2023 | [https://www.gov.uk](https://www.gov.uk) |
| **Transport** | `transport.car_cng_km` | `0.118` | kg CO₂e / km | TERI / ARAI Natural Gas Vehicle Assessment | 2023 | [https://www.teriin.org](https://www.teriin.org) |
| **Transport** | `transport.car_ev_km` | `0.123` | kg CO₂e / km | CEA Grid v19 × 0.15 kWh/km Passenger EV efficiency | 2024 | CEA Baseline v19 |
| **Transport** | `transport.two_wheeler_petrol_km` | `0.045` | kg CO₂e / km | ARAI / MoEFCC India GHG Program | 2023 | Mid-commuter motorcycle (45-55 km/l) |
| **Transport** | `transport.two_wheeler_ev_km` | `0.019` | kg CO₂e / km | CEA Grid v19 × 0.023 kWh/km e-scooter efficiency | 2024 | CEA Baseline v19 |
| **Transport** | `transport.bus_km` | `0.080` | kg CO₂e / pkm | MoEFCC / TERI Urban Transit Benchmark | 2023 | Municipal public bus per passenger-km |
| **Transport** | `transport.metro_km` | `0.035` | kg CO₂e / pkm | Delhi Metro (DMRC) Clean Development Mechanism & CEA | 2023 | [https://delhimetrorail.com](https://delhimetrorail.com) |
| **Transport** | `transport.auto_cng_km` | `0.068` | kg CO₂e / pkm | TERI / ARAI Auto-Rickshaw Emissions Inventory | 2023 | 3-wheeler shared CNG auto |
| **Transport** | `transport.flight_domestic_km` | `0.198` | kg CO₂e / pkm | ICAO Carbon Calculator / DGCA India Domestic Average | 2023 | [https://www.icao.int](https://www.icao.int) |
| **Food** | `food.meal_veg` | `0.780` | kg CO₂e / meal | Poore & Nemecek, *Science* (2018) / ICMR-NIN Dietary Audit | 2023 | Standard Indian vegetarian meal |
| **Food** | `food.meal_non_veg` | `2.150` | kg CO₂e / meal | Poore & Nemecek, *Science* (2018) / FAO GHG Livestock | 2023 | Standard Indian non-veg meal |
| **Food** | `food.meal_vegan` | `0.520` | kg CO₂e / meal | Poore & Nemecek (2018) / EAT-Lancet Commission | 2023 | Plant-based meal without dairy |
| **Food** | `food.waste_kg` | `1.900` | kg CO₂e / kg | FAO Food Wastage Footprint / IPCC AR6 | 2023 | Landfill anaerobic methane emission |
| **Shopping** | `shopping.clothing_item` | `8.500` | kg CO₂e / item | Ellen MacArthur Foundation / WRAP UK Textile Factors | 2023 | Cotton/poly garment life-cycle |
| **Shopping** | `shopping.delivery_package` | `0.450` | kg CO₂e / package | WEF Future of Last-Mile Delivery | 2023 | Urban courier delivery packet |
| **Waste** | `waste.landfill_kg` | `0.950` | kg CO₂e / kg | CPCB Solid Waste Report / IPCC MSW Methane Guidelines | 2023 | [https://cpcb.nic.in](https://cpcb.nic.in) |
| **Waste** | `waste.compost_kg` | `0.080` | kg CO₂e / kg | CPCB Guidelines for Decentralized Composting | 2023 | Controlled aerobic organic composting |

---

## 2. Core Mathematical Formulations

### Deterministic Emission Formula
$$\text{Emission } (\text{kg CO}_2\text{e}) = \text{Activity Quantity} \times \text{Emission Factor}$$

### What-If Shared Scenario Projection
For a mode shift from activity $A$ to alternative $B$:
$$\Delta_{\text{monthly}} = \text{trips/week} \times 4.33 \times \text{trip\_distance} \times \left( \text{EF}_A - \text{EF}_B \right)$$

For AC usage reduction:
$$\Delta_{\text{monthly}} = \frac{\Delta\text{hours/day} \times \text{kW\_draw} \times 30 \times \text{EF}_{\text{grid}}}{\text{household\_size}}$$
