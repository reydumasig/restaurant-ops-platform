import { type ReactNode } from "react";
import { ModuleShell } from "@/components/module-shell";

const NAV_ITEMS = [
  { href: "/reports/inventory", label: "Inventory & Branch Stock" },
  { href: "/reports/stock-movement", label: "Stock Movement" },
  { href: "/reports/transfers", label: "Transfers" },
  { href: "/reports/production", label: "Production" },
  { href: "/reports/daily-sales", label: "Daily Sales" },
  { href: "/reports/attendance", label: "Attendance" },
  { href: "/reports/aging", label: "Inventory Aging" },
  { href: "/reports/variance", label: "Stock Count Variance" },
  { href: "/reports/supplier-performance", label: "Supplier Performance" },
];

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell moduleLabel="Reports" navItems={NAV_ITEMS} printable>
      {children}
    </ModuleShell>
  );
}
