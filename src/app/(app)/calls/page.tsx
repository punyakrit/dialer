import { CallLogTable } from "@/components/calls/CallLogTable";

export const metadata = { title: "Call logs" };

export default function CallsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Call logs</h1>
        <p className="text-sm text-muted-foreground">
          Every call this workspace has placed or received.
        </p>
      </div>
      <CallLogTable />
    </div>
  );
}
