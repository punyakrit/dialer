"use client";

import { useEffect, useState } from "react";
import { CalendarCheck2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth/client";

type Meeting = {
  id: string;
  lead_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  email: string | null;
  notes: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELED" | "NO_SHOW";
};

const STATUS_STYLES: Record<Meeting["status"], string> = {
  SCHEDULED: "bg-sky-500/15 text-sky-300",
  COMPLETED: "bg-emerald-500/15 text-emerald-300",
  CANCELED: "bg-rose-500/15 text-rose-300",
  NO_SHOW: "bg-amber-500/15 text-amber-300",
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await authFetch("/api/meetings");
      if (res.ok) {
        const body = (await res.json()) as { rows: Meeting[] };
        setMeetings(body.rows);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
        <p className="text-sm text-muted-foreground">
          A quick log of calls that turned into a meeting. Book new ones from
          the lead drawer.
        </p>
      </div>

      <Card className="rounded-xl border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle>Upcoming & past</CardTitle>
        </CardHeader>
        <CardContent>
          {meetings === null ? (
            <Skeleton className="h-20 w-full" />
          ) : meetings.length === 0 ? (
            <div className="grid place-items-center rounded-lg border border-dashed border-border/60 py-10 text-sm text-muted-foreground">
              No meetings logged yet.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {meetings.map((m) => (
                <div key={m.id} className="flex items-center gap-4 py-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <CalendarCheck2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{m.title}</span>
                      <Badge
                        variant="secondary"
                        className={`${STATUS_STYLES[m.status]} border-0 text-[11px]`}
                      >
                        {m.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(m.starts_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {m.email ? ` · ${m.email}` : ""}
                    </div>
                    {m.notes ? (
                      <div className="mt-1 text-sm text-muted-foreground">
                        {m.notes}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
