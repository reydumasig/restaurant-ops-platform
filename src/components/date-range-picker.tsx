"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs">From</Label>
        <Input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="w-40" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">To</Label>
        <Input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="w-40" />
      </div>
    </div>
  );
}
