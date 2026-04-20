"use client";

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, Phone, AlertTriangle, Info, MicOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { useBroadcastLock } from "@/hooks/useBroadcastLock";
import { useBeforeUnloadGuard } from "@/hooks/useBeforeUnloadGuard";
import { useDialerStore } from "@/stores/dialer.store";
import { useCallStore } from "@/stores/call.store";
import { useDeviceStore } from "@/stores/device.store";
import { isLikelyValidPhone, normalizePhone } from "@/lib/phone/normalize";
import { Keypad } from "./Keypad";
import { CallControls } from "./CallControls";
import { CallTimer } from "./CallTimer";
import { DeviceStatusChip } from "./DeviceStatusChip";

export function Softphone() {
  const { isLeader, hasOtherTab } = useBroadcastLock();
  useTwilioDevice();

  const buffer = useDialerStore((s) => s.buffer);
  const backspace = useDialerStore((s) => s.backspace);
  const clear = useDialerStore((s) => s.clear);
  const manager = useDeviceStore((s) => s.manager);
  const deviceState = useDeviceStore((s) => s.state);
  const active = useCallStore((s) => s.active);
  const startActive = useCallStore((s) => s.startActive);

  useBeforeUnloadGuard(!!active);

  const normalized = useMemo(() => normalizePhone(buffer, "US"), [buffer]);
  const canCall =
    !!manager &&
    isLeader &&
    isLikelyValidPhone(buffer, "US") &&
    deviceState !== "busy" &&
    deviceState !== "error" &&
    deviceState !== "registering";

  // Keyboard input — numeric keys type into buffer; Enter dials.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (active) {
        if (/^[0-9*#]$/.test(e.key)) {
          manager?.sendDigits(e.key);
        }
        return;
      }
      if (/^[0-9+*#]$/.test(e.key)) {
        useDialerStore.getState().push(e.key);
      } else if (e.key === "Backspace") {
        backspace();
      } else if (e.key === "Enter") {
        if (normalized && canCall) {
          void handleDial();
        }
      } else if (e.key === "Escape") {
        clear();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager, active, normalized, canCall]);

  async function handleDial() {
    if (!manager || !normalized) return;
    startActive({ to: normalized.e164 });
    const call = await manager.dial({ To: normalized.e164 });
    if (!call) {
      toast.error("Couldn't start the call");
      useCallStore.getState().endActive();
    }
  }

  if (hasOtherTab && !isLeader) {
    return (
      <Card className="rounded-xl border-border/60 bg-card/60">
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <Info className="h-6 w-6 text-muted-foreground" />
          <div className="text-sm font-medium">Active in another tab</div>
          <div className="text-xs text-muted-foreground">
            Calls run in a single tab to avoid losing them to a duplicate
            device registration.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card className="rounded-2xl border-border/60 bg-card/60">
        <CardContent className="space-y-5 p-5">
          <div className="flex items-center justify-between">
            <DeviceStatusChip />
            <CallTimer />
          </div>

          <div className="flex min-h-[76px] flex-col justify-end rounded-xl border border-border/50 bg-background/50 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {active ? "Calling" : buffer ? "To" : "Enter a number"}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="truncate font-mono text-2xl tabular-nums">
                {active ? active.to : buffer || "—"}
              </div>
              {!active && buffer ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Backspace"
                  onClick={backspace}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Delete className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            {!active && normalized ? (
              <div className="text-xs text-muted-foreground">
                {normalized.national}
                {normalized.country ? ` · ${normalized.country}` : ""}
              </div>
            ) : null}
          </div>

          <Keypad
            onDigit={(d) => {
              if (active) manager?.sendDigits(d);
            }}
          />

          <AnimatePresence mode="wait">
            {active ? (
              <motion.div
                key="controls"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <CallControls />
                {active.muted ? (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MicOff className="h-3 w-3" /> Muted
                  </div>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="dial"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <Button
                  type="button"
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleDial}
                  disabled={!canCall}
                >
                  <Phone className="h-4 w-4" /> Call
                </Button>
                {deviceState === "error" ? (
                  <Alert variant="destructive" className="mt-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Device error</AlertTitle>
                    <AlertDescription>
                      Check your Twilio credentials in Settings → Twilio.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="rounded-2xl border-border/60 bg-card/60">
          <CardContent className="space-y-3 p-5">
            <div className="text-sm font-medium">How it works</div>
            <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
              <li>
                Grant microphone permission the first time you register — HTTPS
                only.
              </li>
              <li>
                We mint a scoped Twilio access token server-side using your API
                key, then register a single Device per tab.
              </li>
              <li>
                Dialing invokes <span className="font-mono">device.connect()</span>;
                the TwiML App webhook bridges to PSTN via{" "}
                <span className="font-mono">&lt;Dial&gt;&lt;Number&gt;</span>.
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
