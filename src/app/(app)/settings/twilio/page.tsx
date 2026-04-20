import { TwilioConnectionForm } from "@/components/settings/TwilioConnectionForm";

export const metadata = { title: "Twilio" };

export default function TwilioSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Twilio</h1>
        <p className="text-sm text-muted-foreground">
          Bring your own Twilio account. Account SID, API Key, Secret, TwiML App
          SID and (optionally) Auth Token are AES-256-GCM encrypted at rest and
          only decrypted server-side at call time.
        </p>
      </div>
      <TwilioConnectionForm />
    </div>
  );
}
