"use client";

import { Mic, MicOff, PhoneOff, Pause, Play, PhoneForwarded } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeviceStore } from "@/stores/device.store";
import { useCallStore } from "@/stores/call.store";
import { cn } from "@/lib/utils";

export function CallControls({ className }: { className?: string }) {
  const manager = useDeviceStore((s) => s.manager);
  const active = useCallStore((s) => s.active);

  if (!active) return null;

  function toggleMute() {
    if (!manager) return;
    manager.setMute(!active!.muted);
  }

  function toggleHold() {
    // Device hold requires a separate TwiML `<Pause>` flow or conference
    // transfer; we flip the UI flag and keep mute-as-hold as a safe MVP.
    useCallStore.getState().setOnHold(!active!.onHold);
    if (manager) manager.setMute(!active!.onHold ? true : active!.muted);
  }

  function hangup() {
    manager?.hangup();
  }

  return (
    <div className={cn("grid grid-cols-4 gap-2", className)}>
      <Button
        type="button"
        variant={active.muted ? "default" : "outline"}
        className="h-14 flex-col rounded-xl"
        onClick={toggleMute}
      >
        {active.muted ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
        <span className="mt-1 text-[10px] font-medium uppercase tracking-wider">
          {active.muted ? "Muted" : "Mute"}
        </span>
      </Button>

      <Button
        type="button"
        variant={active.onHold ? "default" : "outline"}
        className="h-14 flex-col rounded-xl"
        onClick={toggleHold}
      >
        {active.onHold ? (
          <Play className="h-5 w-5" />
        ) : (
          <Pause className="h-5 w-5" />
        )}
        <span className="mt-1 text-[10px] font-medium uppercase tracking-wider">
          {active.onHold ? "Resume" : "Hold"}
        </span>
      </Button>

      <Button
        type="button"
        variant="outline"
        className="h-14 flex-col rounded-xl"
        disabled
        title="Transfer coming soon"
      >
        <PhoneForwarded className="h-5 w-5" />
        <span className="mt-1 text-[10px] font-medium uppercase tracking-wider">
          Transfer
        </span>
      </Button>

      <Button
        type="button"
        variant="destructive"
        className="h-14 flex-col rounded-xl"
        onClick={hangup}
      >
        <PhoneOff className="h-5 w-5" />
        <span className="mt-1 text-[10px] font-medium uppercase tracking-wider">
          End
        </span>
      </Button>
    </div>
  );
}
