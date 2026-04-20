import { twiml } from "twilio";
import type { DecryptedTwilioConfig } from "./server";

export type OutboundTwimlInput = {
  to: string; // dialed E.164
  config: DecryptedTwilioConfig;
  baseUrl: string; // public https base (e.g. ngrok URL or prod domain)
  workspaceId: string;
  includeRecordingConsent?: boolean;
};

function xmlAttr(v: string | number | boolean | undefined): string {
  if (v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Builds the TwiML the TwiML App returns for `device.connect({params})`.
 *
 * The Node SDK's `VoiceResponse` typings don't expose `machineDetection` on
 * `<Dial>`, so we build the XML ourselves for maximum control. The consent
 * `<Say>` goes through the SDK (stable).
 */
export function outboundTwiml(input: OutboundTwimlInput): string {
  const statusCb = `${input.baseUrl}/api/twilio/status-callback?wid=${encodeURIComponent(input.workspaceId)}`;
  const recordingCb = `${input.baseUrl}/api/twilio/recording-callback?wid=${encodeURIComponent(input.workspaceId)}`;
  const amdCb = `${input.baseUrl}/api/twilio/amd-callback?wid=${encodeURIComponent(input.workspaceId)}`;

  const consent = input.includeRecordingConsent !== false;
  const record = input.config.recordCalls;
  const amd = input.config.amdEnabled;

  const dialAttrs = [
    `callerId="${xmlAttr(input.config.fromNumber)}"`,
    `answerOnBridge="true"`,
    record ? `record="record-from-answer"` : `record="do-not-record"`,
    record ? `recordingStatusCallback="${xmlAttr(recordingCb)}"` : "",
    record ? `recordingStatusCallbackEvent="completed"` : "",
    amd ? `machineDetection="DetectMessageEnd"` : "",
    amd ? `amdStatusCallback="${xmlAttr(amdCb)}"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const numberAttrs = [
    `statusCallback="${xmlAttr(statusCb)}"`,
    `statusCallbackEvent="initiated ringing answered completed"`,
    `statusCallbackMethod="POST"`,
  ].join(" ");

  const consentLine = consent
    ? `<Say voice="Polly.Joanna">This call may be recorded.</Say>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${consentLine}
  <Dial ${dialAttrs}>
    <Number ${numberAttrs}>${xmlAttr(input.to)}</Number>
  </Dial>
</Response>`;
}

/** TwiML for a mid-call voicemail drop: plays the file, then hangs up. */
export function voicemailDropTwiml(signedAudioUrl: string): string {
  const vr = new twiml.VoiceResponse();
  vr.play(signedAudioUrl);
  vr.hangup();
  return vr.toString();
}
