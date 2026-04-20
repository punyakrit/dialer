"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth.store";

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
  workspaceName: z.string().trim().min(1, "Enter a workspace name").max(120),
  email: z.email("Enter a valid email"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .max(200, "Password is too long"),
});
type Values = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", workspaceName: "", email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        if (err.error === "email_taken") {
          form.setError("email", {
            message: "An account with that email already exists",
          });
        } else if (err.error === "validation_error") {
          toast.error("Check the form and try again");
        } else {
          toast.error("Sign-up failed. Try again.");
        }
        return;
      }
      const body = (await res.json()) as {
        user: {
          id: string;
          email: string;
          name: string | null;
          role: "OWNER" | "ADMIN" | "AGENT";
        };
        workspace: { id: string; name: string; slug: string };
        accessToken: string;
        accessTokenTtlSec: number;
      };
      setAuth({
        user: body.user,
        workspace: body.workspace,
        accessToken: body.accessToken,
        accessTokenTtlSec: body.accessTokenTtlSec,
      });
      toast.success("Welcome to Dialer by LaunchCraft");
      router.replace("/dashboard");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" placeholder="Alex Chen" {...form.register("name")} />
          {form.formState.errors.name ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workspaceName">Workspace</Label>
          <Input
            id="workspaceName"
            placeholder="Acme Media"
            {...form.register("workspaceName")}
          />
          {form.formState.errors.workspaceName ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.workspaceName.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="alex@acme.com"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Create account
      </Button>
    </form>
  );
}
