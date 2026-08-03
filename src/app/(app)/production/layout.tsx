import { type ReactNode } from "react";
import { ModuleShell } from "@/components/module-shell";

const NAV_ITEMS = [
  { href: "/production", label: "Production Runs" },
  { href: "/production/recipes", label: "Recipes / BOM" },
];

export default function ProductionLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell moduleLabel="Production" navItems={NAV_ITEMS}>
      {children}
    </ModuleShell>
  );
}
