import { NextResponse, type NextRequest } from "next/server";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import {
  BUCKETS,
  uploadBuffer,
  voicemailPath,
} from "@/lib/supabase/storage";
import { createVoicemailDrop } from "@/server/repositories/voicemail.repo";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const name = (form.get("name") as string | null)?.trim();
  if (!(file instanceof File) || !name) {
    return NextResponse.json(
      { error: "missing_fields", message: "file and name are required" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }
  if (!/audio\/(mpeg|mp3|wav|ogg)/i.test(file.type) && !/\.mp3$/i.test(file.name)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }

  const path = voicemailPath(auth.wid, file.name);
  const buf = Buffer.from(await file.arrayBuffer());
  await uploadBuffer(BUCKETS.voicemails, path, buf, {
    contentType: file.type || "audio/mpeg",
    upsert: false,
  });

  const drop = await createVoicemailDrop(auth.wid, {
    name,
    storagePath: path,
    durationSec: null,
  });
  return NextResponse.json({ drop });
}
