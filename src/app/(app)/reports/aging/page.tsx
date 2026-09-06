"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ReportTable } from "@/components/report-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranchSelector } from "@/hooks/use-branch-selector";

type Row = {
  id: string;
  batchNumber: string;
  branchName?: string;
  rawMaterialName?: string;
  rawMaterialSku?: string;
  receivedDate: string;
  expiryDate: string | null;
  quantityRemaining: string;
  sourceType: string;
};

function ageDays(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const received = new Date(`${dateStr}T00:00:00`);
  return Math.round((today.getTime() - received.getTime()) / 86400000);
}

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("branchName", { header: "Branch" }),
  columnHelper.accessor("rawMaterialName", { header: "Item" }),
  columnHelper.accessor("rawMaterialSku", { header: "SKU" }),
  columnHelper.accessor("batchNumber", { header: "Batch #" }),
  columnHelper.accessor("receivedDate", { header: "Received" }),
  columnHelper.accessor("expiryDate", { header: "Expires", cell: (c) => c.getValue() ?? "—" }),
  columnHelper.accessor((r) => ageDays(r.receivedDate), { id: "age", header: "Age (days)" }),
  columnHelper.accessor("quantityRemaining", { header: "Qty Remaining" }),
];

export default function AgingReportPage() {
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (branchId) params.set("branchId", branchId);
    fetch(`/api/batches/aging?${params.toString()}`)
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
        Item: r.rawMaterialName,
        SKU: r.rawMaterialSku,
        "Batch #": r.batchNumber,
        Received: r.receivedDate,
        Expires: r.expiryDate ?? "",
        "Age (days)": ageDays(r.receivedDate),
        "Qty Remaining": r.quantityRemaining,
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
        title="Inventory Aging Report"
        columns={columns}
        data={rows}
        loading={loading}
        exportRows={exportRows}
        exportFilename="inventory-aging-report"
      />
    </div>
  );
}
