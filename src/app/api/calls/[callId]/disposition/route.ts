import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { setDisposition } from "@/server/repositories/calls.repo";
import { updateLead } from "@/server/repositories/leads.repo";
import type { LeadStatus } from "@/types/db";

export const runtime = "nodejs";

const Body = z.object({
  disposition: z.enum([
    "CONNECTED",
    "VOICEMAIL",
    "NO_ANSWER",
    "BUSY",
    "WRONG_NUMBER",
    "NOT_INTERESTED",
    "CALLBACK_REQUESTED",
    "MEETING_BOOKED",
    "DO_NOT_CALL",
  ]),
});

/** When an agent picks a disposition, mirror it onto the lead status. */
const DISPOSITION_TO_LEAD_STATUS: Partial<
  Record<z.infer<typeof Body>["disposition"], LeadStatus>
> = {
  CONNECTED: "CONNECTED",
  NO_ANSWER: "ATTEMPTED",
  BUSY: "ATTEMPTED",
  VOICEMAIL: "ATTEMPTED",
  NOT_INTERESTED: "CLOSED_LOST",
  MEETING_BOOKED: "MEETING_BOOKED",
  DO_NOT_CALL: "CLOSED_LOST",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ callId: string }> },
) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { callId } = await params;
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const call = await setDisposition(auth.wid, callId, parsed.data.disposition);
  if (!call) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const leadStatus = DISPOSITION_TO_LEAD_STATUS[parsed.data.disposition];
  if (leadStatus && call.lead_id) {
    await updateLead(auth.wid, call.lead_id, {
      status: leadStatus,
      last_contacted_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ call });
}
