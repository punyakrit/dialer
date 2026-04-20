import { QueuePanel } from "@/components/power-dialer/QueuePanel";

export const metadata = { title: "Power dialer" };

export default function PowerDialerPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Power Dialer</h1>
        <p className="text-sm text-muted-foreground">
          Auto-dial through a queue of leads without re-typing a single number.
        </p>
      </div>
      <QueuePanel />
    </div>
  );
}
