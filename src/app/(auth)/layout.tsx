import type { ReactNode } from "react";
import Link from "next/link";
import { PhoneCall } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent)]"
      />
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2.5 text-sm font-medium"
          aria-label="Dialer by LaunchCraft home"
        >
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <PhoneCall className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span>Dialer</span>
            <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              by LaunchCraft
            </span>
          </div>
        </Link>
        {children}
      </div>
    </div>
  );
}
