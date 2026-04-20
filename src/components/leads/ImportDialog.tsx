"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useBulkImportLeads } from "@/hooks/useLeads";

type Result = Awaited<ReturnType<ReturnType<typeof useBulkImportLeads>["mutateAsync"]>>;

export function ImportDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const importer = useBulkImportLeads();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    if (!file) return;
    try {
      const res = await importer.mutateAsync(file);
      setResult(res);
      toast.success(`Imported ${res.inserted + res.updated} leads`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="h-3.5 w-3.5" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import leads</DialogTitle>
          <DialogDescription>
            Accepted columns: name / first_name / last_name, company, email,
            phone (required), website, niche / industry. Duplicates by phone
            are deduped per workspace.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Drop a .csv file here or
              </p>
              <Button
                variant="link"
                className="px-1"
                onClick={() => inputRef.current?.click()}
              >
                browse to select
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <p className="mt-1 font-mono text-xs">
                  {file.name} · {(file.size / 1024).toFixed(1)} KB
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Inserted" value={result.inserted} />
              <Stat label="Updated" value={result.updated} />
              <Stat label="Skipped" value={result.skipped} />
            </div>
            {result.errors.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded border border-border/60 bg-background/50 p-2 text-xs">
                {result.errors.map((e) => (
                  <div
                    key={`${e.row}-${e.reason}`}
                    className="flex justify-between gap-4"
                  >
                    <span className="text-muted-foreground">Row {e.row}</span>
                    <span className="font-mono">{e.reason}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <Button onClick={handleImport} disabled={!file || importer.isPending}>
              {importer.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Import
            </Button>
          ) : (
            <Button
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/60 py-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
