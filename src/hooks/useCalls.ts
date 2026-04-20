"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { authFetch } from "@/lib/auth/client";
import type { CallRow, Disposition } from "@/types/db";

export type CallsQuery = {
  limit?: number;
  offset?: number;
  leadId?: string | null;
};

export function useCalls(q: CallsQuery = {}) {
  return useQuery<{ rows: CallRow[]; total: number }>({
    queryKey: ["calls", q.leadId ?? null, q.limit ?? 50, q.offset ?? 0],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(q.limit ?? 50));
      params.set("offset", String(q.offset ?? 0));
      if (q.leadId) params.set("leadId", q.leadId);
      const res = await authFetch(`/api/calls?${params.toString()}`);
      if (!res.ok) throw new Error("failed_to_list_calls");
      return (await res.json()) as { rows: CallRow[]; total: number };
    },
  });
}

export function useSetDisposition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { callId: string; disposition: Disposition }) => {
      const res = await authFetch(
        `/api/calls/${args.callId}/disposition`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ disposition: args.disposition }),
        },
      );
      if (!res.ok) throw new Error("failed_disposition");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["kpis"] });
    },
  });
}

export function useSaveCallNotes() {
  return useMutation({
    mutationFn: async (args: { callId: string; notes: string }) => {
      const res = await authFetch(`/api/calls/${args.callId}/notes`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes: args.notes }),
      });
      if (!res.ok) throw new Error("failed_notes");
    },
  });
}
