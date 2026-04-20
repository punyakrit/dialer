"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ShieldCheck, Wifi, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { authFetch } from "@/lib/auth/client";

const EDGE_OPTIONS = [
  { value: "singapore", label: "Singapore (recommended for India → US)" },
  { value: "tokyo", label: "Tokyo" },
  { value: "sydney", label: "Sydney" },
  { value: "ashburn", label: "Ashburn (US East)" },
  { value: "umatilla", label: "Umatilla (US West)" },
  { value: "dublin", label: "Dublin" },
  { value: "frankfurt", label: "Frankfurt" },
  { value: "roaming", label: "Roaming (auto)" },
] as const;

const schema = z.object({
  accountSid: z
    .string()
    .trim()
    .regex(/^AC[0-9a-fA-F]{32}$/, "Starts with AC and is 34 chars"),
  apiKeySid: z
    .string()
    .trim()
    .regex(/^SK[0-9a-fA-F]{32}$/, "Starts with SK and is 34 chars"),
  apiKeySecret: z.string().trim().min(10, "Required"),
  twimlAppSid: z
    .string()
    .trim()
    .regex(/^AP[0-9a-fA-F]{32}$/, "Starts with AP and is 34 chars"),
  authToken: z.string().trim().optional(),
  fromNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, "E.164 only, e.g. +14155552671"),
  edge: z.string().min(1),
  recordCalls: z.boolean(),
  amdEnabled: z.boolean(),
});
type Values = z.infer<typeof schema>;

type Summary = {
  configured: boolean;
  accountSidMasked?: string | null;
  apiKeySidMasked?: string | null;
  apiKeySecretMasked?: string | null;
  twimlAppSidMasked?: string | null;
  authTokenMasked?: string | null;
  fromNumber?: string;
  edge?: string;
  recordCalls?: boolean;
  amdEnabled?: boolean;
  lastTestedAt?: string | null;
  lastTestStatus?: string | null;
};

type TestResult = {
  ok: boolean;
  accountFriendlyName?: string;
  balance?: string;
  currency?: string;
  error?: string;
};

