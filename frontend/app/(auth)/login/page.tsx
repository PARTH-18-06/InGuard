"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { loginUser, getErrorMessage } from "@/lib/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { user, isLoggedIn, hydrated } = useAuthStore();
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (hydrated && isLoggedIn && user) {
      window.location.href = user.role === "recruiter" ? "/dashboard/recruiter" : "/dashboard/candidate";
    }
  }, [hydrated, isLoggedIn, user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setIsPending(true);
    try {
      const authUser = await loginUser({ email, password });
      console.log("Login OK, role:", authUser.role);
      window.location.href = authUser.role === "recruiter" ? "/dashboard/recruiter" : "/dashboard/candidate";
    } catch (err) {
      setError(getErrorMessage(err));
      setIsPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-auth-grid">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section className="flex items-center">
          <Card className="w-full border-white/40 bg-card/90 shadow-glow backdrop-blur">
            <CardHeader className="space-y-4 pb-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <ShieldCheck className="h-4 w-4" />
                Secure interview workspace
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-semibold tracking-tight">
                  Sign in to monitor interviews in real time.
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track candidate readiness, detect suspicious behavior, and move from schedule to report without losing context.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="recruiter@company.com"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-11 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? "Signing in..." : "Sign in"}
                </button>
              </form>
              <div className="mt-6 flex items-center justify-between rounded-2xl border border-border/70 bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                <span>New to InGuard1?</span>
                <Link className="inline-flex items-center gap-1 font-medium text-foreground transition hover:text-primary" href="/register">
                  Create account <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
        <section className="hidden rounded-[2rem] border border-white/20 bg-slate-950/90 p-8 text-slate-100 shadow-glow lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <div className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-200">
              Live interview intelligence
            </div>
            <div className="space-y-4">
              <h1 className="text-balance text-4xl font-semibold leading-tight">One control center for hiring teams running high-trust interviews.</h1>
              <p className="max-w-xl text-sm leading-6 text-slate-300">Recruiters can schedule sessions, watch AI scores evolve, and review flagged behavior from a single operational dashboard built for focus.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Live confidence tracking</p>
              <p className="mt-3 text-3xl font-semibold">92%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Suspicious alerts resolved</p>
              <p className="mt-3 text-3xl font-semibold">18 today</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}