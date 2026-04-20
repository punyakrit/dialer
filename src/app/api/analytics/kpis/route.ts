import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const Query = z.object({
  range: z.enum(["today", "week", "month"]).default("today"),
});

function startOfRange(range: "today" | "week" | "month"): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "today") return d;
  if (range === "week") {
    d.setDate(d.getDate() - 6);
    return d;
  }
  d.setDate(d.getDate() - 29);
  return d;
}

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

  const since = startOfRange(parsed.data.range).toISOString();

  const { data, error } = await supabaseAdmin().rpc("kpis", {
    p_workspace_id: auth.wid,
    p_since: since,
  });
  if (error) {
    return NextResponse.json({ error: "kpi_failed" }, { status: 500 });
  }
  const row = data?.[0] ?? {
    calls_total: 0,
    calls_connected: 0,
    talk_time_sec: 0,
    meetings_booked: 0,
    leads_contacted: 0,
  };
  const answerRate =
    row.calls_total === 0 ? 0 : row.calls_connected / row.calls_total;

  return NextResponse.json({
    range: parsed.data.range,
    totals: {
      calls: row.calls_total,
      connected: row.calls_connected,
      answerRate,
      talkTimeSec: Number(row.talk_time_sec) || 0,
      meetingsBooked: row.meetings_booked,
      leadsContacted: row.leads_contacted,
    },
  });
}
