"use client";

import { useRouter } from "next/navigation";
import { Search, PhoneCall, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth.store";
import { logoutClient } from "@/lib/auth/client";
import { BalancePill } from "./BalancePill";

function initialsFor(name: string | null | undefined, email: string): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  async function handleLogout() {
    await logoutClient();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border/60 bg-background/70 px-6 backdrop-blur">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">
          Search leads, calls, meetings…
        </span>
        <kbd className="ml-1 hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/80 sm:inline">
          ⌘K
        </kbd>
      </div>
      <div className="flex items-center gap-2">
        <BalancePill />
        <Button size="sm" className="h-8 gap-1.5">
          <PhoneCall className="h-3.5 w-3.5" />
          New call
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-1 grid h-8 w-8 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {user ? initialsFor(user.name, user.email) : "?"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="font-medium">{user?.name ?? "Signed in"}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user?.email ?? "—"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <UserIcon className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
