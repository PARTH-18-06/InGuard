"use client";

import Link from "next/link";
import {
  Shield, Video, Brain, BarChart3, Users,
  CheckCircle, ArrowRight, Zap, Eye, Mic
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* NAVBAR */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-cyan-400" />
            <span className="text-xl font-bold tracking-tight">InGuard1</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950" />
        <div className="relative z-10 max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-300">
            <Zap className="h-4 w-4" />
            AI-Powered Interview Intelligence
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Interviews that
            <span className="block bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              see everything.
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-400">
            InGuard1 monitors candidates in real time with AI — tracking focus, confidence,
            trust, and suspicious behavior — while enabling live video interviews and
            AI-powered mock sessions with instant feedback.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-4 text-base font-semibold text-slate-950 hover:bg-cyan-400 transition"
            >
              Start for free <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-medium text-white hover:bg-white/5 transition"
            >
              Sign in to dashboard
            </Link>
          </div>
          <div className="flex items-center justify-center gap-8 pt-4 text-sm text-slate-500">
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-400" />Free to use</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-400" />No credit card</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-400" />AI powered</span>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-white/10 bg-white/5 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: "96.4%", label: "Session completion rate" },
              { value: "3x", label: "Faster candidate evaluation" },
              { value: "+14pts", label: "Average trust score uplift" },
              { value: "< 2s", label: "Real-time alert latency" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-bold text-cyan-400">{stat.value}</p>
                <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-bold">Everything you need to run great interviews</h2>
            <p className="mt-4 text-slate-400">Built for recruiters who care about signal over noise.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Eye,
                title: "AI Face & Eye Tracking",
                description: "Real-time detection of focus, attention, and suspicious behavior using computer vision running entirely in the browser.",
                color: "text-cyan-400",
                bg: "bg-cyan-400/10",
              },
              {
                icon: Video,
                title: "Live Video Interviews",
                description: "Peer-to-peer WebRTC video calls between recruiters and candidates — no plugins, no third-party services needed.",
                color: "text-blue-400",
                bg: "bg-blue-400/10",
              },
              {
                icon: Brain,
                title: "Mock AI Interviews",
                description: "AI generates domain-specific interview questions, evaluates answers in real time, and provides instant detailed feedback.",
                color: "text-purple-400",
                bg: "bg-purple-400/10",
              },
              {
                icon: BarChart3,
                title: "Live Monitoring Scores",
                description: "Focus, Confidence, Trust, and Overall scores update in real time as the interview progresses.",
                color: "text-green-400",
                bg: "bg-green-400/10",
              },
              {
                icon: Mic,
                title: "Background Noise Detection",
                description: "Audio analysis detects background noise and suspicious sounds, alerting recruiters instantly.",
                color: "text-yellow-400",
                bg: "bg-yellow-400/10",
              },
              {
                icon: Users,
                title: "Recruiter & Candidate Dashboards",
                description: "Separate workspaces for recruiters to manage jobs and sessions, and candidates to view openings and practice.",
                color: "text-rose-400",
                bg: "bg-rose-400/10",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition"
              >
                <div className={`mb-4 inline-flex rounded-xl ${feature.bg} p-3`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white/5 py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold">How it works</h2>
          <p className="mt-4 mb-16 text-slate-400">Get started in minutes, not days.</p>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Recruiter posts a job",
                description: "Create a job listing, schedule interview sessions, and invite candidates to the platform.",
              },
              {
                step: "02",
                title: "Candidate joins the room",
                description: "Candidate opens the interview link, grants camera and mic access, and the AI monitoring starts automatically.",
              },
              {
                step: "03",
                title: "Review AI insights",
                description: "After the interview, review focus scores, alerts, suspicious events, and AI-generated recommendations.",
              },
            ].map((item) => (
              <div key={item.step} className="space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/20 text-2xl font-bold text-cyan-400">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="mx-auto max-w-2xl space-y-8">
          <h2 className="text-4xl font-bold">
            Ready to run smarter interviews?
          </h2>
          <p className="text-slate-400">
            Join recruiters using InGuard1 to make faster, more confident hiring decisions.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-4 text-base font-semibold text-slate-950 hover:bg-cyan-400 transition"
            >
              Create free account <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-medium hover:bg-white/5 transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-8 px-6 text-center text-sm text-slate-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span className="font-semibold text-white">InGuard1</span>
        </div>
        <p>AI-powered interview intelligence platform. Built with Next.js, Node.js, and WebRTC.</p>
      </footer>

    </div>
  );
}
