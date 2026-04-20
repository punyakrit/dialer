import { type NextRequest, NextResponse } from "next/server";
import { loadTwilioConfig } from "@/lib/twilio/server";
import { outboundTwiml } from "@/lib/twilio/twiml";
import { verifyTwilioWebhook } from "@/lib/twilio/webhook-verify";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * TwiML App Voice Request URL target.
 *
 * Called by Twilio when the browser invokes `device.connect({params})`.
 * Returns TwiML that bridges the browser leg to the PSTN target via `<Dial>`.
 *
 * Twilio submits the original `device.connect` params as form fields on this
 * request:
 *   - `To`        the E.164 number the user typed/clicked
 *   - `LeadId`    optional — we echo into our status-callback URL for
 *                 association
 *
 * Identity on the device ("user-<userId>") is in the `From` field.
 */
export async function POST(req: NextRequest) {
  const verified = await verifyTwilioWebhook(req);
  if (!verified.ok || !verified.workspaceId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const to = verified.params.To ?? verified.params.to;
  if (!to) {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Missing destination number.</Say></Response>',
      { status: 400, headers: { "content-type": "text/xml" } },
    );
  }

  const cfg = await loadTwilioConfig(verified.workspaceId);
  if (!cfg) {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Twilio is not configured for this workspace.</Say></Response>',
      { status: 400, headers: { "content-type": "text/xml" } },
    );
  }

  const baseUrl =
    serverEnv.TWILIO_STATUS_CALLBACK_BASE_URL ?? "";
  if (!baseUrl) {
    logger.warn(
      "TWILIO_STATUS_CALLBACK_BASE_URL is unset; webhooks won't reach this process",
    );
  }

  const xml = outboundTwiml({
    to,
    config: cfg,
    baseUrl,
    workspaceId: verified.workspaceId,
  });

  return new NextResponse(xml, {
    status: 200,
    headers: { "content-type": "text/xml" },
  });
}
