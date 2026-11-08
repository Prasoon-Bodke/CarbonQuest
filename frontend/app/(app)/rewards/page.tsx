"use client"

import * as React from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export default function RewardsPage() {
  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Rewards & Streaks</h1>
          <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1.5"/>Refresh</Button>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Coming Soon</CardTitle></CardHeader>
          <CardContent className="pt-4 text-muted-foreground">Reward system UI will be displayed here.</CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
