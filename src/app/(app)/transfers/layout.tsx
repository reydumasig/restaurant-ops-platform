import Link from "next/link";
import { type ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";

export default function TransfersLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            Restaurant Ops Platform
          </Link>
          <span className="text-sm text-gray-400">Stock Transfers</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/transfers/new" className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">
            New Transfer
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
