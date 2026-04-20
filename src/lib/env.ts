import { z } from "zod";

/** Treat empty strings in .env files as "not provided" so optional URL fields
 * don't fail parsing when a key is present but blank. */
const optionalUrl = z
  .union([z.string().url(), z.string().length(0), z.undefined()])
  .transform((v) => (v === "" || v === undefined ? undefined : v));

const optionalString = z
  .union([z.string().min(1), z.string().length(0), z.undefined()])
  .transform((v) => (v === "" || v === undefined ? undefined : v));

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_DB_SCHEMA: z.string().default("dialer"),
  SUPABASE_STORAGE_BUCKET_RECORDINGS: z.string().default("recordings"),
  SUPABASE_STORAGE_BUCKET_VOICEMAILS: z.string().default("voicemail-drops"),

  // Auth — custom JWT (email/password, no social)
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SEC: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_SEC: z.coerce.number().int().positive().default(604800),

  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be 64 hex chars (32 bytes)"),

  VAPID_PUBLIC_KEY: optionalString,
  VAPID_PRIVATE_KEY: optionalString,
  VAPID_SUBJECT: optionalString,

  RESEND_API_KEY: optionalString,

  TWILIO_STATUS_CALLBACK_BASE_URL: optionalUrl,
  DEV_SKIP_WEBHOOK_SIGNATURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

const isServer = typeof window === "undefined";

function parseServer() {
  if (!isServer) {
    return null as unknown as z.infer<typeof serverSchema>;
  }
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "Invalid server environment variables:",
      z.treeifyError(parsed.error),
    );
    throw new Error("Invalid server environment variables");
  }
  return parsed.data;
}

function parseClient() {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!parsed.success) {
    console.error(
      "Invalid client environment variables:",
      z.treeifyError(parsed.error),
    );
    throw new Error("Invalid client environment variables");
  }
  return parsed.data;
}

export const serverEnv = parseServer();
export const clientEnv = parseClient();

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
