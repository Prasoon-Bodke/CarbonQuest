"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, MapPin, Sparkles, User, RefreshCw, LogOut } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";

export function Topbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { profile, logout, loginDemo } = useAuth();

  const displayName = profile?.display_name || "Prasoon Bodke";

  const handleSwitchToDemo = async () => {
    try {
      await loginDemo();
      toast({
        title: "Switched to Demo Admin Account",
        description: "Prasoon Bodke (Pune baseline ~128 kg CO₂e) loaded.",
        variant: "success",
      });
      window.location.reload();
    } catch {
      toast({ title: "Failed to switch user", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
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

        {/* User Menu & Demo Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
              <User className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden md:inline">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">
              Signed in as <span className="font-bold">{displayName}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSwitchToDemo}>
              <div className="flex flex-col">
                <span className="font-semibold text-xs">Prasoon Bodke (Demo Admin)</span>
                <span className="text-[10px] text-muted-foreground">~128 kg CO₂e baseline • 8-week history</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-700 cursor-pointer">
              <LogOut className="h-3.5 w-3.5 mr-2" />
              <span className="text-xs font-medium">Sign Out</span>
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
