"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Briefcase,
  CalendarPlus,
  FileSearch,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  UserRoundSearch,
  Video,
} from "lucide-react";
import api from "@/lib/api";
import { getErrorMessage, logoutUser } from "@/lib/auth";
import { useAuthStore } from "@/store/useAuthStore";
import {
  type ApiItemResponse,
  type ApiListResponse,
  type DashboardTab,
  type Job,
  type Session,
  type SessionStatus,
} from "@/components/recruiter/types";
import {
  formatDate,
  formatDateTime,
  getJobLabel,
  getRefId,
  getRefObject,
  getUserLabel,
  sessionFilters,
  type SessionFilter,
  toDateInputValue,
  uniqueCandidateCount,
} from "@/components/recruiter/utils";
import { RecruiterSidebar } from "@/components/recruiter/sidebar";
import { StatusBadge } from "@/components/recruiter/status-badge";
import { EmptyState } from "@/components/recruiter/empty-state";
import { TableSkeleton } from "@/components/recruiter/table-skeleton";
import { StatCard } from "@/components/recruiter/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const jobFormSchema = z
  .object({
    title: z.string().min(2, "Title is required."),
    description: z.string().min(10, "Description is required."),
    domain: z.string().min(2, "Domain is required."),
    skillsRequired: z.string().min(1, "At least one skill is required."),
    experienceLevel: z.enum(["junior", "mid", "senior"]),
    applyStart: z.string().min(1, "Apply start is required."),
    applyEnd: z.string().min(1, "Apply end is required."),
    status: z.enum(["open", "closed"]),
  })
  .refine(
    (values) => new Date(values.applyEnd).getTime() >= new Date(values.applyStart).getTime(),
    {
      message: "Apply end must be after apply start.",
      path: ["applyEnd"],
    }
  );

const sessionFormSchema = z.object({
  candidateId: z.string().min(1, "Candidate ID is required."),
  jobId: z.string().min(1, "Job is required."),
  scheduledAt: z.string().min(1, "Scheduled time is required."),
});

type JobFormValues = z.infer<typeof jobFormSchema>;
type SessionFormValues = z.infer<typeof sessionFormSchema>;

type CandidateRow = {
  candidateId: string;
  label: string;
  jobsApplied: number;
  lastSessionStatus: SessionStatus;
  lastSessionDate: string;
  sessions: Session[];
};

const defaultJobValues: JobFormValues = {
  title: "",
  description: "",
  domain: "",
  skillsRequired: "",
  experienceLevel: "junior",
  applyStart: "",
  applyEnd: "",
  status: "open",
};

const defaultSessionValues: SessionFormValues = {
  candidateId: "",
  jobId: "",
  scheduledAt: "",
};

const toSkillsArray = (value: string) =>
  value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

