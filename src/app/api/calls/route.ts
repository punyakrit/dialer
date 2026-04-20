import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { listCalls, type CallFilters } from "@/server/repositories/calls.repo";
import type { CallStatus, Disposition } from "@/types/db";

export const runtime = "nodejs";

const ListQuery = z.object({
  disposition: z.string().optional(),
  status: z.string().optional(),
  leadId: z.uuid().optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
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
  const v = parsed.data;
  const filters: CallFilters = {
    dispositionIn: v.disposition
      ? (v.disposition.split(",").filter(Boolean) as Disposition[])
      : null,
    statusIn: v.status
      ? (v.status.split(",").filter(Boolean) as CallStatus[])
      : null,
    leadId: v.leadId ?? null,
    from: v.from ?? null,
    to: v.to ?? null,
    limit: v.limit,
    offset: v.offset,
  };
  const { rows, total } = await listCalls(auth.wid, filters);
  return NextResponse.json({ rows, total, limit: v.limit, offset: v.offset });
}
