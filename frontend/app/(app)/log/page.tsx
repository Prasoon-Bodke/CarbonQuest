"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Zap,
  Utensils,
  ShoppingBag,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";

// Category to activity key mappings
const CATEGORY_ACTIVITY_KEYS: Record<string, { label: string; defaultKey: string; unit: string }[]> = {
  transport: [
    { label: "Bus Journey", defaultKey: "transport.bus_km", unit: "km" },
    { label: "Car (Petrol)", defaultKey: "transport.car_petrol_km", unit: "km" },
    { label: "Car (Diesel)", defaultKey: "transport.car_diesel_km", unit: "km" },
    { label: "Car (CNG)", defaultKey: "transport.car_cng_km", unit: "km" },
    { label: "Car (EV)", defaultKey: "transport.car_ev_km", unit: "km" },
    { label: "Two-Wheeler", defaultKey: "transport.two_wheeler_petrol_km", unit: "km" },
    { label: "Metro/Rail", defaultKey: "transport.metro_km", unit: "km" },
    { label: "Domestic Flight", defaultKey: "transport.flight_domestic_km", unit: "km" },
  ],
  electricity: [
    { label: "Grid Electricity", defaultKey: "electricity.grid_kwh", unit: "kWh" },
    { label: "AC Hours", defaultKey: "electricity.ac_hours", unit: "hours" },
    { label: "LPG Cylinder", defaultKey: "electricity.lpg_cylinder", unit: "cylinder" },
    { label: "Solar Offset", defaultKey: "electricity.solar_offset_kwh", unit: "kWh" },
  ],
  food: [
    { label: "Vegetarian Meal", defaultKey: "food.meal_veg", unit: "meals" },
    { label: "Non-Vegetarian Meal", defaultKey: "food.meal_non_veg", unit: "meals" },
    { label: "Vegan Meal", defaultKey: "food.meal_vegan", unit: "meals" },
    { label: "Food Waste", defaultKey: "food.waste_kg", unit: "kg" },
  ],
  shopping: [
    { label: "Clothing Item", defaultKey: "shopping.clothing_item", unit: "item" },
    { label: "Delivery Package", defaultKey: "shopping.delivery_package", unit: "package" },
  ],
  waste: [
    { label: "Landfill Waste", defaultKey: "waste.landfill_kg", unit: "kg" },
    { label: "Composted Organics", defaultKey: "waste.compost_kg", unit: "kg" },
  ],
};

