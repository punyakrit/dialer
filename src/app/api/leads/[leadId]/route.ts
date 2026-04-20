import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import {
  deleteLead,
  getLead,
  updateLead,
} from "@/server/repositories/leads.repo";
import { normalizePhone } from "@/lib/phone/normalize";

export const runtime = "nodejs";

const StatusEnum = z.enum([
  "NEW",
  "ATTEMPTED",
  "CONNECTED",
  "INTERESTED",
  "MEETING_BOOKED",
  "CLOSED_WON",
  "CLOSED_LOST",
]);

const PatchBody = z.object({
  firstName: z.string().trim().max(200).nullable().optional(),
  lastName: z.string().trim().max(200).nullable().optional(),
  company: z.string().trim().max(200).nullable().optional(),
  title: z.string().trim().max(200).nullable().optional(),
  website: z.string().trim().max(400).nullable().optional(),
  niche: z.string().trim().max(200).nullable().optional(),
  email: z
    .union([z.email(), z.null(), z.string().length(0)])
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null)),
  phone: z.string().trim().min(5).max(40).optional(),
  status: StatusEnum.optional(),
  notes: z.string().max(4000).nullable().optional(),
  assignedToId: z.uuid().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { leadId } = await params;
  const row = await getLead(auth.wid, leadId);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ lead: row });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { leadId } = await params;
  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  const v = parsed.data;

  const patch: Parameters<typeof updateLead>[2] = {};
  if (v.firstName !== undefined) patch.first_name = v.firstName;
  if (v.lastName !== undefined) patch.last_name = v.lastName;
  if (v.company !== undefined) patch.company = v.company;
  if (v.title !== undefined) patch.title = v.title;
  if (v.website !== undefined) patch.website = v.website;
  if (v.niche !== undefined) patch.niche = v.niche;
  if (v.email !== undefined) patch.email = v.email;
  if (v.status !== undefined) patch.status = v.status;
  if (v.notes !== undefined) patch.notes = v.notes;
  if (v.assignedToId !== undefined) patch.assigned_to_id = v.assignedToId;
  if (v.phone !== undefined) {
    const norm = normalizePhone(v.phone, "US");
    if (!norm) {
      return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
    }
    patch.phone = norm.e164;
    patch.phone_normalized = norm.normalized;
  }

  try {
    const row = await updateLead(auth.wid, leadId, patch);
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ lead: row });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "internal";
    if (/duplicate/i.test(msg)) {
      return NextResponse.json({ error: "duplicate_phone" }, { status: 409 });
    }
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { leadId } = await params;
  const ok = await deleteLead(auth.wid, leadId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
