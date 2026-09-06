"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DateRangePicker } from "@/components/date-range-picker";
import { ReportTable } from "@/components/report-table";

type Row = {
  productId: string;
  productName: string;
  productSku: string;
  unitsSold: number;
  revenue: number;
  cogs: number | null;
  grossProfit: number | null;
  grossMarginPercent: number | null;
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
  columnHelper.accessor("productName", { header: "Item" }),
  columnHelper.accessor("productSku", { header: "SKU" }),
  columnHelper.accessor("unitsSold", { header: "Units Sold" }),
  columnHelper.accessor("revenue", { header: "Revenue", cell: (c) => `₱${c.getValue().toFixed(2)}` }),
  columnHelper.accessor("cogs", { header: "COGS", cell: (c) => (c.getValue() != null ? `₱${c.getValue()!.toFixed(2)}` : "—") }),
  columnHelper.accessor("grossProfit", { header: "Gross Profit", cell: (c) => (c.getValue() != null ? `₱${c.getValue()!.toFixed(2)}` : "—") }),
  columnHelper.accessor("grossMarginPercent", { header: "Margin %", cell: (c) => (c.getValue() != null ? `${c.getValue()!.toFixed(1)}%` : "—") }),
];

export default function ProductProfitabilityReportPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/profitability/products?from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, [from, to]);

  const exportRows = useMemo(
    () => (data: Row[]) =>
      data.map((r) => ({
        Item: r.productName,
        SKU: r.productSku,
        "Units Sold": r.unitsSold,
        "Revenue (PHP)": r.revenue.toFixed(2),
        "COGS (PHP)": r.cogs != null ? r.cogs.toFixed(2) : "",
        "Gross Profit (PHP)": r.grossProfit != null ? r.grossProfit.toFixed(2) : "",
        "Margin %": r.grossMarginPercent != null ? r.grossMarginPercent.toFixed(1) : "",
      })),
    [],
  );

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4 print:hidden">
        <p className="text-sm text-muted-foreground">
          COGS shows &ldquo;—&rdquo; for items without a recipe defined — revenue is still counted, but there&apos;s no cost basis to
          compute a margin from yet.
        </p>
        <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </div>
      <ReportTable
        title="Product Profitability"
        columns={columns}
        data={rows}
        loading={loading}
        exportRows={exportRows}
        exportFilename="product-profitability-report"
      />
    </div>
  );
}
