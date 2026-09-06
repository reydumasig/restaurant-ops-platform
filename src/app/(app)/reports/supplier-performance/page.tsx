"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ReportTable } from "@/components/report-table";

type Row = {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  totalQuantityOrdered: number;
  totalQuantityReceived: number;
  fulfillmentRate: number | null;
  totalValueReceived: number;
};

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("supplierName", { header: "Supplier" }),
  columnHelper.accessor("totalOrders", { header: "Orders Received" }),
  columnHelper.accessor("totalQuantityOrdered", { header: "Qty Ordered", cell: (c) => c.getValue().toFixed(2) }),
  columnHelper.accessor("totalQuantityReceived", { header: "Qty Received", cell: (c) => c.getValue().toFixed(2) }),
  columnHelper.accessor("fulfillmentRate", { header: "Fulfillment Rate", cell: (c) => (c.getValue() != null ? `${c.getValue()!.toFixed(1)}%` : "—") }),
  columnHelper.accessor("totalValueReceived", { header: "Value Received (₱)", cell: (c) => `₱${c.getValue().toFixed(2)}` }),
];

export default function SupplierPerformanceReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/suppliers/performance-report")
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, []);

  const exportRows = useMemo(
    () => (data: Row[]) =>
      data.map((r) => ({
        Supplier: r.supplierName,
        "Orders Received": r.totalOrders,
        "Qty Ordered": r.totalQuantityOrdered.toFixed(2),
        "Qty Received": r.totalQuantityReceived.toFixed(2),
        "Fulfillment Rate (%)": r.fulfillmentRate != null ? r.fulfillmentRate.toFixed(1) : "",
        "Value Received (PHP)": r.totalValueReceived.toFixed(2),
      })),
    [],
  );

  return (
    <ReportTable
      title="Supplier Performance Report"
      columns={columns}
      data={rows}
      loading={loading}
      exportRows={exportRows}
      exportFilename="supplier-performance-report"
    />
  );
}
