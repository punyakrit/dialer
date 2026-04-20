import Link from "next/link";
import { ArrowRight, KeyRound, Headphones, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    href: "/settings/twilio",
    title: "Twilio credentials",
    body: "Connect your Account SID, API Key & Secret, TwiML App.",
    icon: KeyRound,
  },
  {
    href: "/settings/audio",
    title: "Audio devices",
    body: "Choose your microphone, speakers and test ringer.",
    icon: Headphones,
  },
  {
    href: "/settings/notifications",
    title: "Notifications",
    body: "Browser notifications for ringing, recordings, and alerts.",
    icon: Bell,
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <Card className="rounded-xl border-border/60 bg-card/60 transition-colors hover:border-border">
              <CardHeader className="flex-row items-center gap-3 pb-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
                <CardTitle className="flex-1">{s.title}</CardTitle>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {s.body}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
