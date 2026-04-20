import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SmsTemplateRow } from "@/types/db";

export async function listTemplates(
  workspaceId: string,
): Promise<SmsTemplateRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("sms_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SmsTemplateRow[];
}

export async function createTemplate(
  workspaceId: string,
  input: { name: string; body: string; variables: string[] },
): Promise<SmsTemplateRow> {
  const { data, error } = await supabaseAdmin()
    .from("sms_templates")
    .insert({
      workspace_id: workspaceId,
      name: input.name,
      body: input.body,
      variables: input.variables,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as SmsTemplateRow;
}

export async function updateTemplate(
  workspaceId: string,
  templateId: string,
  patch: Partial<Pick<SmsTemplateRow, "name" | "body" | "variables">>,
): Promise<SmsTemplateRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("sms_templates")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", templateId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as SmsTemplateRow | null;
}

export async function deleteTemplate(
  workspaceId: string,
  templateId: string,
): Promise<boolean> {
  const { error, count } = await supabaseAdmin()
    .from("sms_templates")
    .delete({ count: "exact" })
    .eq("workspace_id", workspaceId)
    .eq("id", templateId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Very small {{var}} template renderer. Unknown variables resolve to "". */
export function renderTemplate(
  body: string,
  vars: Record<string, string | null | undefined>,
): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}
