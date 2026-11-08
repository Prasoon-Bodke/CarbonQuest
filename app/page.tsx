import Link from "next/link";
import {
  Leaf,
  ArrowRight,
  ShieldCheck,
  Cpu,
  BarChart3,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Calculator,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LiveHeroSimulator } from "@/components/marketing/LiveHeroSimulator";
import { ClosedLoopVisualizer } from "@/components/marketing/ClosedLoopVisualizer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Marketing Navigation */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Leaf className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-foreground">
                CARBON<span className="text-emerald-600 dark:text-emerald-400">QUEST</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">
                PCCOE Grand Challenge 2026
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            <a href="#closed-loop" className="hover:text-foreground transition-colors">
              Closed Loop
            </a>
            <a href="#differentiators" className="hover:text-foreground transition-colors">
              Innovations
            </a>
            <a href="#explainability" className="hover:text-foreground transition-colors">
              Explainable Math
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm">
              <Link href="/dashboard">
                Explore Demo App
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:py-24 px-6 overflow-hidden">
        {/* Soft background ambient gradient */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Pitch */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              AI for Climate Change • Pune, India
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
              From Carbon Awareness <br />
              <span className="text-emerald-600 dark:text-emerald-400">→ Carbon Action</span> <br />
              → Measurable Impact.
            </h1>

            <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
              Most calculators leave you with a static number. CarbonQuest introduces an auditable,
              <strong> closed-loop system</strong> where every action you complete or skip recalibrates
              your next recommendations. Grounded in verified CEA Grid and IPCC factors — zero AI hallucinations.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-sm shadow-md">
                <Link href="/dashboard">
                  Launch Live Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-sm">
                <Link href="/simulator">Try What-If Simulator</Link>
              </Button>
            </div>

            {/* Quick Proof Pills */}
            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-border/80">
              <div>
                <span className="text-xl font-bold text-foreground tabular-nums">0.820</span>
                <p className="text-[11px] text-muted-foreground">kg CO₂e/kWh CEA Grid</p>
              </div>
              <div>
                <span className="text-xl font-bold text-foreground tabular-nums">40+</span>
                <p className="text-[11px] text-muted-foreground">India-Specific Actions</p>
              </div>
              <div>
                <span className="text-xl font-bold text-foreground tabular-nums">100%</span>
                <p className="text-[11px] text-muted-foreground">Deterministic Math</p>
              </div>
            </div>
          </div>

          {/* Right Live Interactive Mini Simulator */}
          <div className="lg:col-span-6">
            <LiveHeroSimulator />
          </div>
        </div>
      </section>

      {/* Closed-Loop Visualizer Section */}
      <section id="closed-loop" className="py-20 px-6 border-y border-border/70 bg-card/40">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="emerald">Core Innovation</Badge>
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
              The Closed-Loop Behavioral System
            </h2>
            <p className="text-sm text-muted-foreground">
              Every user interaction becomes feedback for the next recommendation.
              Track → Validate → Analyze → Prioritize → Simulate → Act → Learn → Adapt.
            </p>
          </div>

          <ClosedLoopVisualizer />
        </div>
      </section>

      {/* 5 Core Differentiators */}
      <section id="differentiators" className="py-24 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="blue">Why CarbonQuest Wins</Badge>
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
              5 Differentiators Designed for Real Impact
            </h2>
            <p className="text-sm text-muted-foreground">
              Engineered for the PCCOE International Grand Challenge 2026 to deliver enterprise-grade sustainability intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:border-emerald-500/50 hover:shadow-lg transition-all">
              <CardContent className="p-6 space-y-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 w-fit">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">01. Closed-Loop CO₂ Reduction</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Actions do not end in dead checkmarks. When you accept or complete a habit, your preference profile adapts in real time, unlocking progressive milestones.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-blue-500/50 hover:shadow-lg transition-all">
              <CardContent className="p-6 space-y-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 w-fit">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">02. What-If CO₂ Simulator</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Interactive multi-scenario sandbox. Adjust sliders for AC runtime, carpooling, or diet shifts to project exact kg and rupee savings before committing.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-amber-500/50 hover:shadow-lg transition-all">
              <CardContent className="p-6 space-y-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 w-fit">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">03. AI Action Prioritization</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Transparent 4-factor scoring: Normalized Impact (w1) + Preference Fit (w2) + Feasibility & Cost (w3) + Past Behavior Adjustment (w4).
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-purple-500/50 hover:shadow-lg transition-all">
              <CardContent className="p-6 space-y-3">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 w-fit">
                  <Calculator className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">04. Carbon Confidence & Explainability</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Never a black box. Inspect every line item calculation: <code>Activity × Emission Factor = CO₂e</code> with factor citations, publication years, and confidence scores.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-rose-500/50 hover:shadow-lg transition-all md:col-span-2 lg:col-span-2">
              <CardContent className="p-6 space-y-3">
                <div className="p-2.5 rounded-xl bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 w-fit">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">05. Adaptive Behavior Learning & Physics Validation</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If you skip cycling as &quot;not practical&quot;, CarbonQuest immediately boosts Pune PMPML bus alternatives with clear rationale. Pedometer and GPS physics validation blocks speed anomalies (e.g. 45 km/h cycling) to eliminate gaming.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Explainable Math Section */}
      <section id="explainability" className="py-20 px-6 bg-card/60 border-t border-border">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-5">
            <Badge variant="amber">Auditable Methodology</Badge>
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
              Why Deterministic & Explainable Math Matters
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Large Language Models are powerful communicators, but notorious for hallucinating numbers.
              In CarbonQuest, the calculation is <strong>100% deterministic</strong>. The LLM (Groq Llama 3.3 70B)
              serves solely to narrate, personalize, and converse using verified numbers supplied directly by the engine.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Electricity:</strong> CEA CO₂ Baseline v19 weighted national factor (0.820 kg/kWh).</span>
              </div>
              <div className="flex items-start gap-2 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Transport:</strong> ARAI / MoEFCC GHG Third National Communication & PMPML audits.</span>
              </div>
              <div className="flex items-start gap-2 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Food:</strong> Poore & Nemecek (Science 2018) calibrated for ICMR Indian dietary patterns.</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-xl border border-border bg-card p-5 font-mono text-xs shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2 text-muted-foreground">
                <span>DETERMINISTIC_FORMULA.ts</span>
                <span className="text-[10px] text-emerald-600">GHG Protocol Standard</span>
              </div>
              <div className="text-emerald-700 dark:text-emerald-400">
                CO₂e (kg) = Activity Amount × Verified Emission Factor
              </div>
              <div className="bg-muted/40 p-3 rounded-lg space-y-1.5 text-[11px] text-foreground">
                <div><strong>AC Runtime:</strong> 2 hrs/day × 30.4 days × 0.98 kW × 0.82 kg/kWh ÷ 2 occupants</div>
                <div className="text-emerald-600 font-bold">= 24.4 kg CO₂e / month</div>
                <div className="text-muted-foreground text-[10px]">Factor Source: India Central Electricity Authority Baseline v19 (2024)</div>
              </div>
              <div className="bg-muted/40 p-3 rounded-lg space-y-1.5 text-[11px] text-foreground">
                <div><strong>Commute:</strong> 18 km/day × 5 days/week × 4.33 weeks × 0.045 kg/km (2W Petrol)</div>
                <div className="text-emerald-600 font-bold">= 17.5 kg CO₂e / month</div>
                <div className="text-muted-foreground text-[10px]">Factor Source: ARAI / MoEFCC India GHG Program</div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="mt-auto border-t border-border py-8 px-6 bg-card/40 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-emerald-600" />
            <span className="font-bold text-foreground">CarbonQuest</span>
            <span>— Sustainable Future Powered by AI & Climate Science.</span>
          </div>
          <div className="flex gap-4">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              App Dashboard
            </Link>
            <Link href="/simulator" className="hover:text-foreground transition-colors">
              Simulator
            </Link>
            <Link href="/actions" className="hover:text-foreground transition-colors">
              Action Plan
            </Link>
            <Link href="/assistant" className="hover:text-foreground transition-colors">
              AI Advisor
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
