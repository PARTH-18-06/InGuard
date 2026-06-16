"use client";

import { Briefcase, LayoutDashboard, Users, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardTab } from "@/components/recruiter/types";

const navItems = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "sessions", label: "Sessions", icon: Video },
  { key: "candidates", label: "Candidates", icon: Users },
] as const satisfies ReadonlyArray<{
  key: DashboardTab;
  label: string;
  icon: typeof LayoutDashboard;
}>;

export function RecruiterSidebar({
  activeTab,
  onSelect,
}: {
  activeTab: DashboardTab;
  onSelect: (tab: DashboardTab) => void;
}) {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 border-r border-border/70 bg-card/95 px-4 py-6 backdrop-blur lg:block">
      <div className="space-y-8">
        <div className="space-y-2 px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            InGuard1
          </p>
          <h1 className="text-2xl font-semibold">Recruiter Dashboard</h1>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                activeTab === item.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              key={item.key}
              onClick={() => onSelect(item.key)}
              type="button"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
