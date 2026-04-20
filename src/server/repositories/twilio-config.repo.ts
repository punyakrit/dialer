import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TwilioConfigRow } from "@/types/db";

export async function getTwilioConfig(
  workspaceId: string,
): Promise<TwilioConfigRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("twilio_configs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data as TwilioConfigRow | null;
}

export type TwilioConfigInput = {
  accountSidCipher: string;
  apiKeySidCipher: string;
  apiKeySecretCipher: string;
  twimlAppSidCipher: string;
  authTokenCipher: string | null;
  fromNumber: string;
  edge?: string;
  recordCalls?: boolean;
  amdEnabled?: boolean;
};

export async function upsertTwilioConfig(
  workspaceId: string,
  input: TwilioConfigInput,
): Promise<TwilioConfigRow> {
  const { data, error } = await supabaseAdmin()
    .from("twilio_configs")
    .upsert(
      {
        workspace_id: workspaceId,
        account_sid_cipher: input.accountSidCipher,
        api_key_sid_cipher: input.apiKeySidCipher,
        api_key_secret_cipher: input.apiKeySecretCipher,
        twiml_app_sid_cipher: input.twimlAppSidCipher,
        auth_token_cipher: input.authTokenCipher,
        from_number: input.fromNumber,
        edge: input.edge ?? "singapore",
        record_calls: input.recordCalls ?? true,
        amd_enabled: input.amdEnabled ?? true,
      },
      { onConflict: "workspace_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as TwilioConfigRow;
}

export async function setTestResult(
  workspaceId: string,
  status: "ok" | string,
): Promise<void> {
  await supabaseAdmin()
    .from("twilio_configs")
    .update({
      last_tested_at: new Date().toISOString(),
      last_test_status: status,
    })
    .eq("workspace_id", workspaceId);
}

export async function deleteTwilioConfig(workspaceId: string): Promise<void> {
  await supabaseAdmin()
    .from("twilio_configs")
    .delete()
    .eq("workspace_id", workspaceId);
}
