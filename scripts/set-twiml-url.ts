/**
 * Rotate the Voice Request URL of a Twilio TwiML App via the REST API.
 *
 * Usage:
 *   pnpm twiml:set-url https://<your-ngrok>.ngrok.app/api/twilio/voice/outbound
 *
 * Prereqs: TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET,
 * TWILIO_TWIML_APP_SID exported in your shell (or edit the script to read
 * from your app's encrypted config directly).
 */

import twilio from "twilio";

async function main() {
  const url = process.argv[2];
  if (!url || !/^https?:\/\//.test(url)) {
    console.error("Usage: pnpm twiml:set-url https://<host>/api/twilio/voice/outbound");
    process.exit(1);
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

  const missing = Object.entries({
    TWILIO_ACCOUNT_SID: accountSid,
    TWILIO_API_KEY_SID: apiKeySid,
    TWILIO_API_KEY_SECRET: apiKeySecret,
    TWILIO_TWIML_APP_SID: twimlAppSid,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    console.error("Missing env vars:", missing.join(", "));
    process.exit(1);
  }

  const client = twilio(apiKeySid!, apiKeySecret!, { accountSid });
  const app = await client.applications(twimlAppSid!).update({
    voiceUrl: url,
    voiceMethod: "POST",
  });

  console.log("✔ Updated TwiML App Voice URL");
  console.log("  sid:      ", app.sid);
  console.log("  voiceUrl: ", app.voiceUrl);
  console.log("  method:   ", app.voiceMethod);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
