"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LedgerRow = {
  id: string;
  movementType: string;
  quantityDelta: string;
  quantityAfter: string;
  notes: string | null;
  createdAt: string;
  itemName?: string;
  itemSku?: string;
  performedByName?: string;
};

const MOVEMENT_LABELS: Record<string, string> = {
  stock_in: "Stock In",
  stock_out: "Stock Out",
  adjustment_increase: "Adjustment (+)",
  adjustment_decrease: "Adjustment (−)",
  transfer_out: "Transfer Out",
  transfer_in: "Transfer In",
  production_consume: "Production (consumed)",
  production_yield: "Production (yielded)",
  sale_deduction: "Sale Deduction",
};

export default function LedgerPage() {
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [itemType, setItemType] = useState<"raw_material" | "product">("raw_material");
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    fetch(`/api/inventory/ledger?branchId=${branchId}&itemType=${itemType}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, [branchId, itemType]);

  const columns: Column<LedgerRow>[] = [
    { header: "When", cell: (r) => new Date(r.createdAt).toLocaleString() },
    { header: "Item", cell: (r) => `${r.itemName ?? "—"} (${r.itemSku ?? "—"})` },
    { header: "Movement", cell: (r) => MOVEMENT_LABELS[r.movementType] ?? r.movementType },
    {
      header: "Change",
      cell: (r) => (
        <span className={Number(r.quantityDelta) < 0 ? "text-destructive" : "text-green-700"}>
          {Number(r.quantityDelta) > 0 ? "+" : ""}
          {r.quantityDelta}
        </span>
      ),
    },
    { header: "Balance After", cell: (r) => r.quantityAfter },
    { header: "By", cell: (r) => r.performedByName ?? "—" },
    { header: "Notes", cell: (r) => r.notes ?? "—" },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Stock Ledger</h1>
        <div className="flex gap-2">
          {branches.length > 1 && (
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={itemType} onValueChange={(value) => setItemType(value as "raw_material" | "product")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="raw_material">Raw Materials</SelectItem>
              <SelectItem value="product">Products</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        Append-only audit trail — every stock-affecting action is recorded here and cannot be edited or deleted.
      </p>

      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No movements recorded yet." />
    </div>
  );
}