export function TwilioConnectionForm() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [lastTest, setLastTest] = useState<TestResult | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountSid: "",
      apiKeySid: "",
      apiKeySecret: "",
      twimlAppSid: "",
      authToken: "",
      fromNumber: "",
      edge: "singapore",
      recordCalls: true,
      amdEnabled: true,
    },
  });

  useEffect(() => {
    (async () => {
      const res = await authFetch("/api/settings/twilio");
      if (res.ok) {
        const body = (await res.json()) as Summary;
        setSummary(body);
        if (body.configured) {
          form.reset({
            accountSid: "",
            apiKeySid: "",
            apiKeySecret: "",
            twimlAppSid: "",
            authToken: "",
            fromNumber: body.fromNumber ?? "",
            edge: body.edge ?? "singapore",
            recordCalls: body.recordCalls ?? true,
            amdEnabled: body.amdEnabled ?? true,
          });
        }
      }
      setLoadingSummary(false);
    })();
    // form.reset is stable within react-hook-form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: Values) {
    setSubmitting(true);
    try {
      const res = await authFetch("/api/settings/twilio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          authToken: values.authToken?.trim() || undefined,
        }),
      });
      if (!res.ok) {
        toast.error("Save failed. Check the fields and try again.");
        return;
      }
      toast.success("Twilio credentials saved");
      // Refresh masked summary.
      const s = await authFetch("/api/settings/twilio");
      if (s.ok) setSummary((await s.json()) as Summary);
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
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
          `Connected: ${body.accountFriendlyName} — ${body.currency} ${body.balance}`,
        );
      } else {
        toast.error(`Test failed: ${body.error}`);
      }
    } catch {
      toast.error("Test failed: network error");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      {summary?.configured ? (
        <Card className="rounded-xl border-border/60 bg-card/60">
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Connected</CardTitle>
                <CardDescription>
                  Credentials encrypted at rest with AES-256-GCM.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {summary.lastTestStatus === "ok" ? (
                <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Last test OK
                </Badge>
              ) : summary.lastTestStatus ? (
                <Badge variant="destructive">
                  <XCircle className="mr-1 h-3 w-3" /> {summary.lastTestStatus}
                </Badge>
              ) : null}
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
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label="Account SID" value={summary.accountSidMasked} />
            <Field label="API Key SID" value={summary.apiKeySidMasked} />
            <Field label="API Key Secret" value={summary.apiKeySecretMasked} />
            <Field label="TwiML App SID" value={summary.twimlAppSidMasked} />
            <Field label="Auth Token" value={summary.authTokenMasked ?? "—"} />
            <Field label="From Number" value={summary.fromNumber} />
            <Field label="Edge" value={summary.edge} />
            {lastTest?.ok ? (
              <Field
                label="Balance"
                value={`${lastTest.currency} ${lastTest.balance}`}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-xl border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle>
            {summary?.configured ? "Replace credentials" : "Connect Twilio"}
          </CardTitle>
          <CardDescription>
            You can rotate any SID/Secret here. Existing values remain in use
            until you save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="accountSid">Account SID</Label>
              <Input
                id="accountSid"
                placeholder="AC..."
                autoComplete="off"
                {...form.register("accountSid")}
              />
              {form.formState.errors.accountSid ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.accountSid.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apiKeySid">API Key SID</Label>
              <Input
                id="apiKeySid"
                placeholder="SK..."
                autoComplete="off"
                {...form.register("apiKeySid")}
              />
              {form.formState.errors.apiKeySid ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.apiKeySid.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apiKeySecret">API Key Secret</Label>
              <Input
                id="apiKeySecret"
                type="password"
                placeholder="••••••••"
                autoComplete="off"
                {...form.register("apiKeySecret")}
              />
              {form.formState.errors.apiKeySecret ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.apiKeySecret.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="twimlAppSid">TwiML App SID</Label>
              <Input
                id="twimlAppSid"
                placeholder="AP..."
                autoComplete="off"
                {...form.register("twimlAppSid")}
              />
              {form.formState.errors.twimlAppSid ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.twimlAppSid.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fromNumber">From number (E.164)</Label>
              <Input
                id="fromNumber"
                placeholder="+14155552671"
                autoComplete="off"
                {...form.register("fromNumber")}
              />
              {form.formState.errors.fromNumber ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.fromNumber.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="authToken">
                Auth Token{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (optional — only needed to validate Twilio webhook signatures)
                </span>
              </Label>
              <Input
                id="authToken"
                type="password"
                placeholder="••••••••"
                autoComplete="off"
                {...form.register("authToken")}
              />
            </div>

            <Separator className="sm:col-span-2" />

            <div className="space-y-1.5">
              <Label>Edge location</Label>
              <Select
                value={form.watch("edge")}
                onValueChange={(v) => form.setValue("edge", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDGE_OPTIONS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div>
                  <Label className="text-sm">Record calls</Label>
                  <p className="text-xs text-muted-foreground">record-from-answer</p>
                </div>
                <Switch
                  checked={form.watch("recordCalls")}
                  onCheckedChange={(v) => form.setValue("recordCalls", v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div>
                  <Label className="text-sm">AMD (voicemail detect)</Label>
                  <p className="text-xs text-muted-foreground">DetectMessageEnd</p>
                </div>
                <Switch
                  checked={form.watch("amdEnabled")}
                  onCheckedChange={(v) => form.setValue("amdEnabled", v)}
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={!summary?.configured || testing}
              >
                {testing ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wifi className="mr-2 h-3.5 w-3.5" />
                )}
                Test connection
              </Button>
              <Button type="submit" disabled={submitting || loadingSummary}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save credentials
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-sm">{value ?? "—"}</div>
    </div>
  );
}
