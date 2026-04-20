import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import {
  createTemplate,
  listTemplates,
} from "@/server/repositories/sms.repo";

export const runtime = "nodejs";

const CreateBody = z.object({
  name: z.string().trim().min(1).max(120),
  body: z.string().min(1).max(4000),
  variables: z.array(z.string()).default([]),
});

export async function GET() {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const rows = await listTemplates(auth.wid);
  return NextResponse.json({ rows });
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
  try {
    const row = await createTemplate(auth.wid, parsed.data);
    return NextResponse.json({ template: row });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "internal";
    if (/duplicate/i.test(msg)) {
      return NextResponse.json({ error: "duplicate_name" }, { status: 409 });
    }
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
