import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AudioSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Audio devices</h1>
      <Card className="rounded-xl border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle>Input & output</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Device pickers wire into the Twilio Voice SDK in Phase 6.
        </CardContent>
      </Card>
    </div>
  );
}
