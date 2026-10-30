import type { ApiError } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers
    }
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null;
    const message = error?.error ?? `Request failed (${response.status})`;
    throw new ApiRequestError(
      error?.hint ? `${message} ${error.hint}` : message,
      response.status
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function getApiUrl(): string {
  return API_URL;
}
