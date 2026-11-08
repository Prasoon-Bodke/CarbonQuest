# Architecture Notes: CarbonQuest

## Initial Inspection Summary
- **Workspace State**: Clean slate directory (`C:\Users\Shreya\Downloads\CarbonQuest`). No legacy code, package.json, or boilerplate files existed.
- **Node & Tooling Environment**:
  - Node.js: `v24.12.0`
  - npm: `11.6.2`
  - Git: `2.52.0.windows.1`
  - OS: Windows

## Architectural Strategy & Design Choices
1. **Application Framework**:
   - Next.js 14+ (App Router) with strict TypeScript.
   - Server-side Route Handlers with isolated service layer (`/lib/services/*`) to separate domain logic from HTTP plumbing.
   - Zod validation schemas shared between frontend and backend (`/lib/schemas/*`).

2. **Design System & UI**:
   - Modern, high-trust climate-fintech aesthetic (deep forest `#0d2818` / `#133e24`, vibrant emerald/leaf `#10b981` / `#059669`, sand canvas `#fafaf7`, dark charcoal `#0a120e`).
   - Fixed category color tokens:
     - Transport: `#3b82f6` (Sky / Blue)
     - Electricity: `#f59e0b` (Amber / Yellow)
     - Food: `#10b981` (Emerald / Leaf)
     - Shopping: `#8b5cf6` (Purple)
     - Waste: `#ec4899` (Rose / Pink)
   - Radix UI primitives with Tailwind CSS, Lucide icons, Framer Motion for purposeful micro-interactions, Recharts for responsive visualizations.

3. **Deterministic & Explainable Carbon Engine**:
   - Located in `/lib/carbon/`: pure TypeScript, zero external framework dependencies.
   - Core law: `CO2e (kg) = Activity amount × Emission factor`.
   - Every result returns activity amount, emission factor value, source, year, line item, data quality flag (`measured` | `estimated` | `defaulted`), and human-readable formula.
   - Built-in confidence score engine (0–100) based on input completeness and empirical verification.
   - Built-in what-if scenario diff calculator used uniformly by the dashboard, simulator, actions engine, and AI assistant.

4. **Closed-Loop System & Adaptive AI Engine**:
   - Loop: Track → Validate → Analyze → Prioritize → Simulate → Act → Learn → Adapt.
   - Recommendation Priority Score formula:
     `Priority = w1 * normalizedImpact + w2 * preferenceFit + w3 * feasibilityAndCost + w4 * behaviorAdjustment`
   - Adaptive Learning: Bayesian/smoothed affinity adjustments tracking accepted, modified, skipped, and completed actions with categorical skip-reason analysis.
   - Skipping "cycling" due to practicality instantly boosts bus/transit recommendations and explains the rationale.

5. **Data Architecture & Persistence**:
   - Prisma ORM with SQLite / PostgreSQL support (using local SQLite database file with identical Prisma schema for seamless local zero-friction execution, fully compatible with Supabase PostgreSQL connection strings via standard Prisma schema configuration).
   - Rich database seed: 40+ India-contextualized action templates, verified emission factors with sources/years, badges, points catalog, and 3 realistic demo accounts (primary demo user seeded with ~128 kg CO₂e baseline footprint matching the product narrative: ~40kg Transport, ~32kg Electricity, ~28kg Food, ~18kg Shopping, ~10kg Waste; 90-day activity history, streak, and pre-seeded actions).

6. **Trip Capture & Validation Engine**:
   - Geolocation & manual distance calculation using Haversine formula.
   - Server-side trip validation engine (`/lib/validation/`): checks mode vs. average speed, maximum speed, duration, and distance. Flags suspicious trips and rejects impossible trips (e.g. 45 km/h cycling or 20 km walk in 10 minutes).

7. **AI Layer (Groq & Llama 3.3 70B)**:
   - Server-side AI assistant client with streaming support, tool calling (triggering simulator prefill, adding to plan), token budgeting, prompt grounding, and deterministic fallback when `GROQ_API_KEY` is not provided.
   - The LLM *never* generates ungrounded footprint figures; it receives computed numbers from the deterministic carbon engine and contextualizes/explains them.
