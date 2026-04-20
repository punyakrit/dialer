"use client";

import { useState } from "react";
import { LeadFilters } from "@/components/leads/LeadFilters";
import { LeadTable } from "@/components/leads/LeadTable";
import { ImportDialog } from "@/components/leads/ImportDialog";
import { NewLeadDialog } from "@/components/leads/NewLeadDialog";
import type { LeadStatus } from "@/types/db";

export default function LeadsPage() {
  const [status, setStatus] = useState<LeadStatus | null>(null);
  const [q, setQ] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Your pipeline. Click any row to call.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportDialog />
          <NewLeadDialog />
        </div>
      </div>

      <LeadFilters
        status={status}
        q={q}
        onStatusChange={setStatus}
        onSearchChange={setQ}
      />

      <LeadTable status={status} q={q} />
    </div>
  );
}
