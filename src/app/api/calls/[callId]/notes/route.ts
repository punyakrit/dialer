import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { updateNotes } from "@/server/repositories/calls.repo";

export const runtime = "nodejs";

const Body = z.object({ notes: z.string().max(8000) });

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
  await updateNotes(auth.wid, callId, parsed.data.notes);
  return NextResponse.json({ ok: true });
}
