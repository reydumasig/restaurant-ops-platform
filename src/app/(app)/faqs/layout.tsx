import { type ReactNode } from "react";
import { ModuleShell } from "@/components/module-shell";

const NAV_ITEMS = [
  { href: "/faqs#setup", label: "Setting Up a New Location" },
  { href: "/faqs#new-item", label: "Add a New Item to the Catalog" },
  { href: "/faqs#stock-in", label: "Add Stock (Receiving)" },
  { href: "/faqs#transfers", label: "Receive a Transfer" },
  { href: "/faqs#adjustment", label: "Fix a Wrong Count" },
  { href: "/faqs#stock-count", label: "Run a Full Stock Count" },
  { href: "/faqs#waste", label: "Report Waste or Spoilage" },
  { href: "/faqs#expiring", label: "Check What's Expiring Soon" },
  { href: "/faqs#purchasing", label: "Create & Receive a Purchase Order" },
  { href: "/faqs#recipes", label: "Create a Recipe (BOM)" },
  { href: "/faqs#production", label: "Run a Production Batch" },
  { href: "/faqs#shifts", label: "Start & End a POS Shift" },
  { href: "/faqs#orders", label: "Take a POS Order (Tabs)" },
  { href: "/faqs#users", label: "Add a User / Reset a Password" },
];

export default function FaqsLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell moduleLabel="FAQs & How-To" navItems={NAV_ITEMS}>
      {children}
    </ModuleShell>
  );
}
