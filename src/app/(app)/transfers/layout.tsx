import Link from "next/link";
import { type ReactNode } from "react";
import { ModuleShell } from "@/components/module-shell";
import { Button } from "@/components/ui/button";

export default function TransfersLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell
      moduleLabel="Stock Transfers"
      headerActions={
        <Button asChild>
          <Link href="/transfers/new">New Transfer</Link>
        </Button>
      }
    >
      {children}
    </ModuleShell>
  );
}
