"use client";

import { motion } from "framer-motion";
import { useDialerStore } from "@/stores/dialer.store";

const KEYS = [
  { d: "1", l: "" },
  { d: "2", l: "ABC" },
  { d: "3", l: "DEF" },
  { d: "4", l: "GHI" },
  { d: "5", l: "JKL" },
  { d: "6", l: "MNO" },
  { d: "7", l: "PQRS" },
  { d: "8", l: "TUV" },
  { d: "9", l: "WXYZ" },
  { d: "*", l: "" },
  { d: "0", l: "+" },
  { d: "#", l: "" },
] as const;

export function Keypad({
  onDigit,
}: {
  /** Optional: fires alongside buffer.push for DTMF-during-call */
  onDigit?: (d: string) => void;
}) {
  const push = useDialerStore((s) => s.push);

  function handle(d: string) {
    push(d);
    onDigit?.(d);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((k) => (
        <motion.button
          key={k.d}
          type="button"
          onClick={() => handle(k.d === "0" ? "0" : k.d)}
          onPointerDown={(e) => {
            if (k.d === "0") {
              // Long-press 0 inserts a "+".
              const timer = window.setTimeout(() => {
                useDialerStore.getState().set(
                  useDialerStore.getState().buffer.replace(/0$/, "") + "+",
                );
              }, 500);
              const clear = () => {
                window.clearTimeout(timer);
                e.currentTarget.removeEventListener("pointerup", clear);
                e.currentTarget.removeEventListener("pointerleave", clear);
              };
              e.currentTarget.addEventListener("pointerup", clear);
              e.currentTarget.addEventListener("pointerleave", clear);
            }
          }}
          whileTap={{ scale: 0.94 }}
          className="aspect-square rounded-2xl border border-border/60 bg-card/60 text-center transition-colors hover:bg-card"
        >
          <div className="flex h-full flex-col items-center justify-center">
            <span className="text-2xl font-medium tracking-tight">{k.d}</span>
            {k.l ? (
              <span className="mt-0.5 text-[10px] font-medium tracking-widest text-muted-foreground">
                {k.l}
              </span>
            ) : null}
          </div>
        </motion.button>
      ))}
    </div>
  );
}
