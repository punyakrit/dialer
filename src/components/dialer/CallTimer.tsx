"use client";

import { useEffect } from "react";
import { useCallStore } from "@/stores/call.store";

function format(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function CallTimer() {
  const duration = useCallStore((s) => s.active?.durationSec ?? 0);
  const hasActive = useCallStore((s) => !!s.active);
  const tick = useCallStore((s) => s.tick);

  useEffect(() => {
    if (!hasActive) return;
    const id = window.setInterval(() => tick(), 1000);
    return () => window.clearInterval(id);
  }, [hasActive, tick]);

  return (
    <span className="font-mono text-sm tabular-nums text-muted-foreground">
      {format(duration)}
    </span>
  );
}
