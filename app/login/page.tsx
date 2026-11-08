"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = React.useState("demo@carbonquest.in");
  const [password, setPassword] = React.useState("demo123");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Signed in successfully",
        description: "Welcome back to CarbonQuest!",
        variant: "success",
      });
      router.push("/dashboard");
    }, 400);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6 selection:bg-emerald-500 selection:text-white">
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Leaf className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-lg tracking-tight text-foreground">
            CARBON<span className="text-emerald-600 dark:text-emerald-400">QUEST</span>
          </span>
          <span className="text-[10px] text-muted-foreground font-semibold">
            PCCOE Grand Challenge 2026
          </span>
        </div>
      </Link>

      <Card className="w-full max-w-md border-border/80 shadow-xl bg-card">
        <CardContent className="p-8 space-y-6">
          <div className="space-y-1.5 text-center">
            <h2 className="text-xl font-bold text-foreground">Welcome Back</h2>
            <p className="text-xs text-muted-foreground">
              Sign in to track, simulate, and lower your carbon footprint
            </p>
          </div>

          {/* Quick Demo Login Pill Button */}
          <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Grand Challenge Evaluator Access
              </span>
              <Badge variant="emerald" className="text-[10px]">Instant Demo</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Click below to instantly access the pre-seeded Pune demo profile (~128 kg CO₂e baseline).
            </p>
            <Button
              type="button"
              onClick={() => handleLogin()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5"
            >
              Sign In as Demo User (Aarav Sharma)
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-border" />
            <span className="bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Or with credentials
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-foreground">Password</label>
                <a href="#" className="text-emerald-600 hover:underline">Forgot?</a>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground text-xs h-9 mt-2"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-emerald-600 font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
