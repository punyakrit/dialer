"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Voicemail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/auth/client";

type Drop = {
  id: string;
  name: string;
  storage_path: string;
  created_at: string;
};

export default function VoicemailsPage() {
  const [drops, setDrops] = useState<Drop[] | null>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await authFetch("/api/voicemails");
    if (res.ok) {
      const body = (await res.json()) as { rows: Drop[] };
      setDrops(body.rows);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function upload() {
    if (!file || !name.trim()) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", name.trim());
      const res = await authFetch("/api/voicemails/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        toast.error(err.message ?? err.error ?? "Upload failed");
        return;
      }
      toast.success("Voicemail uploaded");
      setName("");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await load();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Voicemail drops</h1>
        <p className="text-sm text-muted-foreground">
          Record a 20-30 second mp3. During a call, the Drop button appears if
          AMD detects a voicemail.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <Card className="rounded-xl border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle>Library</CardTitle>
          </CardHeader>
          <CardContent>
            {drops === null ? (
              <Skeleton className="h-20 w-full" />
            ) : drops.length === 0 ? (
              <div className="grid place-items-center rounded-lg border border-dashed border-border/60 py-10 text-sm text-muted-foreground">
                No drops yet.
              </div>
            ) : (
              <div className="space-y-2">
                {drops.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Voicemail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{d.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle>Upload mp3</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="vname">Name</Label>
              <Input
                id="vname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Standard voicemail"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vfile">Audio file</Label>
              <Input
                id="vfile"
                ref={inputRef}
                type="file"
                accept="audio/mpeg,audio/mp3,.mp3"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <p className="text-xs text-muted-foreground">
                  {file.name} · {(file.size / 1024).toFixed(1)} KB
                </p>
              ) : null}
            </div>
            <Button
              className="w-full"
              onClick={upload}
              disabled={uploading || !file || !name.trim()}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
