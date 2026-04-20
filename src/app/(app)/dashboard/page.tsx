import { KpiCards } from "@/components/dashboard/KpiCards";
import { CallsChart } from "@/components/analytics/CallsChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your outbound day at a glance.
        </p>
      </div>

      <KpiCards />

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <CallsChart days={14} />
        <Card className="rounded-xl border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle>Get started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Connect your Twilio account under Settings → Twilio.</p>
            <p>2. Import leads from CSV or add a few manually.</p>
            <p>3. Open the Dialer and make your first call.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
