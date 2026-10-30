export type EmailJobStatus = "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED";

export interface EmailJob {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: EmailJobStatus;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[] | undefined>;
}

export type { User } from "./user";
