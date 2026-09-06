import { type ReactNode } from "react";
import { ModuleShell } from "@/components/module-shell";

const NAV_ITEMS = [
  { href: "/master-data/branches", label: "Branches" },
  { href: "/master-data/categories", label: "Categories" },
  { href: "/master-data/units", label: "Units of Measure" },
  { href: "/master-data/raw-materials", label: "Raw Materials" },
  { href: "/master-data/products", label: "Products" },
  { href: "/master-data/suppliers", label: "Suppliers" },
  { href: "/master-data/users", label: "Users" },
  { href: "/master-data/roles", label: "Roles" },
];

export default function MasterDataLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell moduleLabel="Master Data" navItems={NAV_ITEMS}>
      {children}
    </ModuleShell>
  );
}
