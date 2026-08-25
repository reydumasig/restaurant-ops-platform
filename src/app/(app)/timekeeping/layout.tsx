import { type ReactNode } from "react";
import { ModuleShell } from "@/components/module-shell";

export default function TimekeepingLayout({ children }: { children: ReactNode }) {
  return <ModuleShell moduleLabel="Time Clock">{children}</ModuleShell>;
}
