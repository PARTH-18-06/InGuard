import type {
  ApiRef,
  Job,
  JobStatus,
  Session,
  SessionStatus,
  User,
} from "@/components/recruiter/types";

export const dashboardTabs = [
  { key: "overview", label: "Overview" },
  { key: "jobs", label: "Jobs" },
  { key: "sessions", label: "Sessions" },
  { key: "candidates", label: "Candidates" },
] as const;

export const sessionFilters = [
  "all",
  "scheduled",
  "live",
  "completed",
  "cancelled",
] as const;

export type SessionFilter = (typeof sessionFilters)[number];

export const badgeToneMap: Record<JobStatus | SessionStatus, string> = {
  scheduled:
    "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  live: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  completed:
    "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  cancelled:
    "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  open: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  closed: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export const getRefId = <T extends object>(value: ApiRef<T>) => {
  if (!value) {
    return "";
  }

  return typeof value === "string" ? value : value._id;
};

export const getRefObject = <T extends object>(value: ApiRef<T>) => {
  if (!value || typeof value === "string") {
    return null;
  }

  return value;
};

export const getUserLabel = (value: ApiRef<User>) => {
  const user = getRefObject(value);
  return user?.name || getRefId(value) || "Unknown candidate";
};

export const getJobLabel = (value: ApiRef<Job>) => {
  const job = getRefObject(value);
  return job?.title || getRefId(value) || "Unknown job";
};

export const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "--";

export const formatDateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "--";

export const toDateInputValue = (value?: string) => (value ? value.slice(0, 10) : "");

export const uniqueCandidateCount = (sessions: Session[]) =>
  new Set(
    sessions.map((session) => getRefId(session.candidateId)).filter(Boolean)
  ).size;
