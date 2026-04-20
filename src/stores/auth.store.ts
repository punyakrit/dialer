"use client";

import { create } from "zustand";
import type { UserRole } from "@/types/db";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type AuthWorkspace = {
  id: string;
  name: string;
  slug: string;
};

type AuthState = {
  user: AuthUser | null;
  workspace: AuthWorkspace | null;
  accessToken: string | null;
  accessTokenExpiresAt: number | null; // epoch ms
  hydrated: boolean;
  setAuth: (args: {
    user: AuthUser;
    workspace?: AuthWorkspace | null;
    accessToken: string;
    accessTokenTtlSec: number;
  }) => void;
  setAccessToken: (token: string, ttlSec: number) => void;
  setWorkspace: (workspace: AuthWorkspace) => void;
  clear: () => void;
  setHydrated: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  workspace: null,
  accessToken: null,
  accessTokenExpiresAt: null,
  hydrated: false,
  setAuth: ({ user, workspace, accessToken, accessTokenTtlSec }) =>
    set({
      user,
      workspace: workspace ?? null,
      accessToken,
      accessTokenExpiresAt: Date.now() + accessTokenTtlSec * 1000,
      hydrated: true,
    }),
  setAccessToken: (token, ttlSec) =>
    set({
      accessToken: token,
      accessTokenExpiresAt: Date.now() + ttlSec * 1000,
    }),
  setWorkspace: (workspace) => set({ workspace }),
  clear: () =>
    set({
      user: null,
      workspace: null,
      accessToken: null,
      accessTokenExpiresAt: null,
    }),
  setHydrated: () => set({ hydrated: true }),
}));
