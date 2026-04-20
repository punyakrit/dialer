import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import twilio from "twilio";
import { getAuthFromHeaders } from "@/lib/auth/guards";

export const runtime = "nodejs";

/**
 * Stage 1 of the connect wizard.
 *
 * Input:  Account SID + Auth Token
 * Output: account name, balance, list of voice-enabled phone numbers
 *
 * Nothing is persisted here — the user then picks a number and the front-end
 * calls `POST /api/settings/twilio` which auto-creates an API Key + TwiML App
 * and stores the final encrypted bundle.
 */

const Body = z.object({
  accountSid: z
    .string()
    .trim()
    .regex(/^AC[0-9a-fA-F]{32}$/, "Account SID must look like AC…"),
  authToken: z.string().trim().min(20).max(500),
});

type PhoneNumber = {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  voiceEnabled: boolean;
  smsEnabled: boolean;
};

export async function POST(req: NextRequest) {
  const auth = await getAuthFromHeaders();
  if (!auth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  const { accountSid, authToken } = parsed.data;

  let client;
  try {
    client = twilio(accountSid, authToken);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "twilio_init_failed" },
      { status: 400 },
    );
  }

  try {
    const [account, balance, numbers] = await Promise.all([
      client.api.accounts(accountSid).fetch(),
      client.balance.fetch(),
      client.incomingPhoneNumbers.list({ limit: 200 }),
    ]);

    const phoneNumbers: PhoneNumber[] = numbers
      .map((n) => ({
        sid: n.sid,
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName ?? n.phoneNumber,
        voiceEnabled: n.capabilities?.voice ?? false,
        smsEnabled: n.capabilities?.sms ?? false,
      }))
      .sort((a, b) =>
        a.voiceEnabled === b.voiceEnabled ? 0 : a.voiceEnabled ? -1 : 1,
      );

    return NextResponse.json({
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName ?? account.sid,
        status: account.status,
        type: account.type,
      },
      balance: {
        amount: balance.balance,
        currency: balance.currency,
      },
      numbers: phoneNumbers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "twilio_error";
    // Twilio returns 20003 / HTTP 401 on bad credentials — surface a friendly error.
    if (/auth|20003|401/i.test(message)) {
      return NextResponse.json(
        {
          error: "invalid_credentials",
          message:
            "Couldn't authenticate with Twilio. Double-check your Account SID and Auth Token.",
        },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
