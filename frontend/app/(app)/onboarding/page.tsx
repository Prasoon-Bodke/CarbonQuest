"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function OnboardingPage() {
  const [step, setStep] = React.useState(1);
  const [formData, setFormData] = React.useState({
    ageBand: "25-34",
    regionCode: "IN",
    householdSize: 2,
    monthlyTargetKg: 100,
    diet: "vegetarian",
    consentTracking: true,
    consentLeaderboard: true,
  });
  const [submitted, setSubmitted] = React.useState(false);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setSubmitted(true);
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to CarbonQuest</h1>
          <p className="text-sm text-muted-foreground">
            Complete your baseline onboarding to initialize your explainable footprint audit.
          </p>
        </div>

        {submitted ? (
          <Card className="border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Profile Setup Complete!</CardTitle>
              <CardDescription>
                Your deterministic baseline profile and adaptive preference vector have been initialized.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pt-2 pb-6">
              <Button asChild className="gap-2">
                <Link href="/dashboard">
                  Go to Dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold items-center justify-center">
                    {step}
                  </span>
                  <CardTitle className="text-base">
                    {step === 1 && "Demographics & Household"}
                    {step === 2 && "Lifestyle & Climate Preferences"}
                    {step === 3 && "Privacy & Consent Settings"}
                  </CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">Step {step} of 3</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Age Bracket</label>
                    <Select
                      value={formData.ageBand}
                      onValueChange={(v) => setFormData({ ...formData, ageBand: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="18-24">18 - 24 years</SelectItem>
                        <SelectItem value="25-34">25 - 34 years</SelectItem>
                        <SelectItem value="35-49">35 - 49 years</SelectItem>
                        <SelectItem value="50+">50+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Household Size</label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={formData.householdSize}
                      onChange={(e) =>
                        setFormData({ ...formData, householdSize: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Primary Dietary Pattern</label>
                    <Select
                      value={formData.diet}
                      onValueChange={(v) => setFormData({ ...formData, diet: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vegan">Vegan (Low Carbon)</SelectItem>
                        <SelectItem value="vegetarian">Vegetarian (Standard India)</SelectItem>
                        <SelectItem value="flexitarian">Flexitarian / Occasional Meat</SelectItem>
                        <SelectItem value="regular_meat">Regular Non-Vegetarian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Monthly Target Footprint (kg CO₂e)</label>
                    <Input
                      type="number"
                      value={formData.monthlyTargetKg}
                      onChange={(e) =>
                        setFormData({ ...formData, monthlyTargetKg: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Activity Tracking Consent</div>
                      <div className="text-xs text-muted-foreground">
                        Allow validation and emission factor lookup for logged trips and consumption.
                      </div>
                    </div>
                    <Switch
                      checked={formData.consentTracking}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, consentTracking: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Opt-in Leaderboard</div>
                      <div className="text-xs text-muted-foreground">
                        Share anonymized eco score with campus and local community.
                      </div>
                    </div>
                    <Switch
                      checked={formData.consentLeaderboard}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, consentLeaderboard: checked })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                {step > 1 ? (
                  <Button variant="outline" onClick={() => setStep(step - 1)}>
                    Back
                  </Button>
                ) : <div />}
                <Button onClick={handleNext}>
                  {step === 3 ? "Complete Baseline Audit" : "Continue"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
