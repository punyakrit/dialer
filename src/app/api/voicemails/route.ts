import { NextResponse } from "next/server";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { listVoicemailDrops } from "@/server/repositories/voicemail.repo";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const rows = await listVoicemailDrops(auth.wid);
  return NextResponse.json({ rows });
}
