"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

type Body =
  | { configured: false; balance: null; currency: null }
  | {
      configured: true;
      balance: string;
      currency: string;
      fetchedAt: number;
    };

export function BalancePill() {
  const { data } = useQuery<Body>({
    queryKey: ["twilio-balance"],
    queryFn: async () => {
      const res = await authFetch("/api/twilio/balance");
      if (!res.ok) throw new Error("balance_failed");
      return (await res.json()) as Body;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  if (!data?.configured) {
    return (
      <div className="hidden rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground sm:block">
        Twilio: <span className="font-medium text-foreground">not connected</span>
      </div>
    );
  }

  const amount = Number.parseFloat(data.balance);
  const low = Number.isFinite(amount) && amount < 5;

  return (
    <div
      className={cn(
        "hidden items-center gap-1.5 rounded-full border px-3 py-1 text-xs sm:flex",
        low
          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
          : "border-border/60 text-muted-foreground",
      )}
    >
      {low ? <AlertTriangle className="h-3 w-3" /> : null}
      <span>
        {low ? "Low balance: " : "Balance: "}
        <span className="font-medium text-foreground">
          {data.currency} {amount.toFixed(2)}
        </span>
      </span>
    </div>
  );
}
