"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  Plug,
  ShieldCheck,
  Wifi,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/auth/client";

type Summary = {
  configured: boolean;
  accountSidMasked?: string | null;
  fromNumber?: string;
  edge?: string;
  recordCalls?: boolean;
  amdEnabled?: boolean;
  lastTestedAt?: string | null;
  lastTestStatus?: string | null;
};

type ConnectResponse = {
  account: {
    sid: string;
    friendlyName: string;
    status: string;
    type: string;
  };
  balance: {
    amount: string;
    currency: string;
  };
  numbers: Array<{
    sid: string;
    phoneNumber: string;
    friendlyName: string;
    voiceEnabled: boolean;
    smsEnabled: boolean;
  }>;
};

type TestResult = {
  ok: boolean;
  accountFriendlyName?: string;
  balance?: string;
  currency?: string;
  error?: string;
};

const credsSchema = z.object({
  accountSid: z
    .string()
    .trim()
    .regex(/^AC[0-9a-fA-F]{32}$/, "Starts with AC and is 34 chars"),
  authToken: z.string().trim().min(20, "Paste the Auth Token from Twilio"),
});
type CredsValues = z.infer<typeof credsSchema>;

export function TwilioConnectionForm() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [stage, setStage] = useState<"creds" | "pickNumber" | "done">("creds");
  const [connectResult, setConnectResult] = useState<ConnectResponse | null>(
    null,
  );
  const [credsCache, setCredsCache] = useState<CredsValues | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [lastTest, setLastTest] = useState<TestResult | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const form = useForm<CredsValues>({
    resolver: zodResolver(credsSchema),
    defaultValues: { accountSid: "", authToken: "" },
  });

  const isConnected = summary?.configured === true;

  async function refreshSummary() {
    const res = await authFetch("/api/settings/twilio");
    if (res.ok) {
      const body = (await res.json()) as Summary;
      setSummary(body);
      if (body.configured) setStage("done");
    }
  }

  useEffect(() => {
    (async () => {
      await refreshSummary();
      setLoadingSummary(false);
    })();
  }, []);

  // --- Stage 1: enter creds, fetch account + numbers ---
  async function handleConnect(values: CredsValues) {
    setConnecting(true);
    try {
      const res = await authFetch("/api/twilio/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await res.json().catch(() => ({}))) as
        | ConnectResponse
        | { error?: string; message?: string };
      if (!res.ok) {
        const err = body as { error?: string; message?: string };
        if (err.error === "invalid_credentials") {
          toast.error(
            err.message ??
              "Invalid Account SID or Auth Token. Copy them again from your Twilio dashboard.",
          );
        } else {
          toast.error(err.message ?? err.error ?? "Connection failed");
        }
        return;
      }
      const data = body as ConnectResponse;
      const voiceNumbers = data.numbers.filter((n) => n.voiceEnabled);
      if (voiceNumbers.length === 0) {
        toast.error(
          "No voice-enabled numbers found on this account. Buy a number in the Twilio Console first.",
        );
        return;
      }
      setConnectResult(data);
      setCredsCache(values);
      setSelectedNumber(voiceNumbers[0].phoneNumber);
      setStage("pickNumber");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setConnecting(false);
    }
  }

  // --- Stage 2: pick a number, server auto-provisions API Key + TwiML App ---
  async function handleFinish() {
    if (!credsCache || !selectedNumber) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/settings/twilio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountSid: credsCache.accountSid,
          authToken: credsCache.authToken,
          fromNumber: selectedNumber,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        if (body.error === "no_public_base_url") {
          toast.error(
            body.message ?? "Set a public base URL before saving.",
          );
        } else if (body.error === "number_not_voice_enabled") {
          toast.error("That number doesn't support voice. Pick another one.");
        } else if (body.error === "number_not_on_account") {
          toast.error("That number isn't on this account.");
        } else {
          toast.error(body.message ?? body.error ?? "Couldn't save.");
        }
        return;
      }
      toast.success("Twilio connected");
      setCredsCache(null);
      setConnectResult(null);
      form.reset();
      await refreshSummary();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setLastTest(null);
    try {
      const res = await authFetch("/api/twilio/test-connection", {
        method: "POST",
      });
      const body = (await res.json()) as TestResult;
      setLastTest(body);
      if (body.ok) {
        toast.success(
          `Connected · ${body.accountFriendlyName} · ${body.currency} ${body.balance}`,
        );
      } else {
        toast.error(`Test failed: ${body.error}`);
      }
      await refreshSummary();
    } catch {
      toast.error("Test failed: network error");
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    if (
      !window.confirm(
        "Disconnect Twilio from this workspace? Stored credentials will be deleted.",
      )
    )
      return;
    setDisconnecting(true);
    try {
      const res = await authFetch("/api/settings/twilio/disconnect", {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Twilio disconnected");
        setSummary({ configured: false });
        setStage("creds");
        setConnectResult(null);
        setCredsCache(null);
        setSelectedNumber(null);
      } else {
        toast.error("Couldn't disconnect");
      }
    } finally {
      setDisconnecting(false);
    }
  }

  if (loadingSummary) {
    return (
      <Card className="rounded-xl border-border/60 bg-card/60">
        <CardContent className="py-8">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // ----- CONNECTED view -----
  if (isConnected && stage === "done") {
    return (
      <Card className="rounded-xl border-border/60 bg-card/60">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>Twilio connected</CardTitle>
              <CardDescription>
                Your credentials are encrypted at rest with AES-256-GCM.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {summary?.lastTestStatus === "ok" ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Last test OK
              </Badge>
            ) : summary?.lastTestStatus ? (
              <Badge variant="destructive">
                <XCircle className="mr-1 h-3 w-3" /> Failed
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From number" value={summary?.fromNumber ?? "—"} mono />
            <Field label="Account SID" value={summary?.accountSidMasked ?? "—"} mono />
            {lastTest?.ok ? (
              <Field
                label="Balance"
                value={`${lastTest.currency} ${lastTest.balance}`}
              />
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wifi className="mr-2 h-3.5 w-3.5" />
              )}
              Test connection
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ----- PICK NUMBER view -----
  if (stage === "pickNumber" && connectResult) {
    const voiceNumbers = connectResult.numbers.filter((n) => n.voiceEnabled);
    return (
      <Card className="rounded-xl border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle>Pick a number to call from</CardTitle>
          <CardDescription>
            Connected to{" "}
            <span className="font-medium text-foreground">
              {connectResult.account.friendlyName}
            </span>
            {" · "}
            Balance {connectResult.balance.currency} {connectResult.balance.amount}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y divide-border/60 rounded-lg border border-border/60">
            {voiceNumbers.map((n) => {
              const selected = selectedNumber === n.phoneNumber;
              return (
                <button
                  key={n.sid}
                  type="button"
                  onClick={() => setSelectedNumber(n.phoneNumber)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                    selected ? "bg-primary/5" : "hover:bg-card"
                  }`}
                >
                  <div>
                    <div className="font-mono text-sm">{n.phoneNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {n.friendlyName}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {n.smsEnabled ? (
                      <Badge variant="secondary" className="text-[10px]">
                        SMS
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="text-[10px]">
                      Voice
                    </Badge>
                    {selected ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStage("creds");
                setConnectResult(null);
                setSelectedNumber(null);
              }}
            >
              Back
            </Button>
            <Button
              onClick={handleFinish}
              disabled={saving || !selectedNumber}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Finish setup
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ----- CREDS entry view -----
  return (
    <Card className="rounded-xl border-border/60 bg-card/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-4 w-4" /> Connect your Twilio
        </CardTitle>
        <CardDescription>
          Grab your Account SID and Auth Token from the{" "}
          <a
            href="https://console.twilio.com/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            Twilio Console
          </a>
          . We'll discover your numbers and set up the rest.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={form.handleSubmit(handleConnect)}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="accountSid">Account SID</Label>
            <Input
              id="accountSid"
              placeholder="AC…"
              autoComplete="off"
              className="font-mono"
              {...form.register("accountSid")}
            />
            {form.formState.errors.accountSid ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.accountSid.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="authToken">Auth Token</Label>
            <Input
              id="authToken"
              type="password"
              placeholder="••••••••"
              autoComplete="off"
              className="font-mono"
              {...form.register("authToken")}
            />
            {form.formState.errors.authToken ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.authToken.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2 flex items-center justify-end">
            <Button type="submit" disabled={connecting}>
              {connecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Connect
            </Button>
          </div>
        </form>

        <Alert className="border-border/60 bg-background/40">
          <Plug className="h-4 w-4" />
          <AlertTitle>What happens next</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            We validate your credentials, show your voice-enabled numbers, and
            auto-provision an API Key &amp; TwiML App named "Dialer by LaunchCraft"
            on your Twilio account. Everything is encrypted at rest.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-0.5 text-sm ${mono ? "font-mono" : "font-medium"}`}
      >
        {value}
      </div>
    </div>
  );
}