export default function RecruiterDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [applicantsDialogOpen, setApplicantsDialogOpen] = useState(false);
  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedApplicantsJob, setSelectedApplicantsJob] = useState<Job | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRow | null>(null);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const handleTabChange = (tab: DashboardTab) => {
    setError("");
    setActiveTab(tab);
  };

  const jobForm = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: defaultJobValues,
  });

  const sessionForm = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: defaultSessionValues,
  });

  useEffect(() => {
    void loadDashboard();
  }, []);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (left, right) =>
          new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime()
      ),
    [sessions]
  );

  const recentSessions = sortedSessions.slice(0, 5);

  const filteredSessions = useMemo(() => {
    if (sessionFilter === "all") {
      return sortedSessions;
    }

    return sortedSessions.filter((session) => session.status === sessionFilter);
  }, [sessionFilter, sortedSessions]);

  const candidateRows = useMemo<CandidateRow[]>(() => {
    const grouped = new Map<string, CandidateRow>();

    sortedSessions.forEach((session) => {
      const candidateId = getRefId(session.candidateId);

      if (!candidateId) {
        return;
      }

      const existing = grouped.get(candidateId) ?? {
        candidateId,
        label: getUserLabel(session.candidateId),
        jobsApplied: 0,
        lastSessionStatus: session.status,
        lastSessionDate: session.scheduledAt,
        sessions: [],
      };

      existing.sessions.push(session);

      const uniqueJobs = new Set(
        existing.sessions.map((item) => getRefId(item.jobId)).filter(Boolean)
      );
      existing.jobsApplied = uniqueJobs.size;

      if (
        new Date(session.scheduledAt).getTime() >=
        new Date(existing.lastSessionDate).getTime()
      ) {
        existing.lastSessionDate = session.scheduledAt;
        existing.lastSessionStatus = session.status;
      }

      grouped.set(candidateId, existing);
    });

    return Array.from(grouped.values()).sort(
      (left, right) =>
        new Date(right.lastSessionDate).getTime() -
        new Date(left.lastSessionDate).getTime()
    );
  }, [sortedSessions]);

  const applicantsForSelectedJob = useMemo(() => {
    if (!selectedApplicantsJob) {
      return [];
    }

    return sessions.filter(
      (session) => getRefId(session.jobId) === selectedApplicantsJob._id
    );
  }, [selectedApplicantsJob, sessions]);

  async function loadDashboard() {
    setIsLoading(true);
    setError("");

    try {
      let jobsData: Job[] = [];
      let sessionsData: Session[] = [];

      try {
        const jobsRes = await api.get("/api/jobs");
        jobsData = jobsRes.data.data ?? [];
      } catch (e) {
        console.error("Jobs fetch failed:", e);
      }

      try {
        const sessionsRes = await api.get("/api/sessions");
        sessionsData = sessionsRes.data.data ?? [];
      } catch (e) {
        console.error("Sessions fetch failed:", e);
      }

      setJobs(jobsData);
      setSessions(sessionsData);
      setError("");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateJobDialog() {
    setSelectedJob(null);
    jobForm.reset(defaultJobValues);
    setJobDialogOpen(true);
  }

  function openEditJobDialog(job: Job) {
    setSelectedJob(job);
    jobForm.reset({
      title: job.title,
      description: job.description,
      domain: job.domain,
      skillsRequired: job.skillsRequired.join(", "),
      experienceLevel: job.experienceLevel,
      applyStart: toDateInputValue(job.applyStart),
      applyEnd: toDateInputValue(job.applyEnd),
      status: job.status,
    });
    setJobDialogOpen(true);
  }

  async function onSubmitJob(values: JobFormValues) {
    setIsSavingJob(true);
    setError("");

    const payload = {
      ...values,
      skillsRequired: toSkillsArray(values.skillsRequired),
      applyStart: new Date(values.applyStart).toISOString(),
      applyEnd: new Date(values.applyEnd).toISOString(),
    };

    console.log("Submitting job:", values);

    try {
      if (selectedJob) {
        const response = await api.patch<ApiItemResponse<Job>>(
          `/api/jobs/${selectedJob._id}`,
          payload
        );

        setJobs((current) =>
          current.map((job) =>
            job._id === selectedJob._id ? response.data.data : job
          )
        );
      } else {
        const response = await api.post<ApiItemResponse<Job>>("/api/jobs", payload);
        setJobs((current) => [response.data.data, ...current]);
      }

      setJobDialogOpen(false);
      setError("");
      setSelectedJob(null);
      jobForm.reset(defaultJobValues);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSavingJob(false);
    }
  }

  async function onDeleteJob(job: Job) {
    const confirmed = window.confirm(`Delete "${job.title}"?`);

    if (!confirmed) {
      return;
    }

    setDeletingJobId(job._id);
    setError("");

    try {
      await api.delete(`/api/jobs/${job._id}`);
      setJobs((current) => current.filter((item) => item._id !== job._id));
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setDeletingJobId(null);
    }
  }

  async function onCreateSession(values: SessionFormValues) {
    setIsSavingSession(true);
    setError("");

    try {
      const response = await api.post<ApiItemResponse<Session>>("/api/sessions", {
        ...values,
        scheduledAt: new Date(values.scheduledAt).toISOString(),
      });

      setSessions((current) => [response.data.data, ...current]);
      setSessionDialogOpen(false);
      setError("");
      sessionForm.reset(defaultSessionValues);
      handleTabChange("sessions");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSavingSession(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <RecruiterSidebar activeTab={activeTab} onSelect={handleTabChange} />

      <div className="min-h-screen lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur">
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div>
              <p className="text-sm text-muted-foreground">Recruiter workspace</p>
              <h2 className="text-2xl font-semibold">
                Welcome, {user?.name ?? "Recruiter"}
              </h2>
            </div>

            <Button onClick={logoutUser} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <div className="space-y-6 px-6 py-6 lg:px-8">
          <div className="flex flex-wrap gap-2 lg:hidden">
            {[
              { key: "overview", label: "Overview" },
              { key: "jobs", label: "Jobs" },
              { key: "sessions", label: "Sessions" },
              { key: "candidates", label: "Candidates" },
            ].map((item) => (
              <Button
                key={item.key}
                onClick={() => handleTabChange(item.key as DashboardTab)}
                size="sm"
                variant={activeTab === item.key ? "default" : "outline"}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {activeTab === "overview" ? (
            <section className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Card key={`stat-skeleton-${index}`}>
                      <CardContent className="space-y-3 p-6">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-4 w-28" />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <>
                    <StatCard label="Total Jobs" value={String(jobs.length)} />
                    <StatCard
                      label="Active Sessions"
                      value={String(
                        sessions.filter((session) => session.status === "live").length
                      )}
                    />
                    <StatCard
                      label="Scheduled Sessions"
                      value={String(
                        sessions.filter((session) => session.status === "scheduled").length
                      )}
                    />
                    <StatCard
                      label="Total Candidates"
                      value={String(uniqueCandidateCount(sessions))}
                    />
                  </>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Recent Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <TableSkeleton columns={5} rows={5} />
                  ) : recentSessions.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Job</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Scheduled At</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentSessions.map((session) => (
                          <TableRow key={session._id}>
                            <TableCell>{getUserLabel(session.candidateId)}</TableCell>
                            <TableCell>{getJobLabel(session.jobId)}</TableCell>
                            <TableCell>
                              <StatusBadge value={session.status} />
                            </TableCell>
                            <TableCell>{formatDateTime(session.scheduledAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                onClick={() => router.push(`/interview/${session.roomId}`)}
                                size="sm"
                                variant="outline"
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState
                      description="Create interview sessions to populate the recent activity table."
                      icon={Video}
                      title="No recent sessions"
                    />
                  )}
                </CardContent>
              </Card>
            </section>
          ) : null}

          {activeTab === "jobs" ? (
            <section className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-2xl font-semibold">Jobs</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage openings and review which candidates have already reached interview stage.
                  </p>
                </div>
                <Button onClick={openCreateJobDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Post Job
                </Button>
              </div>

              <Card>
                <CardContent className="pt-6">
                  {isLoading ? (
                    <TableSkeleton columns={6} rows={5} />
                  ) : jobs.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Domain</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Apply End</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobs.map((job) => (
                          <TableRow key={job._id}>
                            <TableCell className="font-medium">{job.title}</TableCell>
                            <TableCell>{job.domain}</TableCell>
                            <TableCell className="capitalize">
                              {job.experienceLevel}
                            </TableCell>
                            <TableCell>
                              <StatusBadge value={job.status} />
                            </TableCell>
                            <TableCell>{formatDate(job.applyEnd)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  onClick={() => openEditJobDialog(job)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <Pencil className="mr-1 h-3.5 w-3.5" />
                                  Edit
                                </Button>
                                <Button
                                  disabled={deletingJobId === job._id}
                                  onClick={() => onDeleteJob(job)}
                                  size="sm"
                                  variant="outline"
                                >
                                  {deletingJobId === job._id ? (
                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                  )}
                                  Delete
                                </Button>
                                <Button
                                  onClick={() => {
                                    setSelectedApplicantsJob(job);
                                    setApplicantsDialogOpen(true);
                                  }}
                                  size="sm"
                                  variant="ghost"
                                >
                                  View Applicants
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState
                      description="Post your first job to start building the recruiter pipeline."
                      icon={Briefcase}
                      title="No jobs posted"
                    />
                  )}
                </CardContent>
              </Card>
            </section>
          ) : null}

          {activeTab === "sessions" ? (
            <section className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-2xl font-semibold">Sessions</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor room activity and move directly into the interview space.
                  </p>
                </div>
                <Button onClick={() => setSessionDialogOpen(true)}>
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Create Session
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {sessionFilters.map((filter) => (
                  <Button
                    className="capitalize"
                    key={filter}
                    onClick={() => setSessionFilter(filter)}
                    size="sm"
                    variant={sessionFilter === filter ? "default" : "outline"}
                  >
                    {filter}
                  </Button>
                ))}
              </div>

              <Card>
                <CardContent className="pt-6">
                  {isLoading ? (
                    <TableSkeleton columns={6} rows={5} />
                  ) : filteredSessions.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate ID</TableHead>
                          <TableHead>Job ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Scheduled At</TableHead>
                          <TableHead>Room ID</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSessions.map((session) => (
                          <TableRow key={session._id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{getRefId(session.candidateId)}</p>
                                {getRefObject(session.candidateId)?.name ? (
                                  <p className="text-xs text-muted-foreground">
                                    {getRefObject(session.candidateId)?.name}
                                  </p>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{getRefId(session.jobId)}</p>
                                {getRefObject(session.jobId)?.title ? (
                                  <p className="text-xs text-muted-foreground">
                                    {getRefObject(session.jobId)?.title}
                                  </p>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge value={session.status} />
                            </TableCell>
                            <TableCell>{formatDateTime(session.scheduledAt)}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {session.roomId}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                onClick={() => router.push(`/interview/${session.roomId}`)}
                                size="sm"
                                variant="outline"
                              >
                                Join
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState
                      description="Create a session to start interview monitoring."
                      icon={Video}
                      title="No sessions found"
                    />
                  )}
                </CardContent>
              </Card>
            </section>
          ) : null}

          {activeTab === "candidates" ? (
            <section className="space-y-6">
              <div>
                <h3 className="text-2xl font-semibold">Candidates</h3>
                <p className="text-sm text-muted-foreground">
                  Candidate activity is derived directly from interview sessions.
                </p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  {isLoading ? (
                    <TableSkeleton columns={4} rows={5} />
                  ) : candidateRows.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate ID</TableHead>
                          <TableHead>Jobs Applied</TableHead>
                          <TableHead>Last Session Status</TableHead>
                          <TableHead>Last Session Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {candidateRows.map((candidate) => (
                          <TableRow
                            className="cursor-pointer"
                            key={candidate.candidateId}
                            onClick={() => {
                              setSelectedCandidate(candidate);
                              setCandidateDialogOpen(true);
                            }}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">{candidate.candidateId}</p>
                                <p className="text-xs text-muted-foreground">
                                  {candidate.label}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{candidate.jobsApplied}</TableCell>
                            <TableCell>
                              <StatusBadge value={candidate.lastSessionStatus} />
                            </TableCell>
                            <TableCell>{formatDateTime(candidate.lastSessionDate)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState
                      description="Candidates will appear here after sessions are created."
                      icon={UserRoundSearch}
                      title="No candidate activity yet"
                    />
                  )}
                </CardContent>
              </Card>
            </section>
          ) : null}
        </div>
      </div>

      <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedJob ? "Edit Job" : "Post Job"}</DialogTitle>
            <DialogDescription>
              Define the role details and application window for this opening.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={jobForm.handleSubmit(onSubmitJob)}>
            <div className="space-y-2">
              <Label htmlFor="job-title">Title</Label>
              <Input id="job-title" {...jobForm.register("title")} />
              {jobForm.formState.errors.title ? (
                <p className="text-sm text-destructive">
                  {jobForm.formState.errors.title.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-description">Description</Label>
              <Textarea id="job-description" {...jobForm.register("description")} />
              {jobForm.formState.errors.description ? (
                <p className="text-sm text-destructive">
                  {jobForm.formState.errors.description.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="job-domain">Domain</Label>
                <Input id="job-domain" {...jobForm.register("domain")} />
                {jobForm.formState.errors.domain ? (
                  <p className="text-sm text-destructive">
                    {jobForm.formState.errors.domain.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-skills">Skills Required</Label>
                <Input
                  id="job-skills"
                  placeholder="Node.js, React, MongoDB"
                  {...jobForm.register("skillsRequired")}
                />
                {jobForm.formState.errors.skillsRequired ? (
                  <p className="text-sm text-destructive">
                    {jobForm.formState.errors.skillsRequired.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Controller
                  control={jobForm.control}
                  name="experienceLevel"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="mid">Mid</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  control={jobForm.control}
                  name="status"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="job-apply-start">Apply Start</Label>
                <Input
                  id="job-apply-start"
                  type="date"
                  {...jobForm.register("applyStart")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-apply-end">Apply End</Label>
                <Input
                  id="job-apply-end"
                  type="date"
                  {...jobForm.register("applyEnd")}
                />
                {jobForm.formState.errors.applyEnd ? (
                  <p className="text-sm text-destructive">
                    {jobForm.formState.errors.applyEnd.message}
                  </p>
                ) : null}
              </div>
            </div>

            {jobForm.formState.errors.root && (
              <p className="text-sm text-red-500">
                {jobForm.formState.errors.root.message}
              </p>
            )}

            <DialogFooter>
              <Button
                onClick={() => setJobDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isSavingJob} type="submit">
                {isSavingJob ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : selectedJob ? (
                  "Save Changes"
                ) : (
                  "Post Job"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Session</DialogTitle>
            <DialogDescription>
              Schedule a candidate and assign the session to a job.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-5"
            onSubmit={sessionForm.handleSubmit(onCreateSession)}
          >
            <div className="space-y-2">
              <Label htmlFor="session-candidate-id">Candidate ID</Label>
              <Input
                id="session-candidate-id"
                placeholder="Enter candidate user ID"
                {...sessionForm.register("candidateId")}
              />
              {sessionForm.formState.errors.candidateId ? (
                <p className="text-sm text-destructive">
                  {sessionForm.formState.errors.candidateId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Job</Label>
              <Controller
                control={sessionForm.control}
                name="jobId"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a job" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((job) => (
                        <SelectItem key={job._id} value={job._id}>
                          {job.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {sessionForm.formState.errors.jobId ? (
                <p className="text-sm text-destructive">
                  {sessionForm.formState.errors.jobId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-scheduled-at">Scheduled At</Label>
              <Input
                id="session-scheduled-at"
                type="datetime-local"
                {...sessionForm.register("scheduledAt")}
              />
              {sessionForm.formState.errors.scheduledAt ? (
                <p className="text-sm text-destructive">
                  {sessionForm.formState.errors.scheduledAt.message}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                onClick={() => setSessionDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isSavingSession || !jobs.length} type="submit">
                {isSavingSession ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Session"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={applicantsDialogOpen}
        onOpenChange={setApplicantsDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Applicants for {selectedApplicantsJob?.title ?? "this job"}
            </DialogTitle>
            <DialogDescription>
              Candidates already associated with interview sessions for this role.
            </DialogDescription>
          </DialogHeader>

          {applicantsForSelectedJob.length ? (
            <div className="space-y-3">
              {applicantsForSelectedJob.map((session) => (
                <div
                  className="rounded-2xl border border-border/70 px-4 py-3"
                  key={session._id}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{getUserLabel(session.candidateId)}</p>
                      <p className="text-xs text-muted-foreground">
                        {getRefId(session.candidateId)}
                      </p>
                    </div>
                    <StatusBadge value={session.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Scheduled: {formatDateTime(session.scheduledAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              description="No interview sessions have been created for this job yet."
              icon={FileSearch}
              title="No applicants found"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={candidateDialogOpen} onOpenChange={setCandidateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Candidate Sessions: {selectedCandidate?.candidateId ?? ""}
            </DialogTitle>
            <DialogDescription>
              Every recorded session currently associated with this candidate.
            </DialogDescription>
          </DialogHeader>

          {selectedCandidate?.sessions.length ? (
            <div className="space-y-3">
              {selectedCandidate.sessions.map((session) => (
                <div
                  className="rounded-2xl border border-border/70 px-4 py-3"
                  key={session._id}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{getJobLabel(session.jobId)}</p>
                      <p className="text-xs text-muted-foreground">
                        Room ID: {session.roomId}
                      </p>
                    </div>
                    <StatusBadge value={session.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Scheduled: {formatDateTime(session.scheduledAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              description="This candidate does not have any sessions yet."
              icon={UserRoundSearch}
              title="No session details"
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
