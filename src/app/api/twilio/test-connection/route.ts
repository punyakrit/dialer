import { NextResponse } from "next/server";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { testConnection } from "@/lib/twilio/server";
import { setTestResult } from "@/server/repositories/twilio-config.repo";

export const runtime = "nodejs";

export async function POST() {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const result = await testConnection(auth.wid);
  if (!result.ok) {
    await setTestResult(auth.wid, `failed:${result.error}`);
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 },
    );
  }

  await setTestResult(auth.wid, "ok");
  return NextResponse.json({
    ok: true,
    accountFriendlyName: result.accountFriendlyName,
    balance: result.balance,
    currency: result.currency,
  });
}
