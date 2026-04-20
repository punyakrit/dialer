import { NextResponse, type NextRequest } from "next/server";
import {
  clearRefreshCookie,
  readRefreshCookie,
  revokeRefreshToken,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const token = await readRefreshCookie();
  if (token) await revokeRefreshToken(token);
  await clearRefreshCookie();
  return NextResponse.json({ ok: true });
}
