import "server-only";
import type { NextRequest } from "next/server";
import { loadTwilioConfig } from "./server";
import { validateTwilioSignature } from "./server";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Shared signature-validation helper for Twilio webhooks. Returns the parsed
 * form body on success, or null on failure (caller should return a 403).
 *
 * - Reads `wid` from the query string to locate the workspace → decrypt the
 *   auth token → run `twilio.validateRequest`.
 * - Honors `x-forwarded-proto` / `x-forwarded-host` so ngrok/cloudflared tunnels
 *   work in dev.
 * - Honors `DEV_SKIP_WEBHOOK_SIGNATURE=true` in dev only.
 */
export async function verifyTwilioWebhook(req: NextRequest): Promise<{
  ok: boolean;
  workspaceId: string | null;
  params: Record<string, string>;
}> {
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("wid");

  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => {
    params[k] = typeof v === "string" ? v : "";
  });

  if (!workspaceId) {
    logger.warn("webhook missing wid", { path: url.pathname });
    return { ok: false, workspaceId: null, params };
  }

  if (serverEnv.DEV_SKIP_WEBHOOK_SIGNATURE && serverEnv.NODE_ENV !== "production") {
    logger.warn("webhook signature check skipped (dev only)", {
      path: url.pathname,
    });
    return { ok: true, workspaceId, params };
  }

  const cfg = await loadTwilioConfig(workspaceId);
  if (!cfg?.authToken) {
    logger.warn("webhook rejected: no auth_token on twilio_config", {
      workspaceId,
    });
    return { ok: false, workspaceId, params };
  }

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const publicUrl =
    forwardedProto && forwardedHost
      ? `${forwardedProto}://${forwardedHost}${url.pathname}${url.search}`
      : req.url;

  const sig = req.headers.get("x-twilio-signature");
  const ok = validateTwilioSignature({
    authToken: cfg.authToken,
    signatureHeader: sig,
    url: publicUrl,
    params,
  });
  if (!ok) {
    logger.warn("webhook signature mismatch", {
      path: url.pathname,
      workspaceId,
    });
  }
  return { ok, workspaceId, params };
}
