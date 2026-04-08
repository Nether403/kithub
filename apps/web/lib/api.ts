import { getSupabaseAccessToken } from "./auth";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function fetchWithSupabaseAuth(
  path: string,
  init?: RequestInit,
) {
  const token = await getSupabaseAccessToken();
  if (!token) {
    throw new Error("Please sign in to continue.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(body?.message || `Request failed (${response.status})`);
  }

  return body;
}
