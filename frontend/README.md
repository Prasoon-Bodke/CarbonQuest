# CarbonQuest Frontend

Next.js App Router client application for CarbonQuest.

## Responsibilities (Teammate 1)
- All UI pages, layouts, and responsive components
- TanStack Query data fetching against FastAPI endpoints (`/api/v1`)
- Supabase Auth session management in the browser (JWT forwarded via Bearer token)
- Strict differentiation of "Estimated" vs "Measured" savings with badges
- Transparency drawer & confidence meter displays
- Zero business logic in frontend route handlers

## Directory Layout
```
frontend/
├── app/
│   ├── (marketing)/page.tsx          # Landing page & visualizers
│   ├── (auth)/login, signup          # Supabase Auth session handling
│   └── (app)/                        # Authenticated app views
│       ├── onboarding/               # Baseline audit wizard
│       ├── dashboard/                # Donut, trend, hotspots, next actions
│       ├── log/                      # Quick-log form & CSV upload
│       ├── footprint/                # Detailed breakdown & explainability
│       ├── actions/                  # Ranked recommendations & feedback loop
│       ├── simulator/                # What-if scenario testing
│       ├── goals/                    # Progress tracking against targets
│       ├── rewards/                  # Badges, streaks & leaderboard
│       ├── chat/                     # Grounded sustainability assistant
│       └── settings/privacy/         # GDPR export & data deletion
├── components/
│   ├── ui/                           # Radix UI + shadcn design primitives
│   ├── charts/                       # Recharts visualizations
│   ├── forms/                        # Activity log & trip forms
│   ├── layout/                       # AppShell, Sidebar, Topbar
│   └── badges/                       # Estimated vs Measured & Confidence badges
├── lib/
│   ├── api/client.ts                 # Typed FastAPI HTTP client
│   └── supabase/client.ts            # Supabase Auth client
├── mocks/                            # MSW mock handlers from contracts
└── tests/                            # Component & unit tests
```

## Running Locally

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).
