"use client";

import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth/client";

export type KpiRange = "today" | "week" | "month";

export type KpiResponse = {
  range: KpiRange;
  totals: {
    calls: number;
    connected: number;
    answerRate: number;
    talkTimeSec: number;
    meetingsBooked: number;
    leadsContacted: number;
  };
};

export type SeriesPoint = {
  date: string;
  calls: number;
  connected: number;
  talkSec: number;
};

export function useKpis(range: KpiRange = "today") {
  return useQuery<KpiResponse>({
    queryKey: ["kpis", range],
    queryFn: async () => {
      const res = await authFetch(`/api/analytics/kpis?range=${range}`);
      if (!res.ok) throw new Error("failed_kpis");
      return (await res.json()) as KpiResponse;
    },
  });
}

export function useSeries(days = 14) {
  return useQuery<{ series: SeriesPoint[] }>({
    queryKey: ["series", days],
    queryFn: async () => {
      const res = await authFetch(`/api/analytics/series?days=${days}`);
      if (!res.ok) throw new Error("failed_series");
      return (await res.json()) as { series: SeriesPoint[] };
    },
  });
}
