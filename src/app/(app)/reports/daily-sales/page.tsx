"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ReportTable } from "@/components/report-table";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = { saleDate: string; totalSales: string; transactionCount: number };

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("saleDate", { header: "Date" }),
  columnHelper.accessor("totalSales", { header: "Total Sales (₱)", cell: (c) => `₱${Number(c.getValue()).toFixed(2)}` }),
  columnHelper.accessor("transactionCount", { header: "Transactions" }),
];

export default function DailySalesReportPage() {
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pos/daily-sales-report${branchId ? `?branchId=${branchId}` : ""}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, [branchId]);

  const exportRows = useMemo(
    () => (data: Row[]) =>
      data.map((r) => ({
        Date: r.saleDate,
        "Total Sales (PHP)": Number(r.totalSales).toFixed(2),
        Transactions: r.transactionCount,
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
        title="Daily Sales Report"
        columns={columns}
        data={rows}
        loading={loading}
        exportRows={exportRows}
        exportFilename="daily-sales-report"
      />
    </div>
  );
}
