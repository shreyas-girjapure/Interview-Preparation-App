"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

type MobileNavProps = {
  isAuthenticated: boolean;
  canAccessAdminArea: boolean;
  accountInitial: string;
  accountLabel: string;
};

export function MobileNav({
  isAuthenticated,
  canAccessAdminArea,
  accountInitial,
  accountLabel,
}: MobileNavProps) {
  if (!isAuthenticated) {
    return (
      <Button asChild size="xs">
        <Link href="/login?next=/account">Get started</Link>
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Open navigation menu"
          className="border-border/70"
        >
          <Menu className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-56 p-2">
        <nav className="flex flex-col">
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/topics">Topics</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/questions">Questions</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/playlists">Playlists</Link>
          </Button>
          {canAccessAdminArea ? (
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/admin/playlists">Admin</Link>
            </Button>
          ) : null}

          <Separator className="my-2" />

          <Button asChild variant="ghost" className="justify-start">
            <Link
              href="/account"
              aria-label={accountLabel}
              title={accountLabel}
            >
              <span className="inline-flex size-6 items-center justify-center rounded-full border border-border/70 bg-foreground text-[10px] font-semibold text-background">
                {accountInitial}
              </span>
              <span className="ml-2">Account</span>
            </Link>
          </Button>
        </nav>
      </PopoverContent>
    </Popover>
  );
}
