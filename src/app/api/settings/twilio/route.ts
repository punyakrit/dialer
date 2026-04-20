import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import {
  getTwilioConfig,
  upsertTwilioConfig,
} from "@/server/repositories/twilio-config.repo";
import { encrypt, decrypt, maskSecret } from "@/lib/crypto/aesgcm";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const SaveBody = z.object({
  accountSid: z
    .string()
    .trim()
    .regex(/^AC[0-9a-fA-F]{32}$/, "Account SID must look like AC…"),
  apiKeySid: z
    .string()
    .trim()
    .regex(/^SK[0-9a-fA-F]{32}$/, "API Key SID must look like SK…"),
  apiKeySecret: z.string().trim().min(10).max(500),
  twimlAppSid: z
    .string()
    .trim()
    .regex(/^AP[0-9a-fA-F]{32}$/, "TwiML App SID must look like AP…"),
  authToken: z.string().trim().min(10).max(500).optional(),
  fromNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, "From number must be E.164 (+1…)"),
  edge: z.string().trim().min(1).max(40).default("singapore"),
  recordCalls: z.boolean().default(true),
  amdEnabled: z.boolean().default(true),
});

function mask(ciphertext: string, prefix = 4) {
  try {
    return maskSecret(decrypt(ciphertext), prefix);
  } catch {
    return null;
  }
}

export async function GET() {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const cfg = await getTwilioConfig(auth.wid);
  if (!cfg) {
    return NextResponse.json({ configured: false });
  }
  return NextResponse.json({
    configured: true,
    accountSidMasked: mask(cfg.account_sid_cipher, 4),
    apiKeySidMasked: mask(cfg.api_key_sid_cipher, 4),
    apiKeySecretMasked: mask(cfg.api_key_secret_cipher, 0),
    twimlAppSidMasked: mask(cfg.twiml_app_sid_cipher, 4),
    authTokenMasked: cfg.auth_token_cipher
      ? mask(cfg.auth_token_cipher, 0)
      : null,
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
  const v = parsed.data;

  try {
    await upsertTwilioConfig(auth.wid, {
      accountSidCipher: encrypt(v.accountSid),
      apiKeySidCipher: encrypt(v.apiKeySid),
      apiKeySecretCipher: encrypt(v.apiKeySecret),
      twimlAppSidCipher: encrypt(v.twimlAppSid),
      authTokenCipher: v.authToken ? encrypt(v.authToken) : null,
      fromNumber: v.fromNumber,
      edge: v.edge,
      recordCalls: v.recordCalls,
      amdEnabled: v.amdEnabled,
    });
  } catch (err) {
    logger.error("twilio settings save failed", {
      err: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
