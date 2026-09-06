"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ReportTable } from "@/components/report-table";

type Row = {
  productId: string;
  productName: string;
  productSku: string;
  price: number;
  foodCostPerUnit: number;
  foodCostPercent: number | null;
  grossMargin: number;
  grossMarginPercent: number | null;
};

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("productName", { header: "Item" }),
  columnHelper.accessor("productSku", { header: "SKU" }),
  columnHelper.accessor("price", { header: "Price", cell: (c) => `₱${c.getValue().toFixed(2)}` }),
  columnHelper.accessor("foodCostPerUnit", { header: "Food Cost", cell: (c) => `₱${c.getValue().toFixed(2)}` }),
  columnHelper.accessor("foodCostPercent", { header: "Food Cost %", cell: (c) => (c.getValue() != null ? `${c.getValue()!.toFixed(1)}%` : "—") }),
  columnHelper.accessor("grossMargin", { header: "Gross Margin", cell: (c) => `₱${c.getValue().toFixed(2)}` }),
  columnHelper.accessor("grossMarginPercent", { header: "Margin %", cell: (c) => (c.getValue() != null ? `${c.getValue()!.toFixed(1)}%` : "—") }),
];

export default function FoodCostReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/food-cost")
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, []);

  const exportRows = useMemo(
    () => (data: Row[]) =>
      data.map((r) => ({
        Item: r.productName,
        SKU: r.productSku,
        "Price (PHP)": r.price.toFixed(2),
        "Food Cost (PHP)": r.foodCostPerUnit.toFixed(2),
        "Food Cost %": r.foodCostPercent != null ? r.foodCostPercent.toFixed(1) : "",
        "Gross Margin (PHP)": r.grossMargin.toFixed(2),
        "Margin %": r.grossMarginPercent != null ? r.grossMarginPercent.toFixed(1) : "",
      })),
    [],
  );

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground print:hidden">
        Covers menu items with a recipe (Bill of Materials) defined. Items without one aren&apos;t listed — there&apos;s no ingredient
        breakdown to cost them from yet.
      </p>
      <ReportTable
        title="Food Cost Analysis"
        columns={columns}
        data={rows}
        loading={loading}
        exportRows={exportRows}
        exportFilename="food-cost-analysis"
      />
    </div>
  );
}
