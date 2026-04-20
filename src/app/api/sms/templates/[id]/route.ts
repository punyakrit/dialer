import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import {
  deleteTemplate,
  updateTemplate,
} from "@/server/repositories/sms.repo";

export const runtime = "nodejs";

const PatchBody = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  body: z.string().min(1).max(4000).optional(),
  variables: z.array(z.string()).optional(),
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
  const row = await updateTemplate(auth.wid, id, parsed.data);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ template: row });
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
  const ok = await deleteTemplate(auth.wid, id);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