export default function LogActivityPage() {
  const { toast } = useToast();
  const [category, setCategory] = React.useState<string>("transport");
  const [activityKey, setActivityKey] = React.useState("transport.bus_km");
  const [quantity, setQuantity] = React.useState<number>(1);
  const [unit, setUnit] = React.useState("km");
  const [occurredOn, setOccurredOn] = React.useState<string>(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [rejectionReasons, setRejectionReasons] = React.useState<string[]>([]);
  const [emissionResult, setEmissionResult] = React.useState<any>(null);
  const [availableFactors, setAvailableFactors] = React.useState<any[]>([]);

  const queryClient = useQueryClient();

  // Load available emission factors for selected category
  React.useEffect(() => {
    const loadFactors = async () => {
      try {
        const factors = await api.activities.factors({ category });
        setAvailableFactors(factors || []);
        if (factors && factors.length > 0) {
          const defaultActivity = factors[0];
          setActivityKey(defaultActivity.activity_key);
          setUnit(defaultActivity.unit);
        }
      } catch (err) {
        console.error("Failed to load factors:", err);
      }
    };
    loadFactors();
  }, [category]);

  // Update unit when activity key changes
  React.useEffect(() => {
    const activityInfo = CATEGORY_ACTIVITY_KEYS[category]?.find(a => a.defaultKey === activityKey);
    if (activityInfo) {
      setUnit(activityInfo.unit);
    } else if (availableFactors.length > 0) {
      const factor = availableFactors.find((f: any) => f.activity_key === activityKey);
      if (factor) setUnit(factor.unit);
    }
  }, [activityKey, category, availableFactors]);

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setRejectionReasons([]);
    setEmissionResult(null);
    // Set default activity key for new category
    const defaults = CATEGORY_ACTIVITY_KEYS[newCategory];
    if (defaults && defaults.length > 0) {
      setActivityKey(defaults[0].defaultKey);
    }
  };

  const handleActivityKeyChange = (newKey: string) => {
    setActivityKey(newKey);
    setRejectionReasons([]);
    setEmissionResult(null);
  };

  const validateActivity = async () => {
    if (quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Quantity must be greater than 0",
        variant: "destructive",
      });
      return false;
    }

    if (!category) {
      toast({
        title: "Category Required",
        description: "Please select a category",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(await validateActivity())) return;

    setIsSubmitting(true);
    setRejectionReasons([]);
    setEmissionResult(null);

    try {
      const result = await api.activities.create({
        category: category as any,
        activity_key: activityKey,
        quantity,
        unit,
        occurred_on: occurredOn,
        source: "manual",
        metadata: {},
      });

      setEmissionResult(result.emission);

      toast({
        title: "Activity Logged Successfully",
        description: result.emission
          ? `${quantity} ${unit} → ${result.emission.kg_co2e.toFixed(2)} kg CO₂e | Status: ${result.activity.validation_status}`
          : "Activity logged but emission factor lookup pending",
        variant: "success",
      });

      // Refresh related data using TanStack Query
      await queryClient.invalidateQueries({ queryKey: ["activities"] });
      await queryClient.invalidateQueries({ queryKey: ["footprint"] });
      await queryClient.invalidateQueries({ queryKey: ["hotspots"] });

    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.isValidationError || err.code === "ACTIVITY_REJECTED") {
          setRejectionReasons(err.details?.map((d: any) => d.issue || "Validation failed") || ["Validation failed"]);
          toast({
            title: "Activity Rejected",
            description: err.message,
            variant: "destructive",
          });
        } else if (err.isConsentRequired) {
          toast({
            title: "Consent Required",
            description: "Please enable activity tracking in Settings > Privacy",
            variant: "info",
          });
        } else {
          toast({
            title: "Error",
            description: err.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Network Error",
          description: "Unable to reach the server. Please check your connection.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log Carbon Activities</h1>
          <p className="text-sm text-muted-foreground">
            Record your consumption and travel to track your carbon footprint. Emissions are calculated using authoritative factors.
          </p>
        </div>

        {/* Activity Submission Form */}
        <Tabs defaultValue="quick-log" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="quick-log">Quick-Log Form</TabsTrigger>
            <TabsTrigger value="csv-upload">CSV Batch Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="quick-log" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Record Single Activity</CardTitle>
                <CardDescription>
                  Selected activities are validated against physical limits before emission calculation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Status Messages */}
                  {rejectionReasons.length > 0 && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-lg flex items-start gap-2 text-sm">
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Activity Rejected:</span>
                        <ul className="mt-1 list-disc list-inside text-xs">
                          {rejectionReasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {emissionResult && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Emission Calculated: {emissionResult.kg_co2e.toFixed(2)} kg CO₂e</span>
                        <span className="text-xs text-emerald-600 block mt-1">
                          Based on {emissionResult.factor.source_name} ({emissionResult.factor.source_year})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Form Fields */}
                  <div className="space-y-4">
                    {/* Category Selection */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium block">Category</label>
                      <Select value={category} onValueChange={handleCategoryChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transport">
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4" />
                              <span>Transportation</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="electricity">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              <span>Electricity</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="food">
                            <div className="flex items-center gap-2">
                              <Utensils className="h-4 w-4" />
                              <span>Food</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="shopping">
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="h-4 w-4" />
                              <span>Shopping</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="waste">
                            <div className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              <span>Waste</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Activity Key Selection */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium block">Activity Type</label>
                      <Select value={activityKey} onValueChange={handleActivityKeyChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_ACTIVITY_KEYS[category]?.map((act) => (
                            <SelectItem key={act.defaultKey} value={act.defaultKey}>
                              {act.label} ({act.unit})
                            </SelectItem>
                          )) || availableFactors.map((factor: any) => (
                            <SelectItem key={factor.activity_key} value={factor.activity_key}>
                              {factor.activity_key.replace(/_/g, " ").replace(/([A-Z])/g, ' $1').trim()} ({factor.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium block">Quantity</label>
                        <Input
                          type="number"
                          step={category === "electricity" ? "0.5" : "0.1"}
                          min={0.01}
                          value={quantity}
                          onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                          placeholder="Enter amount"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium block">Unit</label>
                        <Input value={unit} onChange={(e) => setUnit(e.target.value)} readOnly />
                      </div>
                    </div>

                    {/* Date */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium block">Date</label>
                      <Input
                        type="date"
                        value={occurredOn}
                        onChange={(e) => setOccurredOn(e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Logging Activity...
                      </>
                    ) : (
                      <>
                        Submit & Calculate Emissions
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="csv-upload" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Batch CSV Import</CardTitle>
                <CardDescription>
                  Upload a CSV file with columns: category, activity_key, quantity, unit, occurred_on
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Drag & drop your CSV file here</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Supports standard CSV exports with activity logging columns
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Select CSV File (Coming Soon)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}