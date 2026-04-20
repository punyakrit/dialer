import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import twilio from "twilio";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import {
  getTwilioConfig,
  upsertTwilioConfig,
} from "@/server/repositories/twilio-config.repo";
import { encrypt, decrypt, maskSecret } from "@/lib/crypto/aesgcm";
import { serverEnv, clientEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const SaveBody = z.object({
  accountSid: z
    .string()
    .trim()
    .regex(/^AC[0-9a-fA-F]{32}$/, "Account SID must look like AC…"),
  authToken: z.string().trim().min(20).max(500),
  fromNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, "From number must be E.164 (+1…)"),
});

const FRIENDLY_NAME = "Dialer by LaunchCraft";

function mask(ciphertext: string, prefix = 4) {
  try {
    return maskSecret(decrypt(ciphertext), prefix);
  } catch {
    return null;
  }
}

/**
 * Resolve the public base URL Twilio should hit for the TwiML App voice
 * webhook. Prefers the dev tunnel override, falls back to `NEXT_PUBLIC_APP_URL`
 * when it's https.
 */
function publicBaseUrl(): string | null {
  const tunnel = serverEnv.TWILIO_STATUS_CALLBACK_BASE_URL;
  if (tunnel) return tunnel.replace(/\/$/, "");
  const app = clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return app.startsWith("https://") ? app : null;
}

export async function GET() {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const cfg = await getTwilioConfig(auth.wid);
  if (!cfg) return NextResponse.json({ configured: false });

  return NextResponse.json({
    configured: true,
    accountSidMasked: mask(cfg.account_sid_cipher, 4),
    fromNumber: cfg.from_number,
    edge: cfg.edge,
    recordCalls: cfg.record_calls,
    amdEnabled: cfg.amd_enabled,
    lastTestedAt: cfg.last_tested_at,
    lastTestStatus: cfg.last_test_status,
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = SaveBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  const { accountSid, authToken, fromNumber } = parsed.data;

  const baseUrl = publicBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        error: "no_public_base_url",
        message:
          "Set TWILIO_STATUS_CALLBACK_BASE_URL to your ngrok/cloudflared HTTPS URL in dev, " +
          "or deploy the app so NEXT_PUBLIC_APP_URL is https://… — Twilio must be able to reach the webhook.",
      },
      { status: 400 },
    );
  }

  const voiceUrl = `${baseUrl}/api/twilio/voice/outbound?wid=${encodeURIComponent(auth.wid)}`;

  let client;
  try {
    client = twilio(accountSid, authToken);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "twilio_init_failed" },
      { status: 400 },
    );
  }

  // 1. Verify number belongs to this account & supports voice.
  try {
    const numbers = await client.incomingPhoneNumbers.list({
      phoneNumber: fromNumber,
      limit: 1,
    });
    const match = numbers[0];
    if (!match) {
      return NextResponse.json(
        { error: "number_not_on_account" },
        { status: 400 },
      );
    }
    if (match.capabilities?.voice === false) {
      return NextResponse.json(
        { error: "number_not_voice_enabled" },
        { status: 400 },
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "twilio_error";
    if (/auth|20003|401/i.test(message)) {
      return NextResponse.json(
        { error: "invalid_credentials" },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // 2. Auto-create API Key + TwiML App. (Re-creates on every save — the user
  //    can delete stale resources from their Twilio console if they care.)
  let apiKeySid: string;
  let apiKeySecret: string;
  let twimlAppSid: string;

  try {
    const key = await client.newKeys.create({ friendlyName: FRIENDLY_NAME });
    apiKeySid = key.sid;
    apiKeySecret = key.secret;
  } catch (err) {
    logger.error("twilio: failed to create API Key", {
      err: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "api_key_create_failed" },
      { status: 500 },
    );
  }

  try {
    const app = await client.applications.create({
      friendlyName: FRIENDLY_NAME,
      voiceUrl,
      voiceMethod: "POST",
    });
    twimlAppSid = app.sid;
  } catch (err) {
    logger.error("twilio: failed to create TwiML App", {
      err: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "twiml_app_create_failed" },
      { status: 500 },
    );
  }

  // 3. Persist. Defaults: edge=singapore (best for India→US), record + AMD on.
  try {
    await upsertTwilioConfig(auth.wid, {
      accountSidCipher: encrypt(accountSid),
      apiKeySidCipher: encrypt(apiKeySid),
      apiKeySecretCipher: encrypt(apiKeySecret),
      twimlAppSidCipher: encrypt(twimlAppSid),
      authTokenCipher: encrypt(authToken),
      fromNumber,
      edge: "singapore",
      recordCalls: true,
      amdEnabled: true,
    });
  } catch (err) {
    logger.error("twilio settings save failed", {
      err: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    fromNumber,
    edge: "singapore",
    voiceUrl,
  });
}
