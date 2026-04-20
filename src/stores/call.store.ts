"use client";

import { create } from "zustand";
import type { Disposition } from "@/types/db";

export type ActiveCall = {
  sid?: string;                        // populated once `parameters.CallSid` arrives
  leadId?: string | null;
  to: string;                          // E.164 dialed number
  displayName?: string | null;
  startedAt: number;                   // Date.now() when we fired device.connect()
  answeredAt: number | null;
  muted: boolean;
  onHold: boolean;
  durationSec: number;
  notesDraft: string;
  disposition: Disposition | null;
  warnings: Array<{ name: string; at: number }>;
  amdResult: string | null;
};

type CallStore = {
  active: ActiveCall | null;
  incoming: {
    from: string;
    accept: () => void;
    reject: () => void;
  } | null;
  startActive: (partial: Partial<ActiveCall> & Pick<ActiveCall, "to">) => void;
  setSid: (sid: string) => void;
  markAnswered: () => void;
  tick: () => void;
  setMuted: (muted: boolean) => void;
  setOnHold: (onHold: boolean) => void;
  setAmdResult: (result: string) => void;
  appendWarning: (name: string) => void;
  setNotes: (notes: string) => void;
  setDisposition: (d: Disposition | null) => void;
  endActive: () => void;
  setIncoming: (i: CallStore["incoming"]) => void;
};

export const useCallStore = create<CallStore>((set, get) => ({
  active: null,
  incoming: null,
  startActive: (partial) =>
    set({
      active: {
        sid: partial.sid,
        leadId: partial.leadId ?? null,
        to: partial.to,
        displayName: partial.displayName ?? null,
        startedAt: partial.startedAt ?? Date.now(),
        answeredAt: null,
        muted: false,
        onHold: false,
        durationSec: 0,
        notesDraft: "",
        disposition: null,
        warnings: [],
        amdResult: null,
      },
    }),
  setSid: (sid) => {
    const cur = get().active;
    if (cur) set({ active: { ...cur, sid } });
  },
  markAnswered: () => {
    const cur = get().active;
    if (!cur) return;
    set({ active: { ...cur, answeredAt: Date.now() } });
  },
  tick: () => {
    const cur = get().active;
    if (!cur) return;
    const base = cur.answeredAt ?? cur.startedAt;
    set({
      active: {
        ...cur,
        durationSec: Math.floor((Date.now() - base) / 1000),
      },
    });
  },
  setMuted: (muted) => {
    const cur = get().active;
    if (cur) set({ active: { ...cur, muted } });
  },
  setOnHold: (onHold) => {
    const cur = get().active;
    if (cur) set({ active: { ...cur, onHold } });
  },
  setAmdResult: (amdResult) => {
    const cur = get().active;
    if (cur) set({ active: { ...cur, amdResult } });
  },
  appendWarning: (name) => {
    const cur = get().active;
    if (!cur) return;
    set({
      active: {
        ...cur,
        warnings: [...cur.warnings, { name, at: Date.now() }],
      },
    });
  },
  setNotes: (notesDraft) => {
    const cur = get().active;
    if (cur) set({ active: { ...cur, notesDraft } });
  },
  setDisposition: (disposition) => {
    const cur = get().active;
    if (cur) set({ active: { ...cur, disposition } });
  },
  endActive: () => set({ active: null }),
  setIncoming: (incoming) => set({ incoming }),
}));
