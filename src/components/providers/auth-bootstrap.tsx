"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { authFetch, refreshAccessToken } from "@/lib/auth/client";

/**
 * Bootstraps the in-memory access token from the refresh cookie and fetches
 * the current user profile. Renders a subtle loading state until hydration
 * completes. If `requireAuth` is true and no user can be resolved, redirects
 * to /login.
 */
export function AuthGate({
  children,
  requireAuth = true,
}: {
  children: ReactNode;
  requireAuth?: boolean;
}) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const { setAuth, setHydrated } = useAuthStore.getState();

    (async () => {
      if (!useAuthStore.getState().accessToken) {
        const ok = await refreshAccessToken();
        if (!ok) {
          setHydrated();
          if (requireAuth) router.replace("/login");
          return;
        }
      }

      const res = await authFetch("/api/auth/me");
      if (!res.ok) {
        setHydrated();
        if (requireAuth) router.replace("/login");
        return;
      }
      const body = (await res.json()) as {
        user: {
          id: string;
          email: string;
          name: string | null;
          role: "OWNER" | "ADMIN" | "AGENT";
        };
        workspace: { id: string; name: string; slug: string };
      };
      setAuth({
        user: body.user,
        workspace: body.workspace,
        accessToken: useAuthStore.getState().accessToken ?? "",
        accessTokenTtlSec: 900,
      });
    })();
  }, [router, requireAuth]);

  // Refresh 60s before the access token expires.
  useEffect(() => {
    if (!accessToken) return;
    const expiresAt = useAuthStore.getState().accessTokenExpiresAt;
    if (!expiresAt) return;
    const ms = expiresAt - Date.now() - 60_000;
    if (ms <= 0) {
      void refreshAccessToken();
      return;
    }
    const t = setTimeout(() => {
      void refreshAccessToken();
    }, ms);
    return () => clearTimeout(t);
  }, [accessToken]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (requireAuth && !user) return null;
  return <>{children}</>;
}
