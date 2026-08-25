"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";

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
        <h1 className="text-xl font-semibold text-foreground">Production Runs</h1>
        <Button asChild>
          <Link href="/production/new">New Production Run</Link>
        </Button>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No production runs recorded yet." />
    </div>
  );
}
