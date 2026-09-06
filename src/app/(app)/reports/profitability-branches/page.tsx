"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DateRangePicker } from "@/components/date-range-picker";
import { ReportTable } from "@/components/report-table";

type Row = {
  branchId: string;
  branchName?: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number | null;
  costCoveragePercent: number | null;
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
  columnHelper.accessor("branchName", { header: "Branch", cell: (c) => c.getValue() ?? "—" }),
  columnHelper.accessor("revenue", { header: "Revenue", cell: (c) => `₱${c.getValue().toFixed(2)}` }),
  columnHelper.accessor("cogs", { header: "COGS", cell: (c) => `₱${c.getValue().toFixed(2)}` }),
  columnHelper.accessor("grossProfit", { header: "Gross Profit", cell: (c) => `₱${c.getValue().toFixed(2)}` }),
  columnHelper.accessor("grossMarginPercent", { header: "Margin %", cell: (c) => (c.getValue() != null ? `${c.getValue()!.toFixed(1)}%` : "—") }),
  columnHelper.accessor("costCoveragePercent", {
    header: "Cost Coverage",
    cell: (c) => (c.getValue() != null ? `${c.getValue()!.toFixed(0)}% of units` : "—"),
  }),
];

export default function BranchProfitabilityReportPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/profitability/branches?from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [from, to]);

  const exportRows = useMemo(
    () => (data: Row[]) =>
      data.map((r) => ({
        Branch: r.branchName ?? "",
        "Revenue (PHP)": r.revenue.toFixed(2),
        "COGS (PHP)": r.cogs.toFixed(2),
        "Gross Profit (PHP)": r.grossProfit.toFixed(2),
        "Margin %": r.grossMarginPercent != null ? r.grossMarginPercent.toFixed(1) : "",
        "Cost Coverage %": r.costCoveragePercent != null ? r.costCoveragePercent.toFixed(0) : "",
      })),
    [],
  );

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4 print:hidden">
        <p className="text-sm text-muted-foreground">
          Cost Coverage shows what share of units sold had a recipe-based cost — COGS only reflects that share, so a low-coverage
          branch&apos;s margin is understated, not necessarily worse.
        </p>
        <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </div>
      <ReportTable
        title="Branch Profitability"
        columns={columns}
        data={rows}
        loading={loading}
        exportRows={exportRows}
        exportFilename="branch-profitability-report"
      />
    </div>
  );
}
