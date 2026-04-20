"use client";

import { create } from "zustand";

type DialerStore = {
  buffer: string;
  selectedLeadId: string | null;
  push: (c: string) => void;
  backspace: () => void;
  clear: () => void;
  set: (v: string) => void;
  selectLead: (id: string | null) => void;
};

const ALLOWED = /^[0-9*#+]$/;

export const useDialerStore = create<DialerStore>((set) => ({
  buffer: "",
  selectedLeadId: null,
  push: (c) =>
    set((s) => {
      if (!ALLOWED.test(c)) return s;
      // Only allow a leading "+"
      if (c === "+") {
        return { ...s, buffer: s.buffer.length === 0 ? "+" : s.buffer };
      }
      return { ...s, buffer: s.buffer + c };
    }),
  backspace: () =>
    set((s) => ({ ...s, buffer: s.buffer.slice(0, -1) })),
  clear: () => set((s) => ({ ...s, buffer: "" })),
  set: (v) => set((s) => ({ ...s, buffer: v })),
  selectLead: (id) => set((s) => ({ ...s, selectedLeadId: id })),
}));
