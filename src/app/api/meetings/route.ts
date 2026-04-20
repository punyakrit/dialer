import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import {
  createMeeting,
  listMeetings,
} from "@/server/repositories/meetings.repo";
import { getLead } from "@/server/repositories/leads.repo";
import { sendMeetingConfirmation } from "@/lib/notifications/email";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ListQuery = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const CreateBody = z.object({
  leadId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  email: z
    .union([z.email(), z.string().length(0)])
    .optional()
    .transform((v) => (v ? v : null)),
  notes: z.string().max(4000).optional(),
  sendEmail: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const url = new URL(req.url);
  const parsed = ListQuery.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }
  const { rows, total } = await listMeetings(auth.wid, parsed.data);
  return NextResponse.json({ rows, total });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }
  const v = parsed.data;

  const lead = await getLead(auth.wid, v.leadId);
  if (!lead) {
    return NextResponse.json({ error: "lead_not_found" }, { status: 404 });
  }

  const meeting = await createMeeting(auth.wid, {
    leadId: v.leadId,
    organizerId: auth.sub,
    title: v.title,
    startsAt: v.startsAt,
    endsAt: v.endsAt,
    email: v.email,
    notes: v.notes,
  });

  // Mark the lead as MEETING_BOOKED, best-effort.
  await supabaseAdmin()
    .from("leads")
    .update({ status: "MEETING_BOOKED" })
    .eq("workspace_id", auth.wid)
    .eq("id", v.leadId);

  let emailed = false;
  if (v.sendEmail && v.email) {
    const { data: organizer } = await supabaseAdmin()
      .from("users")
      .select("name, email")
      .eq("id", auth.sub)
      .maybeSingle();

    const res = await sendMeetingConfirmation({
      to: v.email,
      fromName: organizer?.name ?? "Dialer by LaunchCraft",
      leadName:
        [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim() ||
        "there",
      startsAt: new Date(v.startsAt),
      endsAt: new Date(v.endsAt),
      notes: v.notes ?? null,
      replyTo: organizer?.email ?? undefined,
    });
    emailed = res.ok;
  }

  return NextResponse.json({ meeting, emailed });
}
