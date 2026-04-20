import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/types/db";

const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "New",
  ATTEMPTED: "Attempted",
  CONNECTED: "Connected",
  INTERESTED: "Interested",
  MEETING_BOOKED: "Meeting booked",
  CLOSED_WON: "Won",
  CLOSED_LOST: "Lost",
};

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-zinc-500/15 text-zinc-300",
  ATTEMPTED: "bg-amber-500/15 text-amber-300",
  CONNECTED: "bg-sky-500/15 text-sky-300",
  INTERESTED: "bg-violet-500/15 text-violet-300",
  MEETING_BOOKED: "bg-fuchsia-500/15 text-fuchsia-300",
  CLOSED_WON: "bg-emerald-500/15 text-emerald-300",
  CLOSED_LOST: "bg-rose-500/15 text-rose-300",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full border-0 px-2 py-0.5 text-[11px] font-medium",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export const LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "ATTEMPTED",
  "CONNECTED",
  "INTERESTED",
  "MEETING_BOOKED",
  "CLOSED_WON",
  "CLOSED_LOST",
];
export const LEAD_STATUS_LABEL = STATUS_LABEL;
