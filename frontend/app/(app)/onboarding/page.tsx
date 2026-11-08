"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Car,
  Zap,
  Utensils,
  ShoppingBag,
  Target,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import type { HabitInput, OnboardingInput } from "@/types";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  // Form State covering all required sectors & preferences
  const [formData, setFormData] = React.useState({
    // Demographics & Target
    displayName: "Prasoon Bodke",
    ageBand: "25-34",
    regionCode: "IN",
    householdSize: 2,
    monthlyTargetKg: 100.0,

    // Transportation Habits
    transportMode: "two_wheeler", // "two_wheeler", "car", "bus", "metro"
    dailyCommuteKm: 15.0,

    // Electricity Usage
    acDailyHours: 2.0,
    gridKwhDaily: 5.0,

    // Food Preferences
    diet: "vegetarian", // "vegan", "vegetarian", "flexitarian", "regular_meat"

    // Shopping Habits
    clothingItemsPerMonth: 1.0,

    // Sustainability & Privacy Preferences
    okModes: ["bus", "metro", "bicycle", "two_wheeler"],
    budgetLevel: "medium", // "low", "medium", "high"
    effortLevel: "medium", // "easy", "medium", "ambitious"
    consentTracking: true,
    consentLeaderboard: true,
  });

  // Restore saved onboarding data on mount / refresh
  React.useEffect(() => {
    let mounted = true;
    async function loadSavedProfile() {
      try {
        const profile = await api.profile.get();
        if (mounted && profile) {
          if (profile.display_name) {
            setFormData((prev) => ({
              ...prev,
              displayName: profile.display_name || prev.displayName,
              ageBand: profile.age_band || prev.ageBand,
              householdSize: profile.household_size || prev.householdSize,
              monthlyTargetKg: profile.monthly_target_kg || prev.monthlyTargetKg,
              consentTracking: profile.consent_tracking ?? prev.consentTracking,
              consentLeaderboard: profile.consent_leaderboard ?? prev.consentLeaderboard,
              diet: (profile.preferences as any)?.diet || prev.diet,
              budgetLevel: (profile.preferences as any)?.budget_level || prev.budgetLevel,
              effortLevel: (profile.preferences as any)?.effort_level || prev.effortLevel,
              okModes: (profile.preferences as any)?.ok_modes || prev.okModes,
            }));
          }
          if (profile.onboarding_done) {
            setIsEditMode(true);
          }
        }
      } catch (err) {
        console.warn("Could not load initial profile:", err);
      } finally {
        if (mounted) setIsLoadingProfile(false);
      }
    }
    loadSavedProfile();
    return () => {
      mounted = false;
    };
  }, []);

  // Validation per step
  const validateCurrentStep = (): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!formData.displayName.trim()) {
        setErrorMsg("Display name is required.");
        return false;
      }
      if (formData.householdSize < 1 || formData.householdSize > 20) {
        setErrorMsg("Household size must be between 1 and 20.");
        return false;
      }
      if (formData.monthlyTargetKg <= 0 || formData.monthlyTargetKg > 2000) {
        setErrorMsg("Monthly target must be a positive carbon goal (e.g. 50-500 kg CO₂e).");
        return false;
      }
    } else if (step === 2) {
      if (formData.dailyCommuteKm < 0 || formData.dailyCommuteKm > 300) {
        setErrorMsg("Daily commute must be between 0 and 300 km.");
        return false;
      }
      if (formData.acDailyHours < 0 || formData.acDailyHours > 24) {
        setErrorMsg("AC daily usage must be between 0 and 24 hours.");
        return false;
      }
    } else if (step === 3) {
      if (formData.clothingItemsPerMonth < 0 || formData.clothingItemsPerMonth > 50) {
        setErrorMsg("Monthly clothing items must be between 0 and 50.");
        return false;
      }
    } else if (step === 4) {
      if (!formData.consentTracking) {
        setErrorMsg("Tracking consent is required to audit activities and generate carbon calculations.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmitOnboarding();
    }
  };

  const handleSubmitOnboarding = async () => {
    if (!validateCurrentStep()) return;
    if (isSubmitting) return; // Prevent duplicate submissions

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Submit consent flags
      await api.profile.setConsents({
        consent_tracking: formData.consentTracking,
        consent_leaderboard: formData.consentLeaderboard,
      });

      // 2. Build baseline habit list across transport, electricity, food, and shopping
      const habits: HabitInput[] = [];

      // Transportation Habit
      if (formData.dailyCommuteKm > 0) {
        const modeKeyMap: Record<string, string> = {
          two_wheeler: "transport.two_wheeler_petrol_km",
          car: "transport.car_petrol_km",
          bus: "transport.bus_km",
          metro: "transport.metro_km",
        };
        habits.push({
          category: "transport",
          activity_key: modeKeyMap[formData.transportMode] || "transport.two_wheeler_petrol_km",
          frequency: "daily",
          quantity: formData.dailyCommuteKm,
          unit: "km",
          metadata: {
            mode: formData.transportMode,
            duration_min: Math.max(10, Math.round(formData.dailyCommuteKm * 2.5)),
          },
        });
      }

      // Electricity Habit (AC hours & baseline grid power)
      if (formData.acDailyHours > 0) {
        habits.push({
          category: "electricity",
          activity_key: "electricity.ac_hours",
          frequency: "daily",
          quantity: formData.acDailyHours,
          unit: "hours",
          metadata: { appliance: "split_ac_1.5ton" },
        });
      } else {
        habits.push({
          category: "electricity",
          activity_key: "electricity.grid_kwh",
          frequency: "daily",
          quantity: Math.max(1.0, formData.gridKwhDaily),
          unit: "kWh",
          metadata: {},
        });
      }

      // Food Habit
      const isVeg = formData.diet === "vegetarian" || formData.diet === "vegan";
      habits.push({
        category: "food",
        activity_key: isVeg ? "food.meal_veg" : "food.meal_non_veg",
        frequency: "daily",
        quantity: 2.0, // 2 primary meals/day
        unit: "meal",
        metadata: { diet_pattern: formData.diet },
      });

      // Shopping Habit
      if (formData.clothingItemsPerMonth > 0) {
        habits.push({
          category: "shopping",
          activity_key: "shopping.clothing_item",
          frequency: "weekly",
          quantity: Math.max(0.25, Math.round((formData.clothingItemsPerMonth / 4) * 100) / 100),
          unit: "item",
          metadata: {},
        });
      }

      // 3. Submit to POST /me/onboarding
      const payload: OnboardingInput = {
        display_name: formData.displayName,
        age_band: formData.ageBand,
        household_size: formData.householdSize,
        monthly_target_kg: formData.monthlyTargetKg,
        preferences: {
          diet: formData.diet,
          ok_modes: formData.okModes,
          budget_level: formData.budgetLevel,
          effort_level: formData.effortLevel,
          transport_mode: formData.transportMode,
        },
        habits,
      };

      await api.profile.completeOnboarding(payload);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Onboarding submission failed:", err);
      const msg = err instanceof ApiError ? err.message : err.message || "Failed to submit onboarding baseline.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <AppShell title="Baseline Audit" subtitle="Loading Profile...">
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
          <p className="text-xs">Restoring existing profile parameters...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={isEditMode ? "Edit Profile & Baseline" : "Baseline Carbon Audit"}
      subtitle="Calibrate your deterministic emission baseline and statistical preference vector"
    >
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {isEditMode ? "Baseline Profile Settings" : "Baseline Onboarding Wizard"}
              </h1>
              {isEditMode && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                  Already Onboarded
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isEditMode
                ? "Your initial 28-day baseline is active. You can update your lifestyle preferences and targets below."
                : "Record your typical habits across transit, power, and diet to initialize your explainable audit."}
            </p>
          </div>
        </div>

        {submitted ? (
          <Card className="border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-md">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Baseline Audit Complete!</CardTitle>
              <CardDescription>
                Your deterministic 28-day historical stream has been validated and loaded into your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row justify-center gap-3 pt-2 pb-6">
              <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Link href="/dashboard">
                  View Carbon Dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Edit Baseline Again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-border/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold items-center justify-center">
                    {step}
                  </span>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {step === 1 && "Demographics & Carbon Goal"}
                      {step === 2 && "Transit & Electricity Habits"}
                      {step === 3 && "Diet, Shopping & Lifestyle"}
                      {step === 4 && "Privacy, Consent & Transit Preferences"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {step === 1 && "Household parameters for per-capita normalization"}
                      {step === 2 && "Primary emission drivers in urban Indian baselines"}
                      {step === 3 && "Consumption footprint and adaptive preference calibration"}
                      {step === 4 && "Audit permissions and acceptable alternative transit modes"}
                    </CardDescription>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground">Step {step} of 4</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-lg flex items-center gap-2 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* STEP 1: Demographics & Carbon Goals */}
              {step === 1 && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Full Name</label>
                    <Input
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="e.g. Prasoon Bodke"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground">Age Bracket</label>
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
                      <label className="font-semibold text-foreground">Household Size (Occupants)</label>
                      <Input
                        type="number"
                        min={1}
                        max={15}
                        value={formData.householdSize}
                        onChange={(e) =>
                          setFormData({ ...formData, householdSize: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-foreground flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-emerald-600" />
                        Monthly Target Footprint (kg CO₂e)
                      </label>
                      <span className="text-[11px] text-muted-foreground">Pune avg: 145 kg</span>
                    </div>
                    <Input
                      type="number"
                      step={5}
                      min={20}
                      max={1000}
                      value={formData.monthlyTargetKg}
                      onChange={(e) =>
                        setFormData({ ...formData, monthlyTargetKg: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Recommendations and progress rings will be calibrated to this monthly climate goal.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 2: Transit & Electricity Habits */}
              {step === 2 && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground flex items-center gap-1.5">
                      <Car className="h-4 w-4 text-blue-600" />
                      Primary Daily Commute Mode
                    </label>
                    <Select
                      value={formData.transportMode}
                      onValueChange={(v) => setFormData({ ...formData, transportMode: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="two_wheeler">Two-Wheeler / Scooter (Petrol)</SelectItem>
                        <SelectItem value="car">Personal Car (Petrol)</SelectItem>
                        <SelectItem value="bus">Municipal Bus (PMPML Transit)</SelectItem>
                        <SelectItem value="metro">Pune Metro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Estimated Daily Commute (km)</label>
                    <Input
                      type="number"
                      step={1}
                      min={0}
                      max={200}
                      value={formData.dailyCommuteKm}
                      onChange={(e) =>
                        setFormData({ ...formData, dailyCommuteKm: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-foreground flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Air Conditioning Daily Usage (Hours)
                      </label>
                      <span className="text-[11px] text-muted-foreground">1.5 Ton Split AC</span>
                    </div>
                    <Input
                      type="number"
                      step={0.5}
                      min={0}
                      max={24}
                      value={formData.acDailyHours}
                      onChange={(e) =>
                        setFormData({ ...formData, acDailyHours: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Power consumption in Maharashtra emits ~0.82 kg CO₂e per kWh (CEA Grid Factor).
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: Diet & Shopping Habits */}
              {step === 3 && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground flex items-center gap-1.5">
                      <Utensils className="h-4 w-4 text-emerald-600" />
                      Primary Dietary Pattern
                    </label>
                    <Select
                      value={formData.diet}
                      onValueChange={(v) => setFormData({ ...formData, diet: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vegan">Vegan (Lowest Emission, ~0.6 kg/meal)</SelectItem>
                        <SelectItem value="vegetarian">Vegetarian (Standard India, ~0.78 kg/meal)</SelectItem>
                        <SelectItem value="flexitarian">Flexitarian / Occasional Non-Veg</SelectItem>
                        <SelectItem value="regular_meat">Regular Non-Veg (~2.15 kg/meal)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground flex items-center gap-1.5">
                      <ShoppingBag className="h-4 w-4 text-purple-600" />
                      New Clothing Items Purchased per Month
                    </label>
                    <Input
                      type="number"
                      step={1}
                      min={0}
                      max={20}
                      value={formData.clothingItemsPerMonth}
                      onChange={(e) =>
                        setFormData({ ...formData, clothingItemsPerMonth: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground">Budget Sensitivity</label>
                      <Select
                        value={formData.budgetLevel}
                        onValueChange={(v) => setFormData({ ...formData, budgetLevel: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High (Favor zero-cost changes)</SelectItem>
                          <SelectItem value="medium">Medium (Moderate investment ok)</SelectItem>
                          <SelectItem value="low">Low (Cost is not a barrier)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground">Effort Willingness</label>
                      <Select
                        value={formData.effortLevel}
                        onValueChange={(v) => setFormData({ ...formData, effortLevel: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy (Gentle habits first)</SelectItem>
                          <SelectItem value="medium">Medium (Balanced difficulty)</SelectItem>
                          <SelectItem value="ambitious">Ambitious (Ready for high impact)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Privacy, Consent & Alternative Modes */}
              {step === 4 && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 border rounded-xl space-y-2 bg-card">
                    <span className="font-semibold text-foreground block">
                      Acceptable Alternative Transit Modes
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      The AI Recommender will only propose modal shifts that you consider feasible:
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        { id: "bus", label: "Public Bus (PMPML)" },
                        { id: "metro", label: "Pune Metro" },
                        { id: "bicycle", label: "Bicycle / Walking" },
                        { id: "two_wheeler", label: "Electric 2-Wheeler" },
                      ].map((mode) => (
                        <label key={mode.id} className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={formData.okModes.includes(mode.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData({
                                ...formData,
                                okModes: checked
                                  ? [...formData.okModes, mode.id]
                                  : formData.okModes.filter((m) => m !== mode.id),
                              });
                            }}
                            className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{mode.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 border rounded-xl bg-card">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-foreground">Activity Tracking Consent</div>
                      <div className="text-[11px] text-muted-foreground">
                        Permits validation and factor lookup for your logged consumption.
                      </div>
                    </div>
                    <Switch
                      checked={formData.consentTracking}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, consentTracking: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 border rounded-xl bg-card">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-foreground">Opt-in Leaderboard</div>
                      <div className="text-[11px] text-muted-foreground">
                        Share anonymized eco-score with campus and local community.
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

              {/* Navigation Actions */}
              <div className="flex justify-between pt-4 border-t border-border">
                {step > 1 ? (
                  <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                    Back
                  </Button>
                ) : (
                  <div />
                )}
                <Button
                  size="sm"
                  disabled={isSubmitting}
                  onClick={handleNext}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Expanding 28-day baseline...
                    </>
                  ) : step === 4 ? (
                    isEditMode ? "Update Baseline & Habits" : "Complete Baseline Audit"
                  ) : (
                    <>
                      Continue <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
