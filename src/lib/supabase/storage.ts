import "server-only";
import { supabaseAdmin } from "./admin";
import { serverEnv } from "@/lib/env";

export type BucketName = "recordings" | "voicemail-drops";

function bucket(name: BucketName) {
  return supabaseAdmin().storage.from(name);
}

export async function uploadBuffer(
  name: BucketName,
  path: string,
  data: Buffer | ArrayBuffer | Blob,
  opts: { contentType?: string; upsert?: boolean } = {},
): Promise<void> {
  const { error } = await bucket(name).upload(path, data as Blob, {
    contentType: opts.contentType ?? "application/octet-stream",
    upsert: opts.upsert ?? true,
  });
  if (error) throw error;
}

export async function signedUrl(
  name: BucketName,
  path: string,
  ttlSec = 900,
): Promise<string> {
  const { data, error } = await bucket(name).createSignedUrl(path, ttlSec);
  if (error || !data?.signedUrl) {
    throw error ?? new Error("signed_url_failed");
  }
  return data.signedUrl;
}

export async function removeObject(
  name: BucketName,
  path: string,
): Promise<void> {
  const { error } = await bucket(name).remove([path]);
  if (error) throw error;
}

export function recordingPath(workspaceId: string, callSid: string): string {
  return `${workspaceId}/${callSid}.mp3`;
}

export function voicemailPath(workspaceId: string, name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
  return `${workspaceId}/${Date.now()}-${safe}`;
}

export const BUCKETS = {
  recordings: serverEnv.SUPABASE_STORAGE_BUCKET_RECORDINGS as BucketName,
  voicemails: serverEnv.SUPABASE_STORAGE_BUCKET_VOICEMAILS as BucketName,
} as const;
