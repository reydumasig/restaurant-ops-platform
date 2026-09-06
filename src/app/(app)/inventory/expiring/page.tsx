"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranchSelector } from "@/hooks/use-branch-selector";

type ExpiringBatch = {
  id: string;
  batchNumber: string;
  branchName?: string;
  rawMaterialName?: string;
  rawMaterialSku?: string;
  expiryDate: string;
  quantityRemaining: string;
  sourceType: string;
};

const SOURCE_LABELS: Record<string, string> = {
  stock_in: "Manual Stock In",
  purchase_receipt: "Purchase Receipt",
  transfer_in: "Transfer",
  adjustment_increase: "Adjustment",
  legacy_balance: "Pre-existing Stock",
};

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function ExpiringSoonPage() {
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [withinDays, setWithinDays] = useState("7");
  const [rows, setRows] = useState<ExpiringBatch[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ withinDays });
    if (branchId) params.set("branchId", branchId);
    fetch(`/api/batches/expiring?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }

  useEffect(load, [branchId, withinDays]);

  const columns: Column<ExpiringBatch>[] = [
    { header: "Item", cell: (r) => (r.rawMaterialSku ? `${r.rawMaterialName} (${r.rawMaterialSku})` : (r.rawMaterialName ?? "—")) },
    { header: "Branch", cell: (r) => r.branchName ?? "—" },
    { header: "Batch #", cell: (r) => <code className="text-xs text-muted-foreground">{r.batchNumber}</code> },
    {
      header: "Expires",
      cell: (r) => {
        const days = daysUntil(r.expiryDate);
        const variant = days < 0 ? "destructive" : days <= 2 ? "destructive" : days <= 7 ? "warning" : "secondary";
        const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `in ${days}d`;
        return (
          <div className="flex items-center gap-2">
            <span>{r.expiryDate}</span>
            <Badge variant={variant}>{label}</Badge>
          </div>
        );
      },
    },
    { header: "Qty Remaining", cell: (r) => r.quantityRemaining },
    { header: "Source", cell: (r) => SOURCE_LABELS[r.sourceType] ?? r.sourceType },
  ];

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">Expiring Soon</h1>
        <div className="flex items-end gap-3">
          {branches.length > 1 && (
            <Select value={branchId || "all"} onValueChange={(value) => setBranchId(value === "all" ? "" : value)}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={withinDays} onValueChange={setWithinDays}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Next 3 days</SelectItem>
              <SelectItem value="7">Next 7 days</SelectItem>
              <SelectItem value="14">Next 14 days</SelectItem>
              <SelectItem value="30">Next 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="Nothing expiring in this window." />
    </div>
  );
}
