import { type ReactNode } from "react";
import { ModuleShell } from "@/components/module-shell";

const NAV_ITEMS = [{ href: "/purchasing", label: "Purchase Orders" }];

export default function PurchasingLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell moduleLabel="Purchasing" navItems={NAV_ITEMS}>
      {children}
    </ModuleShell>
  );
}
