"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { registerUser, getDashboardPath, getErrorMessage } from "@/lib/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(["candidate", "recruiter"]),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { user, isLoggedIn, hydrated } = useAuthStore();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "candidate",
    },
  });

  useEffect(() => {
    if (hydrated && isLoggedIn && user) {
      router.replace(getDashboardPath(user.role));
    }
  }, [hydrated, isLoggedIn, router, user]);

  const onSubmit = (values: RegisterFormValues) => {
    setError("");

    startTransition(async () => {
      try {
        const authenticatedUser = await registerUser(values);
        router.push(getDashboardPath(authenticatedUser.role));
      } catch (submissionError) {
        setError(getErrorMessage(submissionError));
      }
    });
  };

  return (
    <main className="min-h-screen bg-auth-grid">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-10">
        <section className="hidden rounded-[2rem] border border-white/20 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-8 text-slate-100 shadow-glow lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <div className="inline-flex w-fit rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-200">
              Structured onboarding
            </div>
            <div className="space-y-4">
              <h1 className="text-balance text-4xl font-semibold leading-tight">
                Create a hiring workspace that feels deliberate from day one.
              </h1>
              <p className="max-w-xl text-sm leading-6 text-slate-300">
                Recruiters can launch interview pipelines, while candidates receive a calm, guided experience designed for focus and credibility.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Session completion rate</p>
              <p className="mt-3 text-3xl font-semibold">96.4%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Average trust score uplift</p>
              <p className="mt-3 text-3xl font-semibold">+14 pts</p>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <Card className="w-full border-white/40 bg-card/90 shadow-glow backdrop-blur">
            <CardHeader className="space-y-4 pb-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Launch your workspace
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-semibold tracking-tight">
                  Create your InGuard1 account.
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Get started with a focused candidate or recruiter workspace and continue straight into your dashboard.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    placeholder="Avery Johnson"
                    autoComplete="name"
                    {...register("name")}
                  />
                  {errors.name ? (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  ) : null}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      placeholder="avery@company.com"
                      type="email"
                      autoComplete="email"
                      {...register("email")}
                    />
                    {errors.email ? (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      placeholder="At least 6 characters"
                      type="password"
                      autoComplete="new-password"
                      {...register("password")}
                    />
                    {errors.password ? (
                      <p className="text-sm text-destructive">{errors.password.message}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Controller
                    control={control}
                    name="role"
                    render={({ field }) => (
                      <Select defaultValue={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="candidate">Candidate</SelectItem>
                          <SelectItem value="recruiter">Recruiter</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.role ? (
                    <p className="text-sm text-destructive">{errors.role.message}</p>
                  ) : null}
                </div>

                {error ? (
                  <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <Button className="h-11 w-full text-sm font-semibold" disabled={isPending} type="submit">
                  {isPending ? "Creating account..." : "Create account"}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-between rounded-2xl border border-border/70 bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                <span>Already have an account?</span>
                <Link
                  className="inline-flex items-center gap-1 font-medium text-foreground transition hover:text-primary"
                  href="/login"
                >
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
