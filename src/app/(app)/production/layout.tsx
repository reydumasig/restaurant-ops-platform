import Link from "next/link";
import { type ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";

const NAV_ITEMS = [
  { href: "/production", label: "Production Runs" },
  { href: "/production/recipes", label: "Recipes / BOM" },
];

export default function ProductionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            Restaurant Ops Platform
          </Link>
          <span className="text-sm text-gray-400">Production</span>
        </div>
        <SignOutButton />
      </header>
      <div className="flex">
        <nav className="w-56 shrink-0 border-r border-gray-200 bg-white p-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
