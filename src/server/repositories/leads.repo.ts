import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { LeadRow, LeadStatus } from "@/types/db";

export type LeadFilters = {
  status?: LeadStatus | null;
  assignedToId?: string | null;
  search?: string | null;
  limit: number;
  offset: number;
};

export type LeadUpsertInput = {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  title?: string | null;
  website?: string | null;
  niche?: string | null;
  email?: string | null;
  phone: string;                // E.164
  phoneNormalized: string;
  source?: string | null;
  status?: LeadStatus;
  notes?: string | null;
  assignedToId?: string | null;
};

export async function listLeads(
  workspaceId: string,
  filters: LeadFilters,
): Promise<{ rows: LeadRow[]; total: number }> {
  let q = supabaseAdmin()
    .from("leads")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId);

  if (filters.status) q = q.eq("status", filters.status);
  if (filters.assignedToId) q = q.eq("assigned_to_id", filters.assignedToId);
  if (filters.search) {
    const s = filters.search.trim();
    // Match against name/email/phone/company with a single OR.
    q = q.or(
      [
        `first_name.ilike.%${s}%`,
        `last_name.ilike.%${s}%`,
        `company.ilike.%${s}%`,
        `email.ilike.%${s}%`,
        `phone.ilike.%${s}%`,
      ].join(","),
    );
  }

  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range(filters.offset, filters.offset + filters.limit - 1);

  if (error) throw error;
  return { rows: (data ?? []) as LeadRow[], total: count ?? 0 };
}

export async function getLead(
  workspaceId: string,
  leadId: string,
): Promise<LeadRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw error;
  return data as LeadRow | null;
}

export async function createLead(
  workspaceId: string,
  input: LeadUpsertInput,
): Promise<LeadRow> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      first_name: input.firstName ?? null,
      last_name: input.lastName ?? null,
      company: input.company ?? null,
      title: input.title ?? null,
      website: input.website ?? null,
      niche: input.niche ?? null,
      email: input.email ?? null,
      phone: input.phone,
      phone_normalized: input.phoneNormalized,
      source: input.source ?? null,
      status: input.status ?? "NEW",
      notes: input.notes ?? null,
      assigned_to_id: input.assignedToId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as LeadRow;
}

export async function upsertLead(
  workspaceId: string,
  input: LeadUpsertInput,
): Promise<LeadRow> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .upsert(
      {
        workspace_id: workspaceId,
        first_name: input.firstName ?? null,
        last_name: input.lastName ?? null,
        company: input.company ?? null,
        title: input.title ?? null,
        website: input.website ?? null,
        niche: input.niche ?? null,
        email: input.email ?? null,
        phone: input.phone,
        phone_normalized: input.phoneNormalized,
        source: input.source ?? null,
        status: input.status ?? "NEW",
        notes: input.notes ?? null,
        assigned_to_id: input.assignedToId ?? null,
      },
      { onConflict: "workspace_id,phone_normalized", ignoreDuplicates: false },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as LeadRow;
}

export async function updateLead(
  workspaceId: string,
  leadId: string,
  patch: Partial<
    Pick<
      LeadRow,
      | "first_name"
      | "last_name"
      | "company"
      | "title"
      | "website"
      | "niche"
      | "email"
      | "phone"
      | "phone_normalized"
      | "status"
      | "score"
      | "assigned_to_id"
      | "last_contacted_at"
      | "notes"
    >
  >,
): Promise<LeadRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", leadId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as LeadRow | null;
}

export async function deleteLead(
  workspaceId: string,
  leadId: string,
): Promise<boolean> {
  const { error, count } = await supabaseAdmin()
    .from("leads")
    .delete({ count: "exact" })
    .eq("workspace_id", workspaceId)
    .eq("id", leadId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function touchLastContacted(
  workspaceId: string,
  leadId: string,
): Promise<void> {
  await supabaseAdmin()
    .from("leads")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("id", leadId);
}
