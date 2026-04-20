export type TwilioEdge =
  | "singapore"
  | "tokyo"
  | "sydney"
  | "ashburn"
  | "umatilla"
  | "sao-paulo"
  | "dublin"
  | "frankfurt"
  | "roaming"
  | "mumbai";

/** Subset of fields Twilio posts to status callbacks. */
export type StatusCallbackPayload = {
  CallSid: string;
  ParentCallSid?: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus:
    | "queued"
    | "initiated"
    | "ringing"
    | "in-progress"
    | "answered"
    | "completed"
    | "busy"
    | "failed"
    | "no-answer"
    | "canceled";
  Direction: string;
  Timestamp?: string;
  CallDuration?: string;
  Duration?: string;
  Price?: string;
  PriceUnit?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  AnsweredBy?: string;
};

export type RecordingCallbackPayload = {
  CallSid: string;
  AccountSid: string;
  RecordingSid: string;
  RecordingUrl: string;              // canonical URL, append .mp3 to download
  RecordingStatus: string;
  RecordingDuration?: string;
  RecordingChannels?: string;
  RecordingSource?: string;
};

export type AmdCallbackPayload = {
  CallSid: string;
  AccountSid: string;
  AnsweredBy: string;                 // machine_end_beep | machine_end_silence | human | fax | unknown
  MachineDetectionDuration?: string;
};
