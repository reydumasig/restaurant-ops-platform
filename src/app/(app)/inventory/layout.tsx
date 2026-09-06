import { type ReactNode } from "react";
import { ModuleShell } from "@/components/module-shell";

const NAV_ITEMS = [
  { href: "/inventory", label: "Stock Levels" },
  { href: "/inventory/movement", label: "Stock In / Out / Adjust" },
  { href: "/inventory/counts", label: "Stock Counts" },
  { href: "/inventory/waste", label: "Waste Reports" },
  { href: "/inventory/expiring", label: "Expiring Soon" },
  { href: "/inventory/ledger", label: "Stock Ledger" },
];

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell moduleLabel="Inventory" navItems={NAV_ITEMS}>
      {children}
    </ModuleShell>
  );
}
