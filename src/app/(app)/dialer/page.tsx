import { Softphone } from "@/components/dialer/Softphone";

export const metadata = { title: "Dialer" };

export default function DialerPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dialer</h1>
        <p className="text-sm text-muted-foreground">
          Browser softphone powered by the Twilio Voice SDK.
        </p>
      </div>
      <Softphone />
    </div>
  );
}
