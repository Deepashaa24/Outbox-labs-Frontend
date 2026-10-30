import { apiRequest, getApiUrl } from "./client";
import type { User } from "../types/user";

interface ApiResponse<T> {
  data: T;
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await apiRequest<ApiResponse<User>>("/api/me");
  return response.data;
}

export async function logout(): Promise<void> {
  await apiRequest<void>("/auth/logout", { method: "POST" });
}

export function getGoogleSignInUrl(): string {
  return `${getApiUrl()}/auth/google`;
}
