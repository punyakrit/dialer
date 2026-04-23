import { NextResponse, type NextRequest } from "next/server";
import { verifyTwilioWebhook } from "@/lib/twilio/webhook-verify";
import { updateCallStatusByTwilioSid } from "@/server/repositories/calls.repo";
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
  // The `<Number statusCallback>` webhook fires for the dialed (child) leg —
  // its CallSid is the child SID, while ParentCallSid is the client leg that
  // `/api/twilio/voice/outbound` seeded a row for. Match the seeded row via
  // ParentCallSid when present; fall back to CallSid for parent-leg events.
  const callSid = p.CallSid;
  const parentCallSid = p.ParentCallSid;
  const rowSid = parentCallSid || callSid;
  if (!rowSid) {
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
  const parsedDuration = p.CallDuration
    ? Number.parseInt(p.CallDuration, 10)
    : p.Duration
      ? Number.parseInt(p.Duration, 10)
      : null;
  const durationSec = parsedDuration !== null && Number.isFinite(parsedDuration)
    ? parsedDuration
    : null;

  try {
    const row = await updateCallStatusByTwilioSid(
      verified.workspaceId,
      rowSid,
      {
        status,
        startedAt,
        answeredAt,
        endedAt,
        durationSec,
        priceUsd: p.Price ?? null,
        errorCode: p.ErrorCode ?? null,
        errorMessage: p.ErrorMessage ?? null,
      },
    );
    if (!row) {
      logger.warn("status-callback: no row matched rowSid", {
        rowSid,
        callSid,
        parentCallSid,
        twilioStatus,
      });
    }
  } catch (err) {
    logger.error("status-callback update failed", {
      err: describeError(err),
      rowSid,
      callSid,
      parentCallSid,
      twilioStatus,
    });
    // Return 200 so Twilio doesn't retry the same failing webhook repeatedly.
    return NextResponse.json({ ok: false });
  }

  return NextResponse.json({ ok: true });
}

function describeError(err: unknown): Record<string, unknown> | string {
  if (err instanceof Error) return { message: err.message, name: err.name };
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    return {
      message: typeof o.message === "string" ? o.message : undefined,
      code: o.code,
      details: o.details,
      hint: o.hint,
    };
  }
  return String(err);
}
