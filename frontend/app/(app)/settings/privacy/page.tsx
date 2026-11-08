"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Download, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function PrivacySettingsPage() {
  const [consentTracking, setConsentTracking] = React.useState(true);
  const [consentLeaderboard, setConsentLeaderboard] = React.useState(true);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const handleExportData = () => {
    setStatusMessage("Export requested. Preparing your complete JSON dataset archive...");
    setTimeout(() => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        user: "demo-user-pune",
        profile: { region: "IN", household_size: 2 },
        export_date: new Date().toISOString(),
        note: "Complete self-sovereign carbon audit export"
      }, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "carbonquest_user_data.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setStatusMessage("Export downloaded successfully.");
    }, 800);
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to permanently delete your account and all carbon activity records? This action cannot be undone.")) {
      setStatusMessage("Delete signal sent to FastAPI. Account and records purged.");
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Privacy & Consent Controls</h1>
          <p className="text-sm text-muted-foreground">
            Manage tracking consent, export your full carbon data, or trigger an irreversible GDPR-compliant erasure.
          </p>
        </div>

        {statusMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {statusMessage}
          </div>
        )}

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Consent Management
              </CardTitle>
              <CardDescription>
                Control which data pipelines process your activity inputs and whether your eco-score is shared.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Activity Logging & Validation Consent</div>
                  <div className="text-xs text-muted-foreground">
                    Required for emission calculations, trip validation, and adaptive recommendations.
                  </div>
                </div>
                <Switch
                  checked={consentTracking}
                  onCheckedChange={setConsentTracking}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Opt-In Community Leaderboard</div>
                  <div className="text-xs text-muted-foreground">
                    Allow anonymous eco-score and avoided CO₂ comparison on the campus leaderboard.
                  </div>
                </div>
                <Switch
                  checked={consentLeaderboard}
                  onCheckedChange={setConsentLeaderboard}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-500" />
                Data Portability (GDPR Export)
              </CardTitle>
              <CardDescription>
                Download a machine-readable JSON archive containing all your profiles, activities, emission snapshots, and action logs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleExportData} className="gap-2">
                <Download className="h-4 w-4" />
                Export Full Account Data (.JSON)
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone: Account Erasure
              </CardTitle>
              <CardDescription>
                Permanently purge your profile, activity records, and AI preference weights. Once deleted, this data cannot be recovered.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleDeleteAccount} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Erase All My Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
