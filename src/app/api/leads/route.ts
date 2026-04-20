import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import {
  createLead,
  listLeads,
  type LeadFilters,
} from "@/server/repositories/leads.repo";
import { normalizePhone } from "@/lib/phone/normalize";
import type { LeadStatus } from "@/types/db";

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

const ListQuery = z.object({
  status: StatusEnum.optional(),
  assignedTo: z.string().uuid().optional(),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const CreateBody = z.object({
  firstName: z.string().trim().max(200).optional(),
  lastName: z.string().trim().max(200).optional(),
  company: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  website: z.string().trim().max(400).optional(),
  niche: z.string().trim().max(200).optional(),
  email: z
    .union([z.email(), z.string().length(0)])
    .optional()
    .transform((v) => (v ? v : null)),
  phone: z.string().trim().min(5).max(40),
  source: z.string().trim().max(200).optional(),
  status: StatusEnum.default("NEW"),
  notes: z.string().max(4000).optional(),
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
  const { status, assignedTo, q, limit, offset } = parsed.data;
  const filters: LeadFilters = {
    status: (status as LeadStatus | undefined) ?? null,
    assignedToId: assignedTo ?? null,
    search: q ?? null,
    limit,
    offset,
  };
  const { rows, total } = await listLeads(auth.wid, filters);
  return NextResponse.json({ rows, total, limit, offset });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  const v = parsed.data;
  const phone = normalizePhone(v.phone, "US");
  if (!phone) {
    return NextResponse.json(
      { error: "invalid_phone", message: "Enter a valid phone number." },
      { status: 400 },
    );
  }

  try {
    const row = await createLead(auth.wid, {
      firstName: v.firstName,
      lastName: v.lastName,
      company: v.company,
      title: v.title,
      website: v.website,
      niche: v.niche,
      email: v.email ?? null,
      phone: phone.e164,
      phoneNormalized: phone.normalized,
      source: v.source,
      status: v.status,
      notes: v.notes,
    });
    return NextResponse.json({ lead: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal";
    if (/duplicate/i.test(message)) {
      return NextResponse.json({ error: "duplicate_phone" }, { status: 409 });
    }
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
