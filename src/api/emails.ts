import type { EmailJob, EmailJobStatus } from "../types";
import { apiRequest } from "./client";

export interface ApiResponse<T> {
  data: T;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedEmailResponse {
  data: EmailJob[];
  pagination: Pagination;
}

export type EmailSearchResponse = PaginatedEmailResponse;

export interface CreateEmailInput {
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
}

export interface EmailListParams {
  page: number;
  pageSize: number;
  query: string;
}

export interface EmailLimits {
  maxEmailsPerHourPerSender: number;
  maxRecipientsPerBatch: number;
}

export interface ScheduleEmailBatchInput {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenMs: number;
  hourlyLimit: number;
}

export interface ScheduleEmailBatchResponse {
  data: EmailJob[];
  batchId: string;
}

export async function fetchEmailLimits(): Promise<EmailLimits> {
  const response = await apiRequest<ApiResponse<EmailLimits>>("/api/emails/limits");
  return response.data;
}

export async function scheduleEmailBatch(
  input: ScheduleEmailBatchInput
): Promise<ScheduleEmailBatchResponse> {
  return apiRequest<ScheduleEmailBatchResponse>("/api/emails/schedule", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function fetchScheduledEmails(
  params: EmailListParams
): Promise<PaginatedEmailResponse> {
  if (params.query.trim()) {
    return searchEmails(params.query, "SCHEDULED", params.page, params.pageSize);
  }
  return apiRequest<PaginatedEmailResponse>(
    `/api/emails/scheduled?page=${params.page}&pageSize=${params.pageSize}`
  );
}

export async function fetchSentEmails(
  params: EmailListParams
): Promise<PaginatedEmailResponse> {
  if (params.query.trim()) {
    return searchEmails(params.query, "SENT", params.page, params.pageSize);
  }
  return apiRequest<PaginatedEmailResponse>(
    `/api/emails/sent?page=${params.page}&pageSize=${params.pageSize}`
  );
}

async function searchEmails(
  query: string,
  status: EmailJobStatus,
  page: number,
  pageSize: number
): Promise<EmailSearchResponse> {
  const search = new URLSearchParams({
    q: query.trim(),
    status,
    page: String(page),
    pageSize: String(pageSize)
  });
  return apiRequest<EmailSearchResponse>(`/api/emails/search?${search.toString()}`);
}

export async function createEmail(input: CreateEmailInput): Promise<EmailJob> {
  const response = await apiRequest<ApiResponse<EmailJob>>("/api/emails", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return response.data;
}
