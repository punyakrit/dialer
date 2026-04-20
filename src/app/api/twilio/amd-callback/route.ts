import { NextResponse, type NextRequest } from "next/server";
import { verifyTwilioWebhook } from "@/lib/twilio/webhook-verify";
import { setAmdResult } from "@/server/repositories/calls.repo";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Twilio posts the AMD (Answering Machine Detection) result here once it
 * decides whether the callee is a human, machine, fax, or unknown. The browser
 * listens for this signal (via TanStack Query / a live channel) to surface a
 * "Drop voicemail" action when the answer is a machine.
 */
export async function POST(req: NextRequest) {
  const verified = await verifyTwilioWebhook(req);
  if (!verified.ok || !verified.workspaceId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const p = verified.params;
  const callSid = p.CallSid;
  const answeredBy = p.AnsweredBy;
  if (!callSid || !answeredBy) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    await setAmdResult(verified.workspaceId, callSid, answeredBy);
  } catch (err) {
    logger.error("amd-callback persist failed", {
      err: err instanceof Error ? err.message : "unknown",
    });
  }

  return NextResponse.json({ ok: true });
}
