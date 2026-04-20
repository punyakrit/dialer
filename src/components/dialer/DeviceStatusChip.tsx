"use client";

import { motion } from "framer-motion";
import { useDeviceStore } from "@/stores/device.store";
import { cn } from "@/lib/utils";

const COLORS: Record<
  string,
  { dot: string; label: string; bg: string; ring: string }
> = {
  idle: {
    dot: "bg-zinc-400",
    label: "Idle",
    bg: "bg-zinc-500/10 text-zinc-400",
    ring: "ring-zinc-400/30",
  },
  registering: {
    dot: "bg-amber-400",
    label: "Connecting…",
    bg: "bg-amber-500/10 text-amber-400",
    ring: "ring-amber-400/30",
  },
  ready: {
    dot: "bg-emerald-500",
    label: "Ready",
    bg: "bg-emerald-500/10 text-emerald-400",
    ring: "ring-emerald-500/30",
  },
  busy: {
    dot: "bg-sky-500",
    label: "On a call",
    bg: "bg-sky-500/10 text-sky-400",
    ring: "ring-sky-500/30",
  },
  offline: {
    dot: "bg-zinc-500",
    label: "Offline",
    bg: "bg-zinc-500/10 text-zinc-400",
    ring: "ring-zinc-500/30",
  },
  error: {
    dot: "bg-rose-500",
    label: "Error",
    bg: "bg-rose-500/10 text-rose-400",
    ring: "ring-rose-500/30",
  },
};

export function DeviceStatusChip() {
  const state = useDeviceStore((s) => s.state);
  const c = COLORS[state] ?? COLORS.idle;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
        c.bg,
      )}
    >
      <motion.span
        className={cn("h-2 w-2 rounded-full", c.dot, c.ring, "ring-4")}
        animate={{ scale: state === "busy" ? [1, 1.15, 1] : 1 }}
        transition={{
          duration: 1.1,
          repeat: state === "busy" ? Infinity : 0,
        }}
      />
      {c.label}
    </div>
  );
}
