import { NextResponse } from "next/server";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { deleteTwilioConfig } from "@/server/repositories/twilio-config.repo";

export const runtime = "nodejs";

/**
 * Drops the local Twilio config. Does not delete the API Key / TwiML App on
 * the Twilio side — the user can prune those manually from their Twilio
 * console if they want.
 */
export async function POST() {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  await deleteTwilioConfig(auth.wid);
  return NextResponse.json({ ok: true });
}
