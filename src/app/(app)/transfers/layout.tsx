import Link from "next/link";
import { type ReactNode } from "react";
import { ModuleShell } from "@/components/module-shell";
import { Button } from "@/components/ui/button";

export default function TransfersLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell
      moduleLabel="Stock Transfers"
      printable
      headerActions={
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/transfers/request">Request Stock</Link>
          </Button>
          <Button asChild>
            <Link href="/transfers/new">New Transfer</Link>
          </Button>
        </div>
      }
    >
      {children}
    </ModuleShell>
  );
}
