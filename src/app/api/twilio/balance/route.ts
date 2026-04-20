import { NextResponse } from "next/server";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { fetchBalance } from "@/lib/twilio/server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    const snap = await fetchBalance(auth.wid);
    if (!snap) {
      return NextResponse.json(
        { configured: false, balance: null, currency: null },
        { status: 200 },
      );
    }
    return NextResponse.json({
      configured: true,
      balance: snap.balance,
      currency: snap.currency,
      fetchedAt: snap.fetchedAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown_error" },
      { status: 400 },
    );
  }
}
