"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { useBranchSelector } from "@/hooks/use-branch-selector";

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
        <span className={Number(r.quantityDelta) < 0 ? "text-red-600" : "text-green-700"}>
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
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value as "raw_material" | "product")}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="raw_material">Raw Materials</option>
            <option value="product">Products</option>
          </select>
        </div>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        Append-only audit trail — every stock-affecting action is recorded here and cannot be edited or deleted.
      </p>

      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No movements recorded yet." />
    </div>
  );
}
