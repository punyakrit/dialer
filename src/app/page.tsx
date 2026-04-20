import Link from "next/link";
import { ArrowRight, PhoneCall, Users, BarChart3, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PARENT_URL = "https://launchcraft.studio";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent),radial-gradient(35%_40%_at_100%_100%,color-mix(in_oklch,var(--chart-1)_14%,transparent),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_60%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_60%,transparent)_1px,transparent_1px)] bg-[size:44px_44px]"
      />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Dialer by LaunchCraft home">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <PhoneCall className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight">Dialer</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              by LaunchCraft
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <a
            href={PARENT_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden text-xs text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            launchcraft.studio ↗
          </a>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">
              Get started <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-24 text-center">
          <Badge variant="secondary" className="mb-5 rounded-full px-3 py-1">
            A LaunchCraft product · Built on Twilio Voice
          </Badge>
          <h1 className="mx-auto max-w-3xl text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
            The browser dialer your outbound team will actually use.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
            Call US leads from a premium softphone, power through lists, and keep
            every call, note, and meeting in one place. Connect your own Twilio
            number — no per-seat markup.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Button asChild size="lg" className="h-11 px-6">
              <Link href="/register">
                Start free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-6">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
            >
              <div className="mb-4 grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-4 w-4" />
              </div>
              <div className="font-medium tracking-tight">{f.title}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>
            © {new Date().getFullYear()} Dialer · A{" "}
            <a
              href={PARENT_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              LaunchCraft
            </a>{" "}
            product
          </span>
          <span>Bring your own Twilio · US calling</span>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: PhoneCall,
    title: "Premium softphone",
    body: "Keypad, mic/speaker pick, mute, hold, DTMF, and live notes — all in the browser.",
  },
  {
    icon: Users,
    title: "CRM & power dialer",
    body: "Import CSV leads, auto-dial a queue, and track every disposition to close.",
  },
  {
    icon: BarChart3,
    title: "Analytics that matter",
    body: "Connect rate, talk time, meetings booked, best calling hour — not vanity metrics.",
  },
  {
    icon: Shield,
    title: "Your Twilio, your data",
    body: "Credentials encrypted at rest. Bring your own number. No per-seat markup.",
  },
] as const;
