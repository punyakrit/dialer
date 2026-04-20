import { KpiCards } from "@/components/dashboard/KpiCards";
import { CallsChart } from "@/components/analytics/CallsChart";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Connect rate, talk time, meetings booked.
        </p>
      </div>
      <KpiCards />
      <CallsChart days={30} />
    </div>
  );
}
