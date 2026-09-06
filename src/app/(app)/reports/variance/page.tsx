"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ReportTable } from "@/components/report-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranchSelector } from "@/hooks/use-branch-selector";

type Row = {
  countId: string;
  countNumber: string;
  branchName?: string;
  itemType: "raw_material" | "product";
  completedAt: string | null;
  itemId: string;
  expectedQuantity: string;
  countedQuantity: string;
  meta?: { name: string; sku: string };
};

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("branchName", { header: "Branch" }),
  columnHelper.accessor("countNumber", { header: "Count #" }),
  columnHelper.accessor((r) => r.meta?.name ?? "—", { id: "item", header: "Item" }),
  columnHelper.accessor("expectedQuantity", { header: "Expected" }),
  columnHelper.accessor("countedQuantity", { header: "Counted" }),
  columnHelper.accessor((r) => Number(r.countedQuantity) - Number(r.expectedQuantity), {
    id: "variance",
    header: "Variance",
    cell: (c) => {
      const v = c.getValue();
      return v === 0 ? "0" : `${v > 0 ? "+" : ""}${v}`;
    },
  }),
  columnHelper.accessor("completedAt", { header: "Completed", cell: (c) => (c.getValue() ? new Date(c.getValue() as string).toLocaleString() : "—") }),
];

export default function VarianceReportPage() {
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (branchId) params.set("branchId", branchId);
    fetch(`/api/stock-counts/variance-report?${params.toString()}`)
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
        "Count #": r.countNumber,
        Item: r.meta?.name,
        Expected: r.expectedQuantity,
        Counted: r.countedQuantity,
        Variance: Number(r.countedQuantity) - Number(r.expectedQuantity),
        Completed: r.completedAt ? new Date(r.completedAt).toLocaleString() : "",
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
        title="Stock Count Variance Report"
        columns={columns}
        data={rows}
        loading={loading}
        exportRows={exportRows}
        exportFilename="stock-count-variance-report"
      />
    </div>
  );
}
