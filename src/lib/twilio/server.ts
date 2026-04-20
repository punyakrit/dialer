import "server-only";
import twilio, { type Twilio } from "twilio";
import type { TwilioConfigRow } from "@/types/db";
import { getTwilioConfig } from "@/server/repositories/twilio-config.repo";
import { decrypt } from "@/lib/crypto/aesgcm";

export type DecryptedTwilioConfig = {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  twimlAppSid: string;
  authToken: string | null;
  fromNumber: string;
  edge: string;
  recordCalls: boolean;
  amdEnabled: boolean;
};

function decryptConfig(row: TwilioConfigRow): DecryptedTwilioConfig {
  return {
    accountSid: decrypt(row.account_sid_cipher),
    apiKeySid: decrypt(row.api_key_sid_cipher),
    apiKeySecret: decrypt(row.api_key_secret_cipher),
    twimlAppSid: decrypt(row.twiml_app_sid_cipher),
    authToken: row.auth_token_cipher ? decrypt(row.auth_token_cipher) : null,
    fromNumber: row.from_number,
    edge: row.edge,
    recordCalls: row.record_calls,
    amdEnabled: row.amd_enabled,
  };
}

export async function loadTwilioConfig(
  workspaceId: string,
): Promise<DecryptedTwilioConfig | null> {
  const row = await getTwilioConfig(workspaceId);
  if (!row) return null;
  try {
    return decryptConfig(row);
  } catch {
    return null;
  }
}

export async function getTwilioClient(
  workspaceId: string,
): Promise<{ client: Twilio; config: DecryptedTwilioConfig } | null> {
  const cfg = await loadTwilioConfig(workspaceId);
  if (!cfg) return null;
  const client = twilio(cfg.apiKeySid, cfg.apiKeySecret, {
    accountSid: cfg.accountSid,
  });
  return { client, config: cfg };
}

// -------- Balance cache -----------------------------------------------------

type BalanceSnapshot = {
  balance: string;
  currency: string;
  fetchedAt: number;
};
const balanceCache = new Map<string, BalanceSnapshot>();
const BALANCE_TTL_MS = 60_000;

export async function fetchBalance(
  workspaceId: string,
  opts: { force?: boolean } = {},
): Promise<BalanceSnapshot | null> {
  const cached = balanceCache.get(workspaceId);
  if (
    !opts.force &&
    cached &&
    Date.now() - cached.fetchedAt < BALANCE_TTL_MS
  ) {
    return cached;
  }
  const pair = await getTwilioClient(workspaceId);
  if (!pair) return null;
  const balance = await pair.client.balance.fetch();
  const snap: BalanceSnapshot = {
    balance: balance.balance,
    currency: balance.currency,
    fetchedAt: Date.now(),
  };
  balanceCache.set(workspaceId, snap);
  return snap;
}

export async function testConnection(
  workspaceId: string,
): Promise<
  | { ok: true; accountFriendlyName: string; balance: string; currency: string }
  | { ok: false; error: string }
> {
  const pair = await getTwilioClient(workspaceId);
  if (!pair) return { ok: false, error: "no_config" };
  try {
    const [account, balance] = await Promise.all([
      pair.client.api.accounts(pair.config.accountSid).fetch(),
      pair.client.balance.fetch(),
    ]);
    return {
      ok: true,
      accountFriendlyName: account.friendlyName ?? account.sid,
      balance: balance.balance,
      currency: balance.currency,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    return { ok: false, error: msg };
  }
}

// -------- Webhook signature validation --------------------------------------

export function validateTwilioSignature(args: {
  authToken: string | null;
  signatureHeader: string | null;
  url: string;            // exact public URL Twilio signed
  params: Record<string, string>;
}): boolean {
  if (!args.authToken || !args.signatureHeader) return false;
  return twilio.validateRequest(
    args.authToken,
    args.signatureHeader,
    args.url,
    args.params,
  );
}
