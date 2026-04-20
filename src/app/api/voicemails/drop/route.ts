import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { getTwilioClient } from "@/lib/twilio/server";
import { getVoicemailDrop } from "@/server/repositories/voicemail.repo";
import { BUCKETS, signedUrl } from "@/lib/supabase/storage";
import { voicemailDropTwiml } from "@/lib/twilio/twiml";

export const runtime = "nodejs";

const Body = z.object({
  callSid: z.string().trim().min(1),
  dropId: z.uuid(),
});

export async function POST(req: NextRequest) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const drop = await getVoicemailDrop(auth.wid, parsed.data.dropId);
  if (!drop) {
    return NextResponse.json({ error: "drop_not_found" }, { status: 404 });
  }

  const pair = await getTwilioClient(auth.wid);
  if (!pair) {
    return NextResponse.json(
      { error: "twilio_not_configured" },
      { status: 400 },
    );
  }

  const url = await signedUrl(BUCKETS.voicemails, drop.storage_path, 600);
  const xml = voicemailDropTwiml(url);

  try {
    await pair.client.calls(parsed.data.callSid).update({ twiml: xml });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "drop_failed" },
      { status: 400 },
    );
  }
}
