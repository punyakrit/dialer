import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const Query = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14),
});

export async function GET(req: NextRequest) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const url = new URL(req.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin().rpc("call_series", {
    p_workspace_id: auth.wid,
    p_days: parsed.data.days,
  });
  if (error) {
    return NextResponse.json({ error: "series_failed" }, { status: 500 });
  }
  const series = (data ?? []).map((r) => ({
    date: r.day,
    calls: r.calls,
    connected: r.connected,
    talkSec: Number(r.talk_sec) || 0,
  }));
  return NextResponse.json({ series });
}
