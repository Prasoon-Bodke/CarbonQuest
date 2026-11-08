"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { authService } from "@/lib/supabase/client";
import { ApiError } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = React.useState("Aarav Sharma");
  const [email, setEmail] = React.useState("aarav.pune@vit.edu");
  const [password, setPassword] = React.useState("password123");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await authService.signUp(email, password, name);
      if (res.requiresConfirmation) {
        toast({
          title: "Account Created",
          description: "Please check your email to confirm your account, then sign in.",
          variant: "success",
        });
        router.push("/login");
      } else {
        toast({
          title: "Account Created",
          description: "Proceeding to your initial carbon audit onboarding...",
          variant: "success",
        });
        router.push("/onboarding");
      }
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err.message || "Failed to create account";
      setErrorMsg(msg);
      toast({
        title: "Registration Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
            <h2 className="text-xl font-bold text-foreground">Create Your Account</h2>
            <p className="text-xs text-muted-foreground">
              Begin your journey from carbon awareness to measurable climate impact
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Full Name</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aarav Sharma"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aarav@vit.edu"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 mt-2 gap-1.5 shadow-sm"
            >
              {isLoading ? "Creating..." : "Start Carbon Onboarding"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
