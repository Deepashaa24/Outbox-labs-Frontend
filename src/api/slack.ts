import { apiRequest, getApiUrl } from "./client";

export interface SlackStatus {
  connected: boolean;
}

interface ApiResponse<T> {
  data: T;
}

export async function fetchSlackStatus(): Promise<SlackStatus> {
  const response = await apiRequest<ApiResponse<SlackStatus>>("/api/slack/status");
  return response.data;
}

export async function disconnectSlack(): Promise<void> {
  await apiRequest<void>("/api/slack/disconnect", { method: "DELETE" });
}

export async function sendSlackTestMessage(): Promise<void> {
  await apiRequest<{ data: { sent: boolean } }>("/api/slack/test-message", { method: "POST" });
}

export function getSlackConnectUrl(): string {
  return `${getApiUrl()}/auth/slack/connect`;
}
