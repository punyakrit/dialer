import { TwilioConnectionForm } from "@/components/settings/TwilioConnectionForm";

export const metadata = { title: "Twilio" };

export default function TwilioSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Twilio</h1>
        <p className="text-sm text-muted-foreground">
          Paste your Account SID and Auth Token — we'll take care of the rest.
        </p>
      </div>
      <TwilioConnectionForm />
    </div>
  );
}
