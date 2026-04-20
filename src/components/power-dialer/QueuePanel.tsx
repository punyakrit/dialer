"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, Pause, Play, Plus, Square, SkipForward, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLeads } from "@/hooks/useLeads";
import { usePowerDialerStore } from "@/stores/power-dialer.store";
import { useCallStore } from "@/stores/call.store";
import { useDeviceStore } from "@/stores/device.store";
import { useDialerStore } from "@/stores/dialer.store";

export function QueuePanel() {
  const router = useRouter();
  const { data } = useLeads({ status: "NEW", limit: 100 });
  const queue = usePowerDialerStore((s) => s.queue);
  const cursor = usePowerDialerStore((s) => s.cursor);
  const status = usePowerDialerStore((s) => s.status);
  const setQueue = usePowerDialerStore((s) => s.setQueue);
  const start = usePowerDialerStore((s) => s.start);
  const pause = usePowerDialerStore((s) => s.pause);
  const resume = usePowerDialerStore((s) => s.resume);
  const skip = usePowerDialerStore((s) => s.skip);
  const stop = usePowerDialerStore((s) => s.stop);
  const complete = usePowerDialerStore((s) => s.complete);

  const manager = useDeviceStore((s) => s.manager);
  const active = useCallStore((s) => s.active);
  const selectLead = useDialerStore((s) => s.selectLead);
  const startActive = useCallStore((s) => s.startActive);

  const leads = data?.rows ?? [];
  const byId = useMemo(
    () => new Map(leads.map((l) => [l.id, l])),
    [leads],
  );

  function buildQueue() {
    setQueue(leads.map((l) => l.id));
  }

  // When we transition into "running" and no active call, dispatch the next one.
  useEffect(() => {
    if (status !== "running") return;
    if (active) return;
    const leadId = queue[cursor];
    if (!leadId) return;
    const lead = byId.get(leadId);
    if (!lead) return;
    if (!manager) return;

    selectLead(lead.id);
    startActive({ to: lead.phone, leadId: lead.id });
    void manager.dial({ To: lead.phone, LeadId: lead.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, cursor, active, manager, queue, byId]);

  // When a call ends and we're running or between-calls, advance.
  useEffect(() => {
    if (active) return;
    if (status === "running") {
      // Call ended — advance.
      complete();
    }
    if (status === "between-calls") {
      const t = window.setTimeout(() => {
        usePowerDialerStore.setState({ status: "running" });
      }, 3000);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, status]);

  const currentLead = byId.get(queue[cursor] ?? "");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="rounded-xl border-border/60 bg-card/60">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Power dialer</CardTitle>
            <p className="text-xs text-muted-foreground">
              Auto-call through a queue of NEW leads. Pause any time.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={buildQueue}
            disabled={leads.length === 0}
          >
            <ListChecks className="mr-1.5 h-3.5 w-3.5" />
            Load {leads.length} NEW leads
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Current
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {currentLead
                    ? `${currentLead.first_name ?? ""} ${currentLead.last_name ?? ""}`.trim() ||
                      currentLead.company ||
                      currentLead.phone
                    : "—"}
                </div>
                {currentLead ? (
                  <div className="font-mono text-xs text-muted-foreground">
                    {currentLead.phone}
                  </div>
                ) : null}
              </div>
              <Badge variant="secondary" className="capitalize">
                {status.replace("-", " ")}
              </Badge>
            </div>

            <div className="mt-4 flex items-center gap-2">
              {status === "running" ? (
                <Button variant="outline" size="sm" onClick={pause}>
                  <Pause className="mr-1.5 h-3.5 w-3.5" /> Pause
                </Button>
              ) : status === "paused" ? (
                <Button size="sm" onClick={resume}>
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Resume
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    start();
                    router.push("/dialer");
                  }}
                  disabled={queue.length === 0}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Start
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={skip}>
                <SkipForward className="mr-1.5 h-3.5 w-3.5" /> Skip
              </Button>
              <Button variant="ghost" size="sm" onClick={stop}>
                <Square className="mr-1.5 h-3.5 w-3.5" /> Stop
              </Button>
              <div className="ml-auto text-xs tabular-nums text-muted-foreground">
                {queue.length === 0
                  ? "No queue"
                  : `${Math.min(cursor + 1, queue.length)} of ${queue.length}`}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60">
            <ul className="max-h-[380px] divide-y divide-border/60 overflow-y-auto">
              {queue.length === 0 ? (
                <li className="p-6 text-center text-sm text-muted-foreground">
                  Load a queue to begin.
                </li>
              ) : (
                queue.map((id, i) => {
                  const lead = byId.get(id);
                  if (!lead) return null;
                  const isCurrent = i === cursor;
                  return (
                    <li
                      key={id}
                      className={`flex items-center gap-3 px-4 py-2 text-sm ${
                        isCurrent ? "bg-primary/5" : ""
                      }`}
                    >
                      <span className="w-8 text-xs tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {lead.first_name} {lead.last_name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {lead.company ?? "—"} · {lead.phone}
                        </div>
                      </div>
                      {isCurrent && status === "running" ? (
                        <Phone className="h-4 w-4 animate-pulse text-emerald-400" />
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>1. Load a queue — by default, leads in the NEW status.</p>
          <p>
            2. Start dialing. When one call ends, the next one fires
            automatically after a short gap so you have time to disposition.
          </p>
          <p>3. Skip the current lead, pause, or stop at any time.</p>
          <p className="flex items-center gap-1.5">
            <Plus className="h-3 w-3" />
            Fine-grained retry &amp; auto-disposition rules land in v1.1.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
