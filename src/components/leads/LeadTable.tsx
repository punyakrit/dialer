"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteLead, useLeads } from "@/hooks/useLeads";
import { useDialerStore } from "@/stores/dialer.store";
import { LeadStatusBadge } from "./LeadStatusBadge";
import type { LeadStatus } from "@/types/db";

export type LeadTableProps = {
  status: LeadStatus | null;
  q: string;
};

const PAGE_SIZE = 25;

export function LeadTable({ status, q }: LeadTableProps) {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const deleteLead = useDeleteLead();
  const selectLead = useDialerStore((s) => s.selectLead);
  const setBuffer = useDialerStore((s) => s.set);

  const { data, isLoading, isFetching } = useLeads({
    status,
    q,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  function callLead(phone: string, leadId: string) {
    selectLead(leadId);
    setBuffer(phone);
    router.push("/dialer");
  }

  async function removeLead(id: string) {
    await deleteLead.mutateAsync(id);
    toast.success("Lead deleted");
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/60 p-4">
        <Skeleton className="h-10 w-full" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border/60 bg-card/30 py-16 text-sm text-muted-foreground">
        {q || status
          ? "No leads match that filter."
          : "No leads yet — import a CSV or add one manually."}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/40">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[120px] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((lead) => {
            const name =
              [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim() ||
              "—";
            return (
              <TableRow key={lead.id} className="group">
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell>{lead.company ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{lead.phone}</TableCell>
                <TableCell className="text-xs">{lead.email ?? "—"}</TableCell>
                <TableCell>
                  <LeadStatusBadge status={lead.status} />
                </TableCell>
                <TableCell className="flex items-center justify-end gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                    onClick={() => callLead(lead.phone, lead.id)}
                  >
                    <Phone className="h-3.5 w-3.5" /> Call
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label="More"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => removeLead(lead.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
        <span>
          {total === 0 ? 0 : page * PAGE_SIZE + 1}–
          {Math.min(total, (page + 1) * PAGE_SIZE)} of {total}
          {isFetching ? " · updating" : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
