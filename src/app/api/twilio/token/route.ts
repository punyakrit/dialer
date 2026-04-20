import { NextResponse } from "next/server";
import twilio from "twilio";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { loadTwilioConfig } from "@/lib/twilio/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const TOKEN_TTL_SEC = 3600;

export async function GET() {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const cfg = await loadTwilioConfig(auth.wid);
  if (!cfg) {
    return NextResponse.json({ error: "twilio_not_configured" }, { status: 400 });
  }

  const identity = `user-${auth.sub}`;

  try {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const token = new AccessToken(
      cfg.accountSid,
      cfg.apiKeySid,
      cfg.apiKeySecret,
      { identity, ttl: TOKEN_TTL_SEC },
    );

    const grant = new VoiceGrant({
      outgoingApplicationSid: cfg.twimlAppSid,
      incomingAllow: true,
    });
    token.addGrant(grant);

    return NextResponse.json({
      token: token.toJwt(),
      identity,
      ttlSec: TOKEN_TTL_SEC,
      edge: cfg.edge,
    });
  } catch (err) {
    logger.error("twilio token generation failed", {
      err: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ error: "token_failed" }, { status: 500 });
  }
}
