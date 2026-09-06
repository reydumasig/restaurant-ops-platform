"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DateRangePicker } from "@/components/date-range-picker";
import { ReportTable } from "@/components/report-table";

type Row = {
  branchId: string;
  branchName: string;
  totalSales: number;
  transactionCount: number;
  averageTicket: number;
  inventoryValue: number;
  lowStockCount: number;
};

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("branchName", { header: "Branch" }),
  columnHelper.accessor("totalSales", { header: "Sales", cell: (c) => `₱${c.getValue().toFixed(2)}` }),
  columnHelper.accessor("transactionCount", { header: "Transactions" }),
  columnHelper.accessor("averageTicket", { header: "Avg Ticket", cell: (c) => `₱${c.getValue().toFixed(2)}` }),
  columnHelper.accessor("inventoryValue", { header: "Inventory Value", cell: (c) => `₱${c.getValue().toFixed(2)}` }),
  columnHelper.accessor("lowStockCount", { header: "Low Stock Items" }),
];

export default function BranchPerformanceReportPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/branch-performance?from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [from, to]);

  const exportRows = useMemo(
    () => (data: Row[]) =>
      data.map((r) => ({
        Branch: r.branchName,
        "Sales (PHP)": r.totalSales.toFixed(2),
        Transactions: r.transactionCount,
        "Avg Ticket (PHP)": r.averageTicket.toFixed(2),
        "Inventory Value (PHP)": r.inventoryValue.toFixed(2),
        "Low Stock Items": r.lowStockCount,
      })),
    [],
  );

  return (
    <div>
      <div className="mb-4 flex justify-end print:hidden">
        <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </div>
      <ReportTable
        title="Branch Performance Dashboard"
        columns={columns}
        data={rows}
        loading={loading}
        exportRows={exportRows}
        exportFilename="branch-performance-report"
      />
    </div>
  );
}
