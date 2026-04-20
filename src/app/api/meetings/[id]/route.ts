import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import {
  deleteMeeting,
  updateMeeting,
} from "@/server/repositories/meetings.repo";

export const runtime = "nodejs";

const PatchBody = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  startsAt: z.iso.datetime().optional(),
  endsAt: z.iso.datetime().optional(),
  email: z
    .union([z.email(), z.null(), z.string().length(0)])
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null)),
  notes: z.string().max(4000).nullable().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELED", "NO_SHOW"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }
  const v = parsed.data;
  const patch: Parameters<typeof updateMeeting>[2] = {};
  if (v.title !== undefined) patch.title = v.title;
  if (v.startsAt !== undefined) patch.starts_at = v.startsAt;
  if (v.endsAt !== undefined) patch.ends_at = v.endsAt;
  if (v.email !== undefined) patch.email = v.email;
  if (v.notes !== undefined) patch.notes = v.notes;
  if (v.status !== undefined) patch.status = v.status;

  const row = await updateMeeting(auth.wid, id, patch);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ meeting: row });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteMeeting(auth.wid, id);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
