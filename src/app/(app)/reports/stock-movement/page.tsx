"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ReportTable } from "@/components/report-table";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = {
  createdAt: string;
  itemName?: string;
  itemSku?: string;
  movementType: string;
  quantityDelta: string;
  quantityAfter: string;
  performedByName?: string;
  notes: string | null;
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

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("createdAt", { header: "When", cell: (c) => new Date(c.getValue()).toLocaleString() }),
  columnHelper.accessor("itemName", { header: "Item" }),
  columnHelper.accessor("itemSku", { header: "SKU" }),
  columnHelper.accessor("movementType", { header: "Movement", cell: (c) => MOVEMENT_LABELS[c.getValue()] ?? c.getValue() }),
  columnHelper.accessor("quantityDelta", { header: "Change" }),
  columnHelper.accessor("quantityAfter", { header: "Balance After" }),
  columnHelper.accessor("performedByName", { header: "By" }),
  columnHelper.accessor("notes", { header: "Notes" }),
];

export default function StockMovementReportPage() {
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [itemType, setItemType] = useState<"raw_material" | "product">("raw_material");
  const [rows, setRows] = useState<Row[]>([]);
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

  const exportRows = useMemo(
    () => (data: Row[]) =>
      data.map((r) => ({
        When: new Date(r.createdAt).toLocaleString(),
        Item: r.itemName,
        SKU: r.itemSku,
        Movement: MOVEMENT_LABELS[r.movementType] ?? r.movementType,
        Change: r.quantityDelta,
        "Balance After": r.quantityAfter,
        By: r.performedByName,
        Notes: r.notes ?? "",
      })),
    [],
  );

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2 print:hidden">
        {branches.length > 1 && (
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger>
              <SelectValue />
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
      <ReportTable
        title="Stock Movement Report"
        columns={columns}
        data={rows}
        loading={loading}
        exportRows={exportRows}
        exportFilename="stock-movement-report"
      />
    </div>
  );
}
