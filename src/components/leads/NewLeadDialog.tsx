"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateLead } from "@/hooks/useLeads";

const schema = z.object({
  firstName: z.string().trim().max(200).optional(),
  lastName: z.string().trim().max(200).optional(),
  company: z.string().trim().max(200).optional(),
  email: z.union([z.email(), z.string().length(0)]).optional(),
  phone: z.string().trim().min(5),
  website: z.string().trim().max(400).optional(),
  niche: z.string().trim().max(200).optional(),
});
type Values = z.infer<typeof schema>;

export function NewLeadDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreateLead();
  const form = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    try {
      await create.mutateAsync({
        firstName: values.firstName || undefined,
        lastName: values.lastName || undefined,
        company: values.company || undefined,
        email: values.email || undefined,
        phone: values.phone,
        website: values.website || undefined,
        niche: values.niche || undefined,
      });
      toast.success("Lead added");
      setOpen(false);
      form.reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "internal";
      if (msg === "duplicate_phone") {
        form.setError("phone", { message: "This phone is already in your list" });
      } else if (msg === "invalid_phone") {
        form.setError("phone", { message: "Enter a valid number" });
      } else {
        toast.error("Failed to add lead");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>
            Phone is required and will be normalized to E.164.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="space-y-1">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...form.register("firstName")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...form.register("lastName")} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" {...form.register("company")} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="+1 415 555 0100"
              {...form.register("phone")}
            />
            {form.formState.errors.phone ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.phone.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="niche">Niche</Label>
            <Input id="niche" {...form.register("niche")} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" {...form.register("website")} />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Save lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
