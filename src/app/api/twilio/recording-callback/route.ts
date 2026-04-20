import { NextResponse, type NextRequest } from "next/server";
import { verifyTwilioWebhook } from "@/lib/twilio/webhook-verify";
import { setRecording } from "@/server/repositories/calls.repo";
import { BUCKETS, recordingPath, uploadBuffer } from "@/lib/supabase/storage";
import { loadTwilioConfig } from "@/lib/twilio/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Twilio posts when a recording is ready. We try to download + re-upload to
 * Supabase Storage *in band* with a hard deadline that leaves buffer before
 * Vercel's 10 s Hobby-tier cutoff. If we don't finish in time we just log it
 * and respond 200 — the recording stays on Twilio and the row's
 * `recording_url` stays null. No retry, no crash.
 *
 * Webhook is idempotent because `setRecording` keys on `twilio_call_sid`, so
 * if Twilio happens to retry we'd get another shot.
 */

const DEADLINE_MS = 8_500; // ~1.5 s headroom before Vercel Hobby kills at 10 s

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEADLINE_MS);
  const startedAt = Date.now();

  try {
    const basic = Buffer.from(
      `${cfg.accountSid}:${cfg.authToken}`,
    ).toString("base64");

    const res = await fetch(mp3Url, {
      headers: { authorization: `Basic ${basic}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`download_${res.status}`);

    const buf = Buffer.from(await res.arrayBuffer());
    if (controller.signal.aborted) throw new DeadlineError();

    const path = recordingPath(verified.workspaceId, callSid);
    await uploadBuffer(BUCKETS.recordings, path, buf, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    if (controller.signal.aborted) throw new DeadlineError();

    await setRecording(verified.workspaceId, callSid, {
      recordingSid,
      recordingUrl: path,
      recordingDurationSec: p.RecordingDuration
        ? Number.parseInt(p.RecordingDuration, 10)
        : null,
    });

    logger.info("recording saved", {
      callSid,
      bytes: buf.byteLength,
      ms: Date.now() - startedAt,
    });
  } catch (err) {
    if (isDeadline(err, controller.signal)) {
      logger.warn("recording skipped — hit 8.5s deadline", {
        callSid,
        workspaceId: verified.workspaceId,
        ms: Date.now() - startedAt,
      });
    } else {
      logger.error("recording pipeline failed", {
        err: err instanceof Error ? err.message : "unknown",
        callSid,
      });
    }
  } finally {
    clearTimeout(timer);
  }

  return NextResponse.json({ ok: true });
}

class DeadlineError extends Error {
  constructor() {
    super("deadline");
    this.name = "DeadlineError";
  }
}

function isDeadline(err: unknown, signal: AbortSignal): boolean {
  if (err instanceof DeadlineError) return true;
  if (signal.aborted) return true;
  if (err instanceof Error) {
    return err.name === "AbortError" || err.name === "TimeoutError";
  }
  return false;
}
