"use client";

import { create } from "zustand";

export type PowerDialerStatus =
  | "idle"
  | "running"
  | "between-calls"
  | "paused";

type PowerStore = {
  queue: string[];                 // lead IDs
  cursor: number;
  status: PowerDialerStatus;
  retryDelaySec: number;
  setQueue: (ids: string[]) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skip: () => void;
  complete: () => void;            // advance cursor after a call ends
};

export const usePowerDialerStore = create<PowerStore>((set, get) => ({
  queue: [],
  cursor: 0,
  status: "idle",
  retryDelaySec: 5,
  setQueue: (queue) => set({ queue, cursor: 0, status: "idle" }),
  start: () => {
    if (get().queue.length === 0) return;
    set({ status: "running" });
  },
  pause: () => set({ status: "paused" }),
  resume: () => set({ status: "running" }),
  stop: () => set({ status: "idle", cursor: 0 }),
  skip: () => {
    const { cursor, queue } = get();
    const next = cursor + 1;
    if (next >= queue.length) {
      set({ status: "idle", cursor: next });
    } else {
      set({ cursor: next, status: "running" });
    }
  },
  complete: () => {
    const { cursor, queue } = get();
    const next = cursor + 1;
    if (next >= queue.length) {
      set({ status: "idle", cursor: next });
    } else {
      set({ cursor: next, status: "between-calls" });
    }
  },
}));
