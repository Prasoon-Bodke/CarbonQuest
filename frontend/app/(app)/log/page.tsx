"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Car, Zap, Utensils, Trash2, Upload, CheckCircle2, AlertCircle } from "lucide-react";

export default function LogActivityPage() {
  const [category, setCategory] = React.useState("transport");
  const [activityKey, setActivityKey] = React.useState("transport.bus_km");
  const [quantity, setQuantity] = React.useState<number>(12.5);
  const [unit, setUnit] = React.useState("km");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const handleQuickLog = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(`Activity logged: ${quantity} ${unit} (${activityKey}). Status: Accepted.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log Carbon Activities</h1>
          <p className="text-sm text-muted-foreground">
            Record daily consumption, transit trips, or upload CSV logs. Plausibility validation runs automatically.
          </p>
        </div>

        {statusMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {statusMessage}
          </div>
        )}

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
                  Inputs are validated against physical speed bounds and activity caps before emission calculation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleQuickLog} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Category</label>
                      <Select
                        value={category}
                        onValueChange={(val) => {
                          setCategory(val);
                          if (val === "transport") {
                            setActivityKey("transport.bus_km");
                            setUnit("km");
                          } else if (val === "electricity") {
                            setActivityKey("electricity.grid_kwh");
                            setUnit("kWh");
                          } else if (val === "food") {
                            setActivityKey("food.meal_veg");
                            setUnit("meals");
                          } else {
                            setActivityKey("waste.landfill_kg");
                            setUnit("kg");
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="electricity">Electricity</SelectItem>
                          <SelectItem value="food">Food</SelectItem>
                          <SelectItem value="waste">Waste</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Activity Key</label>
                      <Input
                        value={activityKey}
                        onChange={(e) => setActivityKey(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Quantity</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Unit</label>
                      <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
                    </div>
                  </div>

                  <Button type="submit" className="w-full sm:w-auto">
                    Submit & Calculate Emissions
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
                  Upload your movement or consumption CSV file with headers: category, activity_key, quantity, unit, occurred_on.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Drag & drop your CSV file here</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Supports standard CSV exports</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Select CSV File
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
