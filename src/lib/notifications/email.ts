import "server-only";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

let _resend: Resend | null = null;

function client() {
  if (!serverEnv.RESEND_API_KEY) return null;
  if (_resend) return _resend;
  _resend = new Resend(serverEnv.RESEND_API_KEY);
  return _resend;
}

export async function sendMeetingConfirmation(input: {
  to: string;
  fromName: string;
  leadName: string;
  startsAt: Date;
  endsAt: Date;
  notes?: string | null;
  replyTo?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const r = client();
  if (!r) return { ok: false, skipped: true };

  const start = input.startsAt.toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });
  const end = input.endsAt.toLocaleString(undefined, { timeStyle: "short" });

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; max-width:520px;">
      <h2 style="margin:0 0 12px 0; font-weight:600;">You're on ${input.fromName}'s calendar</h2>
      <p>Hi ${input.leadName || "there"}, thanks for chatting.</p>
      <p style="margin:16px 0 8px 0;"><strong>${start} – ${end}</strong></p>
      ${input.notes ? `<p style="color:#555;">${input.notes}</p>` : ""}
      <p style="color:#888; font-size:12px; margin-top:24px;">
        Reply to this email if you need to reschedule.
      </p>
    </div>
  `;

  try {
    await r.emails.send({
      from: `${input.fromName} <onboarding@resend.dev>`,
      replyTo: input.replyTo,
      to: input.to,
      subject: `Meeting confirmed: ${start}`,
      html,
    });
    return { ok: true };
  } catch (err) {
    logger.warn("resend send failed", {
      err: err instanceof Error ? err.message : "unknown",
    });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
