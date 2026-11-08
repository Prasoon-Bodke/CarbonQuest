"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, MapPin, Sparkles, User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";

export function Topbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = React.useState("Aarav Sharma");

  const handleSwitchUser = async (userId: string, name: string) => {
    try {
      const res = await fetch("/api/auth/switch-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setCurrentUser(name);
        toast({
          title: `Switched demo profile to ${name}`,
          description: "All footprints, recommendations, and streaks updated.",
          variant: "success",
        });
        window.location.reload();
      }
    } catch {
      toast({ title: "Failed to switch user", variant: "destructive" });
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <div className="flex flex-col">
        <h1 className="text-base font-semibold text-foreground tracking-tight">
          {title || "Dashboard"}
        </h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Context Location Pill */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground font-medium">
          <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Pune, India (CEA Grid v19)</span>
        </div>

        {/* Demo Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
              <User className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden md:inline">{currentUser}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Demo Profiles (Grand Challenge)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSwitchUser("user_demo_primary", "Aarav Sharma")}>
              <div className="flex flex-col">
                <span className="font-semibold text-xs">Aarav Sharma (Primary Demo)</span>
                <span className="text-[10px] text-muted-foreground">~128 kg CO₂e baseline • 90d history</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSwitchUser("user_demo_priya", "Priya Patil")}>
              <div className="flex flex-col">
                <span className="font-semibold text-xs">Priya Patil (Rank #1)</span>
                <span className="text-[10px] text-muted-foreground">Eco Score 84 • PCCOE Green Club</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSwitchUser("user_demo_rohit", "Rohit Deshmukh")}>
              <div className="flex flex-col">
                <span className="font-semibold text-xs">Rohit Deshmukh</span>
                <span className="text-[10px] text-muted-foreground">Eco Score 68 • VIT Pune</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle Light / Dark Mode"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-emerald-400" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
