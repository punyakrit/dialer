"use client";

import { useState } from "react";
import { PhoneCall, PhoneIncoming, PhoneMissed, PhoneOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalls } from "@/hooks/useCalls";
import { cn } from "@/lib/utils";
import type { CallStatus } from "@/types/db";

const PAGE = 25;

const STATUS_META: Record<
  CallStatus,
  { label: string; icon: typeof PhoneCall; className: string }
> = {
  QUEUED: { label: "Queued", icon: PhoneCall, className: "text-muted-foreground" },
  INITIATED: { label: "Initiated", icon: PhoneCall, className: "text-amber-400" },
  RINGING: { label: "Ringing", icon: PhoneCall, className: "text-amber-400" },
  IN_PROGRESS: { label: "Live", icon: PhoneIncoming, className: "text-sky-400" },
  COMPLETED: { label: "Completed", icon: PhoneIncoming, className: "text-emerald-400" },
  BUSY: { label: "Busy", icon: PhoneOff, className: "text-rose-400" },
  FAILED: { label: "Failed", icon: PhoneOff, className: "text-rose-400" },
  NO_ANSWER: { label: "No answer", icon: PhoneMissed, className: "text-zinc-400" },
  CANCELED: { label: "Canceled", icon: PhoneOff, className: "text-zinc-400" },
};

function formatDuration(secs: number | null | undefined): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CallLogTable() {
  const [page, setPage] = useState(0);
  const { data, isLoading, isFetching } = useCalls({
    limit: PAGE,
    offset: page * PAGE,
  });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/60 p-4">
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border/60 bg-card/30 py-16 text-sm text-muted-foreground">
        No calls yet. Start dialing to see your log here.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/40">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>When</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Disposition</TableHead>
            <TableHead>Recording</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => {
            const meta = STATUS_META[c.status];
            const Icon = meta.icon;
            return (
              <TableRow key={c.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(c.created_at)}
                </TableCell>
                <TableCell className="font-mono text-xs">{c.to}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs",
                      meta.className,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {meta.label}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {formatDuration(c.duration_sec)}
                </TableCell>
                <TableCell>
                  {c.disposition ? (
                    <Badge variant="secondary" className="text-[11px]">
                      {c.disposition.replace(/_/g, " ")}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {c.recording_url ? (
                    <Badge variant="outline" className="text-[11px]">
                      Saved
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
        <span>
          {total === 0 ? 0 : page * PAGE + 1}–{Math.min(total, (page + 1) * PAGE)}{" "}
          of {total}
          {isFetching ? " · updating" : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={rows.length < PAGE}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
