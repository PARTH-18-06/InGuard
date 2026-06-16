export type DashboardTab = "overview" | "jobs" | "sessions" | "candidates";

export type ExperienceLevel = "junior" | "mid" | "senior";

export type JobStatus = "open" | "closed";

export type SessionStatus = "scheduled" | "live" | "completed" | "cancelled";

export type ApiRef<T extends object> = string | (T & { _id: string }) | null;

export interface User {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: "candidate" | "recruiter";
}

export interface Job {
  _id: string;
  title: string;
  description: string;
  domain: string;
  skillsRequired: string[];
  experienceLevel: ExperienceLevel;
  applyStart: string;
  applyEnd: string;
  status: JobStatus;
  createdBy?: ApiRef<User>;
}

export interface SessionReport {
  focusScore?: number;
  confidenceScore?: number;
  communicationScore?: number;
  technicalScore?: number;
  trustScore?: number;
  suspiciousActivities?: string[];
  summary?: string;
}

export interface Session {
  _id: string;
  roomId: string;
  status: SessionStatus;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  jobId: ApiRef<Job>;
  candidateId: ApiRef<User>;
  recruiterId?: ApiRef<User>;
  aiReport?: SessionReport;
}

export interface ApiListResponse<T> {
  success?: boolean;
  count?: number;
  data: T[];
}

export interface ApiItemResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}
