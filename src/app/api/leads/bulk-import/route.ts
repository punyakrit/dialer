import { NextResponse, type NextRequest } from "next/server";
import Papa from "papaparse";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { upsertLead } from "@/server/repositories/leads.repo";
import { normalizePhone } from "@/lib/phone/normalize";
import { logActivity } from "@/server/repositories/activity.repo";

export const runtime = "nodejs";
export const maxDuration = 60;

type Row = Record<string, string>;

const COLUMN_ALIASES: Record<string, string> = {
  first_name: "firstName",
  firstname: "firstName",
  first: "firstName",
  last_name: "lastName",
  lastname: "lastName",
  last: "lastName",
  full_name: "fullName",
  fullname: "fullName",
  name: "fullName",
  company: "company",
  organization: "company",
  org: "company",
  title: "title",
  job_title: "title",
  email: "email",
  email_address: "email",
  phone: "phone",
  phone_number: "phone",
  mobile: "phone",
  website: "website",
  url: "website",
  niche: "niche",
  industry: "niche",
  category: "niche",
};

function normalizeKey(k: string) {
  return k.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function splitName(full: string): { firstName?: string; lastName?: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let csvText = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }
    csvText = await file.text();
  } else {
    // Raw text body fallback.
    csvText = await req.text();
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: "empty_csv" }, { status: 400 });
  }

  const parsed = Papa.parse<Row>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => normalizeKey(h),
  });

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    return NextResponse.json(
      {
        error: "csv_parse_error",
        message: `${first.type}: ${first.message} (row ${first.row ?? "?"})`,
      },
      { status: 400 },
    );
  }

  let inserted = 0;
  let updated = 0;
  const errors: Array<{ row: number; reason: string }> = [];
  const seenPhones = new Set<string>();

  for (const [i, raw] of parsed.data.entries()) {
    const row: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(raw)) {
      const mapped = COLUMN_ALIASES[normalizeKey(k)];
      if (mapped) row[mapped] = typeof v === "string" ? v.trim() : undefined;
    }

    const phoneRaw = row.phone;
    if (!phoneRaw) {
      errors.push({ row: i + 2, reason: "missing_phone" });
      continue;
    }
    const phone = normalizePhone(phoneRaw, "US");
    if (!phone) {
      errors.push({ row: i + 2, reason: "invalid_phone" });
      continue;
    }
    if (seenPhones.has(phone.normalized)) {
      errors.push({ row: i + 2, reason: "duplicate_in_file" });
      continue;
    }
    seenPhones.add(phone.normalized);

    let firstName = row.firstName;
    let lastName = row.lastName;
    if (!firstName && !lastName && row.fullName) {
      const parts = splitName(row.fullName);
      firstName = parts.firstName;
      lastName = parts.lastName;
    }

    try {
      const before = inserted + updated;
      await upsertLead(auth.wid, {
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        company: row.company ?? null,
        title: row.title ?? null,
        website: row.website ?? null,
        niche: row.niche ?? null,
        email: row.email ?? null,
        phone: phone.e164,
        phoneNormalized: phone.normalized,
        source: "CSV",
      });
      // We can't easily tell insert vs update from upsert's return in one
      // call; tracked as "processed" (inserted on first touch; subsequent
      // rows with the same phone_normalized in this workspace are updates).
      void before;
      inserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      if (/duplicate/i.test(msg)) {
        updated++;
      } else {
        errors.push({ row: i + 2, reason: msg });
      }
    }
  }

  try {
    await logActivity(auth.wid, {
      type: "IMPORT",
      userId: auth.sub,
      payload: { inserted, updated, errorsCount: errors.length },
    });
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({
    inserted,
    updated,
    skipped: errors.length,
    errors: errors.slice(0, 50),
  });
}
