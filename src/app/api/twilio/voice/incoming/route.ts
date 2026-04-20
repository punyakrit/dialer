import { type NextRequest, NextResponse } from "next/server";
import { twiml } from "twilio";
import { verifyTwilioWebhook } from "@/lib/twilio/webhook-verify";

export const runtime = "nodejs";

/**
 * Stub inbound-call handler. For v1 we simply reject inbound calls with a
 * polite message. Agents can re-enable inbound routing later by pointing this
 * URL at a worker / queue flow.
 */
export async function POST(req: NextRequest) {
  const verified = await verifyTwilioWebhook(req);
  if (!verified.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const vr = new twiml.VoiceResponse();
  vr.say(
    { voice: "Polly.Joanna" },
    "Thank you for calling. Please leave a message after the tone.",
  );
  vr.hangup();
  return new NextResponse(vr.toString(), {
    status: 200,
    headers: { "content-type": "text/xml" },
  });
}
