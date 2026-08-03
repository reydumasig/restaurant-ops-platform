"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ReportTable } from "@/components/report-table";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = {
  branchId: string;
  branchName?: string;
  itemType: "raw_material" | "product";
  name: string;
  sku: string;
  categoryName: string;
  unitAbbreviation: string;
  quantity: string;
  costPerUnit: string;
};

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("branchName", { header: "Branch" }),
  columnHelper.accessor("itemType", { header: "Type", cell: (c) => (c.getValue() === "raw_material" ? "Raw Material" : "Product") }),
  columnHelper.accessor("sku", { header: "SKU" }),
  columnHelper.accessor("name", { header: "Item" }),
  columnHelper.accessor("categoryName", { header: "Category" }),
  columnHelper.accessor("quantity", { header: "Quantity", cell: (c) => `${c.getValue()} ${c.row.original.unitAbbreviation}` }),
  columnHelper.accessor((r) => Number(r.quantity) * Number(r.costPerUnit), {
    id: "value",
    header: "Value (₱)",
    cell: (c) => `₱${c.getValue().toFixed(2)}`,
  }),
];

export default function InventoryReportPage() {
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/inventory/report${branchId ? `?branchId=${branchId}` : ""}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, [branchId]);

  const exportRows = useMemo(
    () => (data: Row[]) =>
      data.map((r) => ({
        Branch: r.branchName,
        Type: r.itemType === "raw_material" ? "Raw Material" : "Product",
        SKU: r.sku,
        Item: r.name,
        Category: r.categoryName,
        Quantity: r.quantity,
        Unit: r.unitAbbreviation,
        "Value (PHP)": (Number(r.quantity) * Number(r.costPerUnit)).toFixed(2),
      })),
    [],
  );

  return (
    <div>
      {branches.length > 1 && (
        <div className="mb-4 flex justify-end print:hidden">
          <Select value={branchId || "all"} onValueChange={(value) => setBranchId(value === "all" ? "" : value)}>
            <SelectTrigger>
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
        </div>
      )}
      <ReportTable
        title="Inventory & Branch Stock Report"
        columns={columns}
        data={rows}
        loading={loading}
        exportRows={exportRows}
        exportFilename="inventory-report"
      />
    </div>
  );
}
