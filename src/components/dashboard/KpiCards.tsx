"use client";

import { useState } from "react";
import {
  PhoneCall,
  PhoneIncoming,
  Percent,
  Clock,
  CalendarCheck2,
  Users,
} from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useKpis, type KpiRange } from "@/hooks/useKpis";

function formatHMS(seconds: number): string {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function KpiCards() {
  const [range, setRange] = useState<KpiRange>("today");
  const { data, isLoading } = useKpis(range);

  const cards = [
    {
      label: "Calls",
      icon: PhoneCall,
      value: data?.totals.calls ?? 0,
    },
    {
      label: "Connected",
      icon: PhoneIncoming,
      value: data?.totals.connected ?? 0,
    },
    {
      label: "Answer rate",
      icon: Percent,
      value:
        data == null
          ? "—"
          : `${Math.round((data.totals.answerRate ?? 0) * 100)}%`,
    },
    {
      label: "Talk time",
      icon: Clock,
      value: data == null ? "—" : formatHMS(data.totals.talkTimeSec),
    },
    {
      label: "Meetings booked",
      icon: CalendarCheck2,
      value: data?.totals.meetingsBooked ?? 0,
    },
    {
      label: "Leads contacted",
      icon: Users,
      value: data?.totals.leadsContacted ?? 0,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Overview</h2>
        <Tabs value={range} onValueChange={(v) => setRange(v as KpiRange)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">7 days</TabsTrigger>
            <TabsTrigger value="month">30 days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} className="rounded-xl border-border/60 bg-card/60">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-semibold tabular-nums tracking-tight">
                  {c.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
