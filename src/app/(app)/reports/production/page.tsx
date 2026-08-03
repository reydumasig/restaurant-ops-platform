"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ReportTable } from "@/components/report-table";

type Row = {
  recipeName?: string;
  productName?: string;
  quantityProduced: string;
  producedByName?: string;
  producedAt: string;
  notes: string | null;
};

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("recipeName", { header: "Recipe" }),
  columnHelper.accessor("productName", { header: "Product" }),
  columnHelper.accessor("quantityProduced", { header: "Quantity Produced" }),
  columnHelper.accessor("producedByName", { header: "By" }),
  columnHelper.accessor("producedAt", { header: "When", cell: (c) => new Date(c.getValue()).toLocaleString() }),
  columnHelper.accessor("notes", { header: "Notes", cell: (c) => c.getValue() ?? "—" }),
];

export default function ProductionReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/production/runs")
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, []);

  const exportRows = useMemo(
    () => (data: Row[]) =>
      data.map((r) => ({
        Recipe: r.recipeName,
        Product: r.productName,
        "Quantity Produced": r.quantityProduced,
        By: r.producedByName,
        When: new Date(r.producedAt).toLocaleString(),
        Notes: r.notes ?? "",
      })),
    [],
  );

  return (
    <ReportTable
      title="Production Report"
      columns={columns}
      data={rows}
      loading={loading}
      exportRows={exportRows}
      exportFilename="production-report"
    />
  );
}
