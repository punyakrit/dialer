import { NextResponse } from "next/server";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin().rpc("get_me", {
    p_user_id: auth.sub,
  });
  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const m = data[0];
  return NextResponse.json({
    user: {
      id: m.user_id,
      email: m.email,
      name: m.name,
      avatarUrl: m.avatar_url,
      role: m.role,
    },
    workspace: {
      id: m.workspace_id,
      name: m.workspace_name,
      slug: m.workspace_slug,
      timezone: m.timezone,
    },
    twilioConnected: m.twilio_connected,
    twilio: m.twilio_connected
      ? {
          from: m.twilio_from,
          edge: m.twilio_edge,
          lastTestStatus: m.last_test_status,
        }
      : null,
  });
}
