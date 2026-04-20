/**
 * Temporary hand-authored Database types mirroring the `dialer` schema
 * migrations. Replace with the Supabase CLI output:
 *
 *   pnpm db:types
 *
 * …once a real project is linked. The shape intentionally matches the output of
 * `supabase gen types typescript` so swapping in the generated file is a
 * drop-in.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ----- enums -----------------------------------------------------
export type UserRole = "OWNER" | "ADMIN" | "AGENT";
export type LeadStatus =
  | "NEW"
  | "ATTEMPTED"
  | "CONNECTED"
  | "INTERESTED"
  | "MEETING_BOOKED"
  | "CLOSED_WON"
  | "CLOSED_LOST";
export type CallDirection = "OUTBOUND" | "INBOUND";
export type CallStatus =
  | "QUEUED"
  | "INITIATED"
  | "RINGING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BUSY"
  | "FAILED"
  | "NO_ANSWER"
  | "CANCELED";
export type Disposition =
  | "CONNECTED"
  | "VOICEMAIL"
  | "NO_ANSWER"
  | "BUSY"
  | "WRONG_NUMBER"
  | "NOT_INTERESTED"
  | "CALLBACK_REQUESTED"
  | "MEETING_BOOKED"
  | "DO_NOT_CALL";
export type MeetingStatus = "SCHEDULED" | "COMPLETED" | "CANCELED" | "NO_SHOW";
export type ActivityType =
  | "CALL"
  | "SMS"
  | "NOTE"
  | "STATUS_CHANGE"
  | "MEETING"
  | "IMPORT";

// ----- tables ----------------------------------------------------
type Timestamps = {
  created_at: string;
  updated_at: string;
};

type Row = {
  workspaces: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  } & Timestamps;

  users: {
    id: string;
    email: string;
    password_hash: string | null;
    name: string | null;
    avatar_url: string | null;
    google_id: string | null;
    role: UserRole;
    workspace_id: string;
  } & Timestamps;

  sessions: {
    id: string;
    user_id: string;
    refresh_token_hash: string;
    user_agent: string | null;
    ip: string | null;
    expires_at: string;
    revoked_at: string | null;
    created_at: string;
  };

  push_subscriptions: {
    id: string;
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    created_at: string;
  };

  twilio_configs: {
    id: string;
    workspace_id: string;
    account_sid_cipher: string;
    api_key_sid_cipher: string;
    api_key_secret_cipher: string;
    twiml_app_sid_cipher: string;
    auth_token_cipher: string | null;
    from_number: string;
    edge: string;
    record_calls: boolean;
    amd_enabled: boolean;
    last_tested_at: string | null;
    last_test_status: string | null;
  } & Timestamps;

  leads: {
    id: string;
    workspace_id: string;
    first_name: string | null;
    last_name: string | null;
    company: string | null;
    title: string | null;
    website: string | null;
    niche: string | null;
    email: string | null;
    phone: string;
    phone_normalized: string | null;
    timezone: string | null;
    source: string | null;
    status: LeadStatus;
    score: number;
    assigned_to_id: string | null;
    last_contacted_at: string | null;
    notes: string | null;
    custom_fields: Json | null;
  } & Timestamps;

  calls: {
    id: string;
    workspace_id: string;
    user_id: string;
    lead_id: string | null;
    twilio_call_sid: string | null;
    parent_call_sid: string | null;
    direction: CallDirection;
    from: string;
    to: string;
    status: CallStatus;
    disposition: Disposition | null;
    started_at: string | null;
    answered_at: string | null;
    ended_at: string | null;
    duration_sec: number | null;
    price_usd: string | null;
    recording_url: string | null;
    recording_sid: string | null;
    recording_duration_sec: number | null;
    amd_result: string | null;
    voicemail_dropped_id: string | null;
    notes: string | null;
    error_code: string | null;
    error_message: string | null;
  } & Timestamps;

  meetings: {
    id: string;
    workspace_id: string;
    lead_id: string;
    organizer_id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    email: string | null;
    status: MeetingStatus;
    notes: string | null;
  } & Timestamps;

  sms_templates: {
    id: string;
    workspace_id: string;
    name: string;
    body: string;
    variables: string[];
  } & Timestamps;

  voicemail_drops: {
    id: string;
    workspace_id: string;
    name: string;
    storage_path: string;
    duration_sec: number | null;
    created_at: string;
  };

  activity_logs: {
    id: string;
    workspace_id: string;
    user_id: string | null;
    type: ActivityType;
    target_type: string | null;
    target_id: string | null;
    payload: Json | null;
    created_at: string;
  };

  tags: {
    id: string;
    workspace_id: string;
    name: string;
    color: string;
  };

  lead_tags: {
    lead_id: string;
    tag_id: string;
  };
};

type Insert = {
  [K in keyof Row]: Partial<Row[K]>;
};

type Update = {
  [K in keyof Row]: Partial<Row[K]>;
};

export type Database = {
  dialer: {
    Tables: {
      [K in keyof Row]: {
        Row: Row[K];
        Insert: Insert[K];
        Update: Update[K];
        Relationships: [];
      };
    };
    Enums: {
      user_role: UserRole;
      lead_status: LeadStatus;
      call_direction: CallDirection;
      call_status: CallStatus;
      disposition: Disposition;
      meeting_status: MeetingStatus;
      activity_type: ActivityType;
    };
    Views: Record<string, never>;
    Functions: {
      get_me: {
        Args: { p_user_id: string };
        Returns: Array<{
          user_id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          role: UserRole;
          workspace_id: string;
          workspace_name: string;
          workspace_slug: string;
          timezone: string;
          twilio_connected: boolean;
          twilio_from: string | null;
          twilio_edge: string | null;
          last_test_status: string | null;
        }>;
      };
      kpis: {
        Args: { p_workspace_id: string; p_since: string };
        Returns: Array<{
          calls_total: number;
          calls_connected: number;
          talk_time_sec: number;
          meetings_booked: number;
          leads_contacted: number;
        }>;
      };
      call_series: {
        Args: { p_workspace_id: string; p_days: number };
        Returns: Array<{
          day: string;
          calls: number;
          connected: number;
          talk_sec: number;
        }>;
      };
    };
    CompositeTypes: Record<string, never>;
  };
};

// ----- row helpers ---------------------------------------------
export type WorkspaceRow = Row["workspaces"];
export type UserRow = Row["users"];
export type SessionRow = Row["sessions"];
export type PushSubscriptionRow = Row["push_subscriptions"];
export type TwilioConfigRow = Row["twilio_configs"];
export type LeadRow = Row["leads"];
export type CallRow = Row["calls"];
export type MeetingRow = Row["meetings"];
export type SmsTemplateRow = Row["sms_templates"];
export type VoicemailDropRow = Row["voicemail_drops"];
export type ActivityLogRow = Row["activity_logs"];
export type TagRow = Row["tags"];
export type LeadTagRow = Row["lead_tags"];
