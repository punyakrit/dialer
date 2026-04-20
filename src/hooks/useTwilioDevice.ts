"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { DeviceManager } from "@/lib/twilio/client";
import { authFetch } from "@/lib/auth/client";
import { useDeviceStore } from "@/stores/device.store";
import { useCallStore } from "@/stores/call.store";

export function useTwilioDevice() {
  const managerRef = useRef<DeviceManager | null>(null);
  const setManager = useDeviceStore((s) => s.setManager);
  const setState = useDeviceStore((s) => s.setState);
  const setEdge = useDeviceStore((s) => s.setEdge);
  const setError = useDeviceStore((s) => s.setError);
  const setMuted = useCallStore((s) => s.setMuted);
  const setSid = useCallStore((s) => s.setSid);
  const markAnswered = useCallStore((s) => s.markAnswered);
  const endActive = useCallStore((s) => s.endActive);
  const appendWarning = useCallStore((s) => s.appendWarning);

  useEffect(() => {
    if (managerRef.current) return;

    const manager = new DeviceManager({
      fetchToken: async () => {
        const res = await authFetch("/api/twilio/token");
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(err.error ?? "token_fetch_failed");
        }
        const body = (await res.json()) as {
          token: string;
          ttlSec: number;
          edge?: string;
        };
        if (body.edge) setEdge(body.edge);
        return body;
      },
      listeners: {
        onState: (state) => setState(state),
        onError: (err) => {
          setError(err);
          if (err.message && err.message !== "twilio_not_configured") {
            toast.error(err.message);
          }
        },
        onActiveCallChanged: (call) => {
          if (!call) {
            endActive();
            return;
          }
          const sid = (call as { parameters?: { CallSid?: string } }).parameters
            ?.CallSid;
          if (sid) setSid(sid);

          // Populate SID when Twilio emits `accept` (it arrives later).
          call.on("accept", () => {
            const laterSid = (call as { parameters?: { CallSid?: string } })
              .parameters?.CallSid;
            if (laterSid) setSid(laterSid);
            markAnswered();
          });
        },
        onMute: (muted) => setMuted(muted),
        onWarning: (name) => {
          appendWarning(name);
        },
      },
    });
    managerRef.current = manager;
    setManager(manager);

    return () => {
      manager.destroy();
      setManager(null);
    };
    // Intentional one-time setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return managerRef;
}
