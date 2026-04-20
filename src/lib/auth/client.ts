"use client";

import { useAuthStore } from "@/stores/auth.store";

let refreshInFlight: Promise<boolean> | null = null;

/** Rotate the refresh cookie for a fresh access token. */
export async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (!res.ok) {
        useAuthStore.getState().clear();
        return false;
      }
      const body = (await res.json()) as {
        accessToken: string;
        accessTokenTtlSec: number;
      };
      useAuthStore
        .getState()
        .setAccessToken(body.accessToken, body.accessTokenTtlSec);
      return true;
    } catch {
      useAuthStore.getState().clear();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/**
 * Fetch wrapper that attaches the in-memory access token and retries once on
 * 401 after refreshing.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const state = useAuthStore.getState();
  const headers = new Headers(init?.headers);
  if (state.accessToken) {
    headers.set("Authorization", `Bearer ${state.accessToken}`);
  }
  let res = await fetch(input, { ...init, headers });
  if (res.status === 401 && state.accessToken) {
    const ok = await refreshAccessToken();
    if (!ok) return res;
    const freshToken = useAuthStore.getState().accessToken;
    if (!freshToken) return res;
    headers.set("Authorization", `Bearer ${freshToken}`);
    res = await fetch(input, { ...init, headers });
  }
  return res;
}

export async function logoutClient(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    useAuthStore.getState().clear();
  }
}
