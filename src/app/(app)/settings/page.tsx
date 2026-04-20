"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  BellOff,
  Check,
  ChevronRight,
  Copy,
  Headphones,
  KeyRound,
  LogOut,
  ShieldCheck,
  Sparkles,
  Building2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { authFetch, logoutClient } from "@/lib/auth/client";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

type TwilioStatus =
  | { configured: true; fromNumber?: string; lastTestStatus?: string | null }
  | { configured: false };

type PermState = "granted" | "denied" | "prompt" | "default" | "unsupported";
type Tone = "ok" | "warn" | "bad" | "muted";
type Status = { text: string; tone: Tone };

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const workspace = useAuthStore((s) => s.workspace);

  const [twilio, setTwilio] = useState<TwilioStatus | null>(null);
  const [mic, setMic] = useState<PermState>("prompt");
  const [notif, setNotif] = useState<PermState>("default");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await authFetch("/api/settings/twilio");
      if (!alive) return;
      if (res.ok) setTwilio((await res.json()) as TwilioStatus);
      else setTwilio({ configured: false });
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("permissions" in navigator) ||
      !navigator.permissions?.query
    ) {
      setMic("unsupported");
      return;
    }
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((p) => setMic(p.state as PermState))
      .catch(() => setMic("unsupported"));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setNotif("unsupported");
      return;
    }
    setNotif(Notification.permission as PermState);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logoutClient();
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  const twilioStatus: Status =
    twilio === null
      ? { text: "Checking", tone: "muted" }
      : twilio.configured
        ? { text: twilio.fromNumber ?? "Connected", tone: "ok" }
        : { text: "Not connected", tone: "warn" };

  const micStatus: Status =
    mic === "granted"
      ? { text: "Granted", tone: "ok" }
      : mic === "denied"
        ? { text: "Blocked", tone: "bad" }
        : mic === "unsupported"
          ? { text: "Unsupported", tone: "muted" }
          : { text: "Will prompt", tone: "muted" };

  const notifStatus: Status =
    notif === "granted"
      ? { text: "Enabled", tone: "ok" }
      : notif === "denied"
        ? { text: "Blocked", tone: "bad" }
        : notif === "unsupported"
          ? { text: "Unsupported", tone: "muted" }
          : { text: "Off", tone: "muted" };

  const initials = (() => {
    if (!user) return "?";
    const parts = (user.name ?? user.email).trim().split(/\s+/);
    return (
      (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[1]?.[0] ?? "") : "")
    );
  })().toUpperCase();

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your workspace, credentials, and device preferences.
        </p>
      </motion.div>

      {/* ---------- Profile strip ---------- */}
      <motion.section
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="relative mb-10 overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-5"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(80%_120%_at_0%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_60%)]"
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-12 w-12 ring-2 ring-border/60">
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[15px] font-semibold tracking-tight">
                {user?.name ?? "—"}
              </span>
              {user?.role ? (
                <Badge
                  variant="secondary"
                  className="border-0 bg-primary/10 text-[10px] font-medium uppercase tracking-[0.12em] text-primary"
                >
                  {user.role}
                </Badge>
              ) : null}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="truncate">{user?.email ?? "—"}</span>
              {user?.email ? (
                <button
                  type="button"
                  onClick={() => copy(user!.email, "Email")}
                  className="rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground"
                  aria-label="Copy email"
                >
                  <Copy className="h-3 w-3" />
                </button>
              ) : null}
              <span className="text-muted-foreground/40">·</span>
              <Building2 className="h-3 w-3" />
              <span className="truncate font-medium text-foreground/80">
                {workspace?.name ?? "—"}
              </span>
              {workspace?.slug ? (
                <span className="truncate font-mono text-[10px] text-muted-foreground/60">
                  {workspace.slug}
                </span>
              ) : null}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            disabled={signingOut}
            className="shrink-0 self-start sm:self-center"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </motion.section>

      {/* ---------- Integrations group ---------- */}
      <Group label="Integrations" delay={0.1}>
        <Row
          href="/settings/twilio"
          icon={<KeyRound className="h-4 w-4" />}
          iconTint="bg-sky-500/10 text-sky-400"
          accent="bg-sky-500/60"
          title="Twilio"
          subtitle="Account SID + Auth Token. We provision the rest automatically."
          status={twilioStatus}
        />
      </Group>

      {/* ---------- Device group ---------- */}
      <Group label="Device" delay={0.15}>
        <Row
          href="/settings/audio"
          icon={<Headphones className="h-4 w-4" />}
          iconTint="bg-violet-500/10 text-violet-400"
          accent="bg-violet-500/60"
          title="Audio devices"
          subtitle="Pick the microphone and speakers the softphone uses."
          status={micStatus}
        />
        <Row
          href="/settings/notifications"
          icon={<Bell className="h-4 w-4" />}
          iconTint="bg-emerald-500/10 text-emerald-400"
          accent="bg-emerald-500/60"
          title="Notifications"
          subtitle="Browser alerts for ringing, recordings, and low balance."
          status={notifStatus}
        />
      </Group>

      {/* ---------- System (read-only) ---------- */}
      <Group label="System" delay={0.2}>
        <InfoRow
          icon={<ShieldCheck className="h-4 w-4" />}
          iconTint="bg-emerald-500/10 text-emerald-400"
          title="Credentials at rest"
          value="AES-256-GCM"
        />
        <InfoRow
          icon={
            notif === "granted" ? (
              <Bell className="h-4 w-4" />
            ) : (
              <BellOff className="h-4 w-4" />
            )
          }
          iconTint={
            notif === "granted"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-muted text-muted-foreground"
          }
          title="Web push"
          value={
            notif === "granted"
              ? "Active"
              : notif === "denied"
                ? "Blocked"
                : "Ask to enable"
          }
        />
        <InfoRow
          icon={<Sparkles className="h-4 w-4" />}
          iconTint="bg-primary/10 text-primary"
          title="Tenant"
          value={
            <span className="inline-flex items-center gap-2">
              <span className="font-mono text-[12px]">
                {workspace?.slug ?? "—"}
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span>{user?.role ?? "—"}</span>
            </span>
          }
        />
      </Group>
    </div>
  );
}

