import Link from "next/link";
import { type ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
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
  return (
    <div className={cn("min-h-screen bg-background", printable && "print:bg-white")}>
      <header className={cn("flex items-center justify-between border-b px-6 py-4", printable && "print:hidden")}>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold text-foreground">
            Restaurant Ops Platform
          </Link>
          <span className="text-sm text-muted-foreground">{moduleLabel}</span>
        </div>
        <div className="flex items-center gap-4">
          {headerActions}
          <SignOutButton />
        </div>
      </header>
      <div className="flex">
        {navItems && (
          <nav className={cn("w-56 shrink-0 border-r bg-background p-4", printable && "print:hidden")}>
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <main className={cn("flex-1 p-6", printable && "print:p-0")}>{children}</main>
      </div>
    </div>
  );
}
