"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Briefcase, Video, Bot, LogOut, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { logoutUser, getErrorMessage } from "@/lib/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Job = {
  _id: string;
  title: string;
  description: string;
  domain: string;
  skillsRequired: string[];
  experienceLevel: string;
  applyStart: string;
  applyEnd: string;
  status: string;
};

type Session = {
  _id: string;
  status: string;
  scheduledAt: string;
  roomId: string;
};

type Tab = "overview" | "jobs" | "sessions" | "mock";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  live: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "sessions", label: "Sessions", icon: Video },
  { key: "mock", label: "Mock Interview", icon: Bot },
];

export default function CandidateDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [domain, setDomain] = useState("");
  const [level, setLevel] = useState("junior");
  const [questions, setQuestions] = useState("5");

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push("/login"); return; }
    loadData();
  }, [hydrated]);

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [jobsRes, sessionsRes] = await Promise.all([
        api.get("/api/jobs"),
        api.get("/api/sessions"),
      ]);
      setJobs(jobsRes.data.data ?? []);
      setSessions(sessionsRes.data.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: Tab) => { setError(""); setActiveTab(tab); };
  const openJobs = jobs.filter((j) => j.status === "open");
  const upcomingSessions = sessions.filter((s) => s.status === "scheduled");
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const filteredSessions = sessionFilter === "all"
    ? sessions
    : sessions.filter((s) => s.status === sessionFilter);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">InGuard1</p>
          <p className="text-lg font-semibold">Candidate Dashboard</p>
        </div>
        <nav className="flex flex-col gap-1">
          {TABS.map((tab) => (
            <button key={tab.key}
              onClick={() => handleTabChange(tab.key as Tab)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              <tab.icon className="h-4 w-4" />{tab.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div>
            <p className="text-xs text-muted-foreground">Candidate workspace</p>
            <p className="text-lg font-semibold">Welcome, {user?.name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={logoutUser}>
            <LogOut className="mr-2 h-4 w-4" />Logout
          </Button>
        </header>
        <main className="flex-1 p-6">
          <div className="mb-6 flex gap-2 overflow-x-auto lg:hidden">
            {TABS.map((tab) => (
              <button key={tab.key}
                onClick={() => handleTabChange(tab.key as Tab)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${activeTab === tab.key ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                <tab.icon className="h-4 w-4" />{tab.label}
              </button>
            ))}
          </div>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />{error}
            </div>
          )}
          <>
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader><CardTitle className="text-sm text-muted-foreground">Upcoming Sessions</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold">{isLoading ? "..." : upcomingSessions.length}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm text-muted-foreground">Completed Interviews</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold">{isLoading ? "..." : completedSessions.length}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm text-muted-foreground">Available Jobs</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold">{isLoading ? "..." : openJobs.length}</p></CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Recent Sessions</CardTitle></CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} className="h-10 w-full"/>)}</div>
                  ) : sessions.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No recent sessions yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-muted-foreground">
                        <th className="pb-2 text-left">Room</th>
                        <th className="pb-2 text-left">Status</th>
                        <th className="pb-2 text-left">Date</th>
                        <th className="pb-2 text-left">Action</th>
                      </tr></thead>
                      <tbody>
                        {sessions.slice(0,5).map(s=>(
                          <tr key={s._id} className="border-b last:border-0">
                            <td className="py-2 font-mono text-xs">{s.roomId}</td>
                            <td className="py-2"><span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_COLORS[s.status]||"bg-gray-100"}`}>{s.status}</span></td>
                            <td className="py-2">{s.scheduledAt ? new Date(s.scheduledAt).toLocaleDateString() : "-"}</td>
                            <td className="py-2"><Button size="sm" variant="outline" onClick={()=>router.push(`/interview/${s.roomId}`)}>Join</Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          {activeTab === "jobs" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Available Jobs</h2>
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2">{[1,2].map(i=><Skeleton key={i} className="h-40 w-full"/>)}</div>
              ) : openJobs.length === 0 ? (
                <Card><CardContent className="py-16 text-center">
                  <Briefcase className="mx-auto mb-4 h-10 w-10 text-muted-foreground"/>
                  <p className="font-medium">No open jobs</p>
                  <p className="text-sm text-muted-foreground">Check back soon.</p>
                </CardContent></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {openJobs.map(job=>(
                    <Card key={job._id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{job.title}</CardTitle>
                          <Badge variant="outline">{job.experienceLevel}</Badge>
                        </div>
                        <Badge className="w-fit">{job.domain}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {job.skillsRequired?.map(s=>(
                            <span key={s} className="rounded bg-muted px-2 py-0.5 text-xs">{s}</span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">Apply by: {new Date(job.applyEnd).toLocaleDateString()}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === "sessions" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Your Sessions</h2>
              <div className="flex flex-wrap gap-2">
                {["all","scheduled","live","completed","cancelled"].map(f=>(
                  <button key={f} onClick={()=>setSessionFilter(f)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${sessionFilter===f?"bg-primary text-white":"bg-muted text-muted-foreground"}`}>
                    {f}
                  </button>
                ))}
              </div>
              {isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} className="h-12 w-full"/>)}</div>
              ) : filteredSessions.length === 0 ? (
                <Card><CardContent className="py-16 text-center">
                  <Video className="mx-auto mb-4 h-10 w-10 text-muted-foreground"/>
                  <p className="font-medium">No sessions available</p>
                  <p className="text-sm text-muted-foreground">Sessions will appear here once a recruiter schedules them.</p>
                </CardContent></Card>
              ) : (
                <Card><CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50 text-muted-foreground">
                      <th className="px-4 py-3 text-left">Room</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Action</th>
                    </tr></thead>
                    <tbody>
                      {filteredSessions.map(s=>(
                        <tr key={s._id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-xs">{s.roomId}</td>
                          <td className="px-4 py-3"><span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_COLORS[s.status]||"bg-gray-100"}`}>{s.status}</span></td>
                          <td className="px-4 py-3">{s.scheduledAt ? new Date(s.scheduledAt).toLocaleDateString() : "-"}</td>
                          <td className="px-4 py-3"><Button size="sm" variant="outline" onClick={()=>router.push(`/interview/${s.roomId}`)}>Join</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent></Card>
              )}
            </div>
          )}
          {activeTab === "mock" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-xl font-semibold">Mock Interview</h2>
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Domain</label>
                    <input value={domain} onChange={e=>setDomain(e.target.value)}
                      placeholder="e.g. Frontend Development"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Level</label>
                      <select value={level} onChange={e=>setLevel(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                        <option value="junior">Junior</option>
                        <option value="mid">Mid</option>
                        <option value="senior">Senior</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Questions</label>
                      <select value={questions} onChange={e=>setQuestions(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="15">15</option>
                      </select>
                    </div>
                  </div>
                  <Button className="w-full" onClick={()=>{
                    if (!domain.trim()) return;
                    router.push(`/mock-interview?domain=${encodeURIComponent(domain)}&level=${level}&questions=${questions}`);
                  }}>
                    <Bot className="mr-2 h-4 w-4"/>Start Mock Interview
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">How it works</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {["Choose your domain and level","AI generates questions","Answer and get feedback","Get score report with weak points","Get course recommendations"].map((step,i)=>(
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{i+1}</span>
                      <p className="text-sm text-muted-foreground">{step}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
          </>
        </main>
      </div>
    </div>
  );
}
