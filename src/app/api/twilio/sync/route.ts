import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromHeaders } from "@/lib/auth/guards";
import { getTwilioClient } from "@/lib/twilio/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone/normalize";
import { logger } from "@/lib/logger";
import type {
  CallStatus,
  CallDirection,
  Database,
} from "@/types/db";

type CallInsert = Database["dialer"]["Tables"]["calls"]["Insert"];

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Backfill the current workspace with the authenticated user's historical
 * Twilio calls. Paged in chunks so a single invocation fits inside Vercel's
 * function timeout; if we don't finish we hand back a cursor and the client
 * calls again.
 *
 * Idempotent — `calls.twilio_call_sid` is unique, so repeated runs merge
 * without creating duplicates. We only set `lead_id` when we find a matching
 * lead in the workspace; never overwrite an existing one.
 */

const Query = z.object({
  cursor: z.iso.datetime().optional(),
  pageSize: z.coerce.number().int().min(20).max(100).default(50),
});

const DEADLINE_MS = 8_500;

const STATUS_MAP: Record<string, CallStatus> = {
  queued: "QUEUED",
  initiated: "INITIATED",
  ringing: "RINGING",
  "in-progress": "IN_PROGRESS",
  completed: "COMPLETED",
  busy: "BUSY",
  failed: "FAILED",
  "no-answer": "NO_ANSWER",
  canceled: "CANCELED",
  cancelled: "CANCELED",
};

function mapStatus(s: string | null | undefined): CallStatus {
  if (!s) return "COMPLETED";
  return STATUS_MAP[s.toLowerCase()] ?? "COMPLETED";
}

function mapDirection(d: string | null | undefined): CallDirection {
  return (d ?? "").toLowerCase() === "inbound" ? "INBOUND" : "OUTBOUND";
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }
  const { cursor, pageSize } = parsed.data;

  const pair = await getTwilioClient(auth.wid);
  if (!pair) {
    return NextResponse.json({ error: "twilio_not_configured" }, { status: 400 });
  }

  const deadline = Date.now() + DEADLINE_MS;
  const db = supabaseAdmin();

  let imported = 0;
  let touched = 0;
  let oldestSeen: Date | null = null;
  let hasMore = false;

  try {
    // Pull one page at a time via the SDK's built-in paging. Using `endTimeBefore`
    // as a monotonic cursor (Twilio returns newest-first by default).
    let page = await pair.client.calls.page({
      pageSize,
      endTimeBefore: cursor ? new Date(cursor) : undefined,
    });

    outer: while (page) {
      for (const call of page.instances) {
        if (Date.now() >= deadline) {
          hasMore = true;
          break outer;
        }

        // Twilio returns `to` / `from` as E.164 already.
        const toRaw = (call.to ?? "") as string;
        const fromRaw = (call.from ?? "") as string;
        const phoneToMatch = call.direction === "inbound" ? fromRaw : toRaw;
        const norm = normalizePhone(phoneToMatch, "US");
        const phoneKey = norm?.normalized ?? null;

        // Best-effort lead match (only used on insert — we never overwrite an
        // existing lead_id, since live calls already carry it).
        let matchedLeadId: string | null = null;
        if (phoneKey) {
          const { data: lead } = await db
            .from("leads")
            .select("id")
            .eq("workspace_id", auth.wid)
            .eq("phone_normalized", phoneKey)
            .maybeSingle();
          matchedLeadId = lead?.id ?? null;
        }

        const endTime = call.endTime ? new Date(call.endTime) : null;
        const startTime = call.startTime ? new Date(call.startTime) : null;

        const payload: CallInsert = {
          workspace_id: auth.wid,
          user_id: auth.sub,
          twilio_call_sid: call.sid,
          parent_call_sid: call.parentCallSid ?? null,
          direction: mapDirection(call.direction),
          from: fromRaw,
          to: toRaw,
          status: mapStatus(call.status),
          started_at: startTime?.toISOString() ?? null,
          ended_at: endTime?.toISOString() ?? null,
          duration_sec: call.duration ? Number.parseInt(call.duration, 10) : null,
          price_usd: call.price ?? null,
        };
        // Only include lead_id when we matched; otherwise omit so existing
        // value on the row (if any) is preserved by the upsert.
        if (matchedLeadId) payload.lead_id = matchedLeadId;

        const { error } = await db
          .from("calls")
          .upsert(payload, {
            onConflict: "twilio_call_sid",
            ignoreDuplicates: false,
          });

        if (error) {
          logger.warn("sync: upsert failed", {
            sid: call.sid,
            err: error.message,
          });
          continue;
        }

        touched++;
        if (endTime && (!oldestSeen || endTime < oldestSeen)) {
          oldestSeen = endTime;
        }
      }

      if (Date.now() >= deadline - 500) {
        hasMore = page.getNextPageUrl() !== null;
        break;
      }
      if (!page.getNextPageUrl()) break;
      const next = await page.nextPage();
      if (!next) break;
      // Twilio's SDK returns a less-specific `Page<>` from nextPage() than
      // `calls.page()`; cast back to the narrower type.
      page = next as typeof page;
    }

    imported = touched;
  } catch (err) {
    logger.error("twilio sync failed", {
      err: err instanceof Error ? err.message : "unknown",
      workspaceId: auth.wid,
    });
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "sync_error",
        imported,
      },
      { status: 500 },
    );
  }

  // Use oldestSeen as the next-call cursor — "give me calls that ended before
  // this timestamp". Subtract a millisecond to avoid fetching the same row.
  const nextCursor = hasMore && oldestSeen
    ? new Date(oldestSeen.getTime() - 1).toISOString()
    : null;

  return NextResponse.json({
    imported,
    hasMore,
    cursor: nextCursor,
  });
}
