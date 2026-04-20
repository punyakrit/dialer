"use client";

import { create } from "zustand";
import type { DeviceManager, DeviceState } from "@/lib/twilio/client";

type DeviceStore = {
  manager: DeviceManager | null;
  state: DeviceState;
  edge: string;
  error: { code?: number | string; message: string } | null;
  setManager: (m: DeviceManager | null) => void;
  setState: (s: DeviceState) => void;
  setEdge: (e: string) => void;
  setError: (e: { code?: number | string; message: string } | null) => void;
};

export const useDeviceStore = create<DeviceStore>((set) => ({
  manager: null,
  state: "idle",
  edge: "singapore",
  error: null,
  setManager: (m) => set({ manager: m }),
  setState: (state) => set({ state }),
  setEdge: (edge) => set({ edge }),
  setError: (error) => set({ error }),
}));
