# Dialer by LaunchCraft

Browser-based outbound calling SaaS for lead-gen & web-design agencies. Built on
Twilio Voice SDK v2, Next.js 15/16 App Router, Supabase (native SDK, no ORM),
with Clerk for authentication.

Think OpenPhone + Aircall + JustCall — but bring-your-own-Twilio, so there's no
per-seat markup.

- **Production:** <https://dialer.launchcraft.studio>
- **Parent brand:** <https://launchcraft.studio> (Dialer is a LaunchCraft product)

## Stack

- **Framework:** Next.js App Router · TypeScript · Tailwind 4 · shadcn/ui
- **Database:** Supabase Postgres in a dedicated `dialer` schema + Supabase
  Storage (recordings, voicemail mp3s). Native `@supabase/supabase-js`, SQL
  migrations, no ORM.
- **Auth:** custom JWT (`jose` + `bcryptjs`) + Google OAuth (`google-auth-library`)
- **Telephony:** `@twilio/voice-sdk` (browser Device) + `twilio` server SDK
- **State:** TanStack Query (server) + Zustand (device / active call / UI)
- **Other:** Framer Motion, `libphonenumber-js`, Papaparse, Resend (optional),
  `next-pwa`, web-push (VAPID)

## Quick start (local dev)

### 1. Install and run

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The landing page renders at <http://localhost:3000>. Authenticated routes live
under the `/dashboard`, `/dialer`, `/leads`, etc. paths.

### 2. Generate secrets

```bash
# 32-byte AES-256-GCM key for Twilio credential encryption at rest
pnpm keys:encryption

# 48-byte JWT signing secrets (access + refresh)
pnpm keys:jwt   # run twice

# Web Push VAPID pair (required only if you want browser push notifications)
pnpm keys:vapid
```

Paste the output into `.env.local`.

### 3. Supabase

```bash
export SUPABASE_ACCESS_TOKEN=...        # https://supabase.com/dashboard/account/tokens
export SUPABASE_PROJECT_REF=abcdefghij  # from the project URL
pnpm db:link
pnpm db:push        # applies everything in supabase/migrations/
pnpm db:types       # generates src/types/db.ts from the dialer schema
```

In the Supabase Dashboard go to **API → Exposed schemas** and add
`dialer`. Without this the JS client cannot reach the schema.

### 4. Twilio (once)

In the Twilio Console:

1. Buy a voice-enabled US number (Phone Numbers → Buy a number).
2. Create an API Key & Secret (Account → API keys & tokens → "Standard"). Copy
   both; the secret is only shown once.
3. Create a TwiML App (Voice → TwiML → TwiML Apps). For Voice Request URL use
   your deployed `https://<domain>/api/twilio/voice/outbound`. Copy the App SID.
4. Enable US geo permissions (Voice → Settings → Geo Permissions).

In the app, open **Settings → Twilio** and paste:

- Account SID (`AC…`)
- API Key SID (`SK…`)
- API Key Secret
- TwiML App SID (`AP…`)
- Auth Token (dashboard)
- From Number (`+1…`)

Credentials are stored AES-256-GCM encrypted at rest.

### 5. Dev webhook tunnel

Twilio needs a public HTTPS URL to reach your webhook routes. In another terminal:

```bash
ngrok http 3000
# or: cloudflared tunnel --url http://localhost:3000
```

Copy the HTTPS URL, then rotate your TwiML App's Voice Request URL to match:

```bash
pnpm twiml:set-url https://<your-ngrok>.ngrok.app/api/twilio/voice/outbound
```

## Project layout

```
src/
├── app/                        Next.js App Router
│   ├── (auth)/                 Login, register (JWT-less)
│   ├── (app)/                  Authenticated shell: dashboard, dialer, leads, ...
│   └── api/                    Route handlers (auth, twilio webhooks, CRUD)
├── components/
│   ├── ui/                     shadcn/ui primitives
│   ├── shell/                  AppShell, Sidebar, Topbar, ActiveCallDrawer
│   ├── dialer/                 Keypad, CallControls, CallTimer, Notes
│   └── ...
├── lib/
│   ├── auth/                   JWT, bcrypt, Google OAuth, guards
│   ├── crypto/                 AES-256-GCM for Twilio credential ciphertext
│   ├── twilio/                 server (REST + token + TwiML), client (DeviceManager)
│   ├── supabase/               admin (service-role) client wrappers
│   └── ...
├── server/
│   ├── repositories/           Typed Supabase data-access wrappers
│   ├── services/               Business logic called by route handlers
│   └── webhooks/               Status / recording / AMD handlers
├── hooks/                      React Query + Zustand bindings
├── stores/                     Zustand stores
├── types/                      db.ts (generated), twilio.ts, api.ts
└── middleware.ts               JWT gate on /api/*
supabase/
├── config.toml                 Supabase CLI config
└── migrations/                 SQL migrations (custom `dialer` schema)
```

## Deployment (Vercel)

- Node runtime is required for Twilio webhook routes; every webhook handler
  exports `export const runtime = 'nodejs'`.
- Vercel Hobby caps route execution at 10s; recording download/upload to
  Supabase Storage can exceed that. Use Pro (60s) for production, or keep the
  fire-and-forget pattern that relies on Twilio's webhook retries for
  idempotency (`calls.twilio_call_sid` is unique).
- HTTPS is mandatory — the browser blocks `getUserMedia` on non-secure origins.

## Build order (10 phases)

See `~/.claude/plans/you-are-a-senior-soft-hellman.md` for the full plan.

1. Scaffold + Supabase link *(this commit)*
2. SQL migrations (core) + Supabase client + JWT auth
3. Remaining migrations + repositories + seed
4. Twilio Connection Panel (encryption + test connection)
5. Twilio backend (token + TwiML + webhooks)
6. DeviceManager + basic dialer
7. Leads CRM + CSV import
8. Power dialer + call logs + analytics
9. SMS + voicemail drop + meetings
10. Polish + PWA + browser notifications
