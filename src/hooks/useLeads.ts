"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { authFetch } from "@/lib/auth/client";
import type { LeadRow, LeadStatus } from "@/types/db";

export type LeadsQuery = {
  status?: LeadStatus | null;
  assignedTo?: string | null;
  q?: string | null;
  limit?: number;
  offset?: number;
};

export type LeadsResponse = {
  rows: LeadRow[];
  total: number;
  limit: number;
  offset: number;
};

function leadsKey(q: LeadsQuery) {
  return [
    "leads",
    q.status ?? null,
    q.assignedTo ?? null,
    q.q ?? null,
    q.limit ?? 50,
    q.offset ?? 0,
  ] as const;
}

export function useLeads(q: LeadsQuery = {}) {
  return useQuery<LeadsResponse>({
    queryKey: leadsKey(q),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q.status) params.set("status", q.status);
      if (q.assignedTo) params.set("assignedTo", q.assignedTo);
      if (q.q) params.set("q", q.q);
      params.set("limit", String(q.limit ?? 50));
      params.set("offset", String(q.offset ?? 0));
      const res = await authFetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error("failed_to_list_leads");
      return (await res.json()) as LeadsResponse;
    },
  });
}

export function useLead(leadId: string | null) {
  return useQuery<{ lead: LeadRow }>({
    queryKey: ["lead", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const res = await authFetch(`/api/leads/${leadId}`);
      if (!res.ok) throw new Error("failed_to_fetch_lead");
      return (await res.json()) as { lead: LeadRow };
    },
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      firstName?: string;
      lastName?: string;
      company?: string;
      email?: string;
      phone: string;
      niche?: string;
      website?: string;
      notes?: string;
      status?: LeadStatus;
    }) => {
      const res = await authFetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "failed_to_create_lead");
      }
      return (await res.json()) as { lead: LeadRow };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useUpdateLead(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<LeadRow>) => {
      const res = await authFetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("failed_to_update_lead");
      return (await res.json()) as { lead: LeadRow };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const res = await authFetch(`/api/leads/${leadId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed_to_delete_lead");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useBulkImportLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await authFetch("/api/leads/bulk-import", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(err.message ?? err.error ?? "import_failed");
      }
      return (await res.json()) as {
        inserted: number;
        updated: number;
        skipped: number;
        errors: Array<{ row: number; reason: string }>;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
