"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function ModuleShell({
  moduleLabel,
  navItems,
  headerActions,
  printable = false,
  children,
}: {
  moduleLabel: string;
  navItems?: { href: string; label: string }[];
  headerActions?: ReactNode;
  printable?: boolean;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  const navLinks = navItems?.map((item) => (
    <li key={item.href}>
      <Link
        href={item.href}
        onClick={() => setNavOpen(false)}
        className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
      >
        {item.label}
      </Link>
    </li>
  ));

  return (
    <div className={cn("min-h-screen bg-background", printable && "print:bg-white")}>
      <header className={cn("flex items-center justify-between gap-2 border-b px-4 py-4 sm:px-6", printable && "print:hidden")}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          {navItems && (
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="shrink-0 md:hidden">
                  <MenuIcon />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetTitle className="sr-only">{moduleLabel} navigation</SheetTitle>
                <span className="mb-2 px-3 text-sm font-medium text-muted-foreground">{moduleLabel}</span>
                <ul className="space-y-1">{navLinks}</ul>
              </SheetContent>
            </Sheet>
          )}
          <Link href="/" className="truncate text-lg font-semibold text-foreground">
            Restaurant Ops Platform
          </Link>
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">{moduleLabel}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          {headerActions}
          <Link href="/faqs" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            FAQs
          </Link>
          <SignOutButton />
        </div>
      </header>
      <div className="flex">
        {navItems && (
          <nav className={cn("hidden w-56 shrink-0 border-r bg-background p-4 md:block", printable && "print:hidden")}>
            <ul className="space-y-1">{navLinks}</ul>
          </nav>
        )}
        <main className={cn("min-w-0 flex-1 p-4 sm:p-6", printable && "print:p-0")}>{children}</main>
      </div>
    </div>
  );
}
