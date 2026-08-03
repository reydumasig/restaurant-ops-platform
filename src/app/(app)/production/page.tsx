"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table";

type Run = {
  id: string;
  recipeName?: string;
  productName?: string;
  quantityProduced: string;
  producedByName?: string;
  producedAt: string;
  notes: string | null;
};

export default function ProductionRunsPage() {
  const [rows, setRows] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/production/runs")
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, []);

  const columns: Column<Run>[] = [
    { header: "Recipe", cell: (r) => r.recipeName ?? "—" },
    { header: "Produced", cell: (r) => `${r.quantityProduced} of ${r.productName ?? "—"}` },
    { header: "By", cell: (r) => r.producedByName ?? "—" },
    { header: "When", cell: (r) => new Date(r.producedAt).toLocaleString() },
    { header: "Notes", cell: (r) => r.notes ?? "—" },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Production Runs</h1>
        <Link href="/production/new" className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">
          New Production Run
        </Link>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No production runs recorded yet." />
    </div>
  );
}
