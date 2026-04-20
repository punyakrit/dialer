import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { getTwilioClient } from "@/lib/twilio/server";
import { getLead } from "@/server/repositories/leads.repo";
import { renderTemplate } from "@/server/repositories/sms.repo";
import { logActivity } from "@/server/repositories/activity.repo";
import { normalizePhone } from "@/lib/phone/normalize";

export const runtime = "nodejs";

const Body = z.object({
  leadId: z.uuid().optional(),
  to: z.string().optional(),
  body: z.string().min(1).max(1600).optional(),
  templateBody: z.string().optional(),
  vars: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }
  const v = parsed.data;

  let to = v.to;
  let leadId = v.leadId;
  const vars: Record<string, string> = { ...(v.vars ?? {}) };

  if (leadId && !to) {
    const lead = await getLead(auth.wid, leadId);
    if (!lead) {
      return NextResponse.json({ error: "lead_not_found" }, { status: 404 });
    }
    to = lead.phone;
    vars.firstName ??= lead.first_name ?? "";
    vars.lastName ??= lead.last_name ?? "";
    vars.company ??= lead.company ?? "";
  }

  if (!to) {
    return NextResponse.json({ error: "missing_to" }, { status: 400 });
  }
  const norm = normalizePhone(to, "US");
  if (!norm) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const text = v.body ?? (v.templateBody ? renderTemplate(v.templateBody, vars) : "");
  if (!text) {
    return NextResponse.json({ error: "empty_body" }, { status: 400 });
  }

  const pair = await getTwilioClient(auth.wid);
  if (!pair) {
    return NextResponse.json(
      { error: "twilio_not_configured" },
      { status: 400 },
    );
  }

  try {
    const message = await pair.client.messages.create({
      from: pair.config.fromNumber,
      to: norm.e164,
      body: text,
    });
    await logActivity(auth.wid, {
      type: "SMS",
      userId: auth.sub,
      targetType: leadId ? "lead" : null,
      targetId: leadId ?? null,
      payload: { sid: message.sid, to: norm.e164 },
    });
    return NextResponse.json({ ok: true, sid: message.sid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "send_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
