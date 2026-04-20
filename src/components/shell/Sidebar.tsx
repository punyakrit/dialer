"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PhoneCall,
  Users,
  ListChecks,
  History,
  CalendarCheck2,
  MessageSquare,
  Voicemail,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeviceStatusChip } from "@/components/dialer/DeviceStatusChip";

type Item = { label: string; href: string; icon: LucideIcon };

const items: Item[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Dialer", href: "/dialer", icon: PhoneCall },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Power Dialer", href: "/power-dialer", icon: ListChecks },
  { label: "Calls", href: "/calls", icon: History },
  { label: "Meetings", href: "/meetings", icon: CalendarCheck2 },
  { label: "SMS", href: "/sms", icon: MessageSquare },
  { label: "Voicemails", href: "/voicemails", icon: Voicemail },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar px-3 py-4">
      <Link
        href="/dashboard"
        className="mb-4 flex items-center gap-2.5 px-2 py-1"
        aria-label="Dialer by LaunchCraft home"
      >
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <PhoneCall className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Dialer</span>
          <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            by LaunchCraft
          </span>
        </div>
      </Link>

      <nav className="flex-1 space-y-0.5">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-2 rounded-xl border border-border/60 bg-card/50 p-3 text-xs">
        <DeviceStatusChip />
      </div>
    </aside>
  );
}
