import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      <Card className="rounded-xl border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle>Browser alerts</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Permission flow, push subscribe and opt-ins land in Phase 10.
        </CardContent>
      </Card>
    </div>
  );
}
