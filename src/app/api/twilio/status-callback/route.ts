import { NextResponse, type NextRequest } from "next/server";
import { verifyTwilioWebhook } from "@/lib/twilio/webhook-verify";
import { upsertByTwilioSid } from "@/server/repositories/calls.repo";
import type { CallStatus } from "@/types/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const STATUS_MAP: Record<string, CallStatus> = {
  queued: "QUEUED",
  initiated: "INITIATED",
  ringing: "RINGING",
  "in-progress": "IN_PROGRESS",
  answered: "IN_PROGRESS",
  completed: "COMPLETED",
  busy: "BUSY",
  failed: "FAILED",
  "no-answer": "NO_ANSWER",
  canceled: "CANCELED",
};

export async function POST(req: NextRequest) {
  const verified = await verifyTwilioWebhook(req);
  if (!verified.ok || !verified.workspaceId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const p = verified.params;
  const callSid = p.CallSid;
  if (!callSid) {
    return NextResponse.json({ error: "missing_call_sid" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const twilioStatus = (p.CallStatus ?? "").toLowerCase();
  const status = STATUS_MAP[twilioStatus];

  const startedAt =
    twilioStatus === "initiated" || twilioStatus === "ringing" ? nowIso : null;
  const answeredAt =
    twilioStatus === "in-progress" || twilioStatus === "answered" ? nowIso : null;
  const endedAt =
    twilioStatus === "completed" ||
    twilioStatus === "failed" ||
    twilioStatus === "busy" ||
    twilioStatus === "no-answer" ||
    twilioStatus === "canceled"
      ? nowIso
      : null;
  const durationSec = p.CallDuration
    ? Number.parseInt(p.CallDuration, 10)
    : p.Duration
      ? Number.parseInt(p.Duration, 10)
      : null;

  try {
    await upsertByTwilioSid(
      verified.workspaceId,
      callSid,
      {
        // We don't know user_id here — upsert only populates if new row.
        // Trust that the `/api/twilio/voice/outbound` flow (or future create)
        // seeded the row; if not, the columns stay NULL until we match them
        // later via another webhook event.
        from: p.From,
        to: p.To,
      },
      {
        status,
        startedAt,
        answeredAt,
        endedAt,
        durationSec: Number.isFinite(durationSec) ? (durationSec ?? null) : null,
        priceUsd: p.Price ?? null,
        errorCode: p.ErrorCode ?? null,
        errorMessage: p.ErrorMessage ?? null,
      },
    );
  } catch (err) {
    logger.error("status-callback upsert failed", {
      err: err instanceof Error ? err.message : "unknown",
      callSid,
    });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
