import { NextResponse, type NextRequest } from "next/server";
import { verifyTwilioWebhook } from "@/lib/twilio/webhook-verify";
import { setRecording } from "@/server/repositories/calls.repo";
import { BUCKETS, recordingPath, uploadBuffer } from "@/lib/supabase/storage";
import { loadTwilioConfig } from "@/lib/twilio/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Twilio posts when the recording for a call is ready. The TwiML `<Dial
 * record="record-from-answer"` produces one mp3 per call leg. We download it
 * using basic-auth (accountSid + authToken) and push to Supabase Storage, then
 * record the storage path on the call row.
 *
 * Twilio retries on 5xx. The write keys on `twilio_call_sid`, so retries are
 * safe (last-write-wins with the same payload).
 */
export async function POST(req: NextRequest) {
  const verified = await verifyTwilioWebhook(req);
  if (!verified.ok || !verified.workspaceId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const p = verified.params;
  const callSid = p.CallSid;
  const recordingSid = p.RecordingSid;
  const recordingUrlBase = p.RecordingUrl;
  if (!callSid || !recordingSid || !recordingUrlBase) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Twilio docs: append `.mp3` to the canonical RecordingUrl to fetch the audio.
  const mp3Url = recordingUrlBase.endsWith(".mp3")
    ? recordingUrlBase
    : `${recordingUrlBase}.mp3`;

  const cfg = await loadTwilioConfig(verified.workspaceId);
  if (!cfg?.authToken) {
    logger.warn("recording download skipped: no authToken", {
      workspaceId: verified.workspaceId,
    });
    return NextResponse.json({ ok: true });
  }

  // Fire-and-forget the expensive download+upload so Twilio's retry timer
  // doesn't get held up waiting on storage. Wrap in a try/catch to avoid
  // crashing the route.
  (async () => {
    try {
      const res = await fetch(mp3Url, {
        headers: {
          authorization:
            "Basic " +
            Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64"),
        },
      });
      if (!res.ok) {
        logger.error("recording download failed", {
          status: res.status,
          callSid,
        });
        return;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const path = recordingPath(verified.workspaceId!, callSid);
      await uploadBuffer(BUCKETS.recordings, path, buf, {
        contentType: "audio/mpeg",
        upsert: true,
      });
      await setRecording(verified.workspaceId!, callSid, {
        recordingSid,
        recordingUrl: path, // store path; sign when surfacing
        recordingDurationSec: p.RecordingDuration
          ? Number.parseInt(p.RecordingDuration, 10)
          : null,
      });
    } catch (err) {
      logger.error("recording pipeline failed", {
        err: err instanceof Error ? err.message : "unknown",
        callSid,
      });
    }
  })();

  return NextResponse.json({ ok: true });
}
