import { type NextRequest, NextResponse } from "next/server";
import { loadTwilioConfig } from "@/lib/twilio/server";
import { outboundTwiml } from "@/lib/twilio/twiml";
import { verifyTwilioWebhook } from "@/lib/twilio/webhook-verify";
import { serverEnv, clientEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * TwiML App Voice Request URL target.
 *
 * Called by Twilio when the browser invokes `device.connect({params})`.
 * Returns TwiML that bridges the browser leg to the PSTN target via `<Dial>`.
 *
 * Twilio submits the original `device.connect` params as form fields:
 *   - `To`        the E.164 number the user typed/clicked
 *   - `LeadId`    optional — passthrough for client-side matching
 */

/**
 * Resolve the public base URL for embedding callback URLs in the returned
 * TwiML. Priority:
 *   1. The exact host Twilio just used to reach us (via x-forwarded-* headers)
 *      — by definition reachable, so callbacks will work.
 *   2. `TWILIO_STATUS_CALLBACK_BASE_URL` (explicit override for ngrok/cloudflared).
 *   3. `NEXT_PUBLIC_APP_URL` when it's https (prod canonical domain).
 */
function resolveBaseUrl(req: NextRequest): string | null {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host");
  const proto = forwardedProto ?? "https";
  if (host) return `${proto}://${host}`.replace(/\/$/, "");

  if (serverEnv.TWILIO_STATUS_CALLBACK_BASE_URL) {
    return serverEnv.TWILIO_STATUS_CALLBACK_BASE_URL.replace(/\/$/, "");
  }
  const app = clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return app.startsWith("https://") ? app : null;
}

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

  const baseUrl = resolveBaseUrl(req);
  if (!baseUrl) {
    logger.error(
      "outbound: no reachable base URL for callbacks (request had no host header)",
    );
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Configuration error: callback URL is unreachable.</Say></Response>',
      { status: 500, headers: { "content-type": "text/xml" } },
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