/* ---------- helpers ------------------------------------------------- */

function Group({
  label,
  delay = 0,
  children,
}: {
  label: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className="mb-8"
    >
      <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 divide-y divide-border/60">
        {children}
      </div>
    </motion.section>
  );
}

function Row({
  href,
  icon,
  iconTint,
  accent,
  title,
  subtitle,
  status,
}: {
  href: string;
  icon: ReactNode;
  iconTint: string;
  accent: string;
  title: string;
  subtitle: string;
  status: Status;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-4 px-4 py-4 transition-colors hover:bg-accent/30"
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full opacity-0 transition-opacity group-hover:opacity-100",
          accent,
          "w-0.5",
        )}
      />
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-[1.04]",
          iconTint,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium tracking-tight">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusPill status={status} />
        <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
    </Link>
  );
}

function InfoRow({
  icon,
  iconTint,
  title,
  value,
}: {
  icon: ReactNode;
  iconTint: string;
  title: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          iconTint,
        )}
      >
        {icon}
      </div>
      <div className="flex-1 text-[14px] font-medium tracking-tight">
        {title}
      </div>
      <div className="text-sm text-muted-foreground">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const cls = {
    ok: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    warn: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    bad: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
    muted: "bg-muted text-muted-foreground ring-border/40",
  }[status.tone];
  const dotCls = {
    ok: "bg-emerald-400",
    warn: "bg-amber-400",
    bad: "bg-rose-400",
    muted: "bg-muted-foreground/60",
  }[status.tone];

  const icon =
    status.tone === "ok" ? (
      <Check className="h-3 w-3" />
    ) : status.tone === "bad" ? (
      <X className="h-3 w-3" />
    ) : (
      <span className={cn("h-1.5 w-1.5 rounded-full", dotCls)} />
    );

  return (
    <span
      className={cn(
        "inline-flex max-w-[180px] items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1",
        cls,
      )}
    >
      {icon}
      <span className="truncate">{status.text}</span>
    </span>
  );
}
