"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/auth/client";

type Template = {
  id: string;
  name: string;
  body: string;
  variables: string[];
};

export default function SmsPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await authFetch("/api/sms/templates");
    if (res.ok) {
      const body = (await res.json()) as { rows: Template[] };
      setTemplates(body.rows);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await authFetch("/api/sms/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, body, variables: [] }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        if (err.error === "duplicate_name") {
          toast.error("A template with that name already exists");
        } else {
          toast.error("Couldn't save template");
        }
        return;
      }
      setName("");
      setBody("");
      toast.success("Template saved");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await authFetch(`/api/sms/templates/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Deleted");
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SMS templates</h1>
        <p className="text-sm text-muted-foreground">
          Reusable follow-up messages. Variables: {`{{firstName}}`}, {`{{company}}`}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <Card className="rounded-xl border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle>Library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates === null ? (
              <Skeleton className="h-16 w-full" />
            ) : templates.length === 0 ? (
              <div className="grid place-items-center rounded-lg border border-dashed border-border/60 py-10 text-sm text-muted-foreground">
                No templates yet. Create your first on the right.
              </div>
            ) : (
              templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{t.name}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {t.body}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(t.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle>New template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tname">Name</Label>
              <Input
                id="tname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Missed-you follow-up"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tbody">Message</Label>
              <Textarea
                id="tbody"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Hey {{firstName}}, tried reaching you regarding {{company}}'s website — free this afternoon?"
              />
            </div>
            <Button
              className="w-full"
              onClick={save}
              disabled={saving || !name.trim() || !body.trim()}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Save template
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
