"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranchSelector } from "@/hooks/use-branch-selector";

type StockCount = {
  id: string;
  countNumber: string;
  branchName?: string;
  itemType: "raw_material" | "product";
  status: "in_progress" | "completed" | "cancelled";
  startedByName?: string;
  createdAt: string;
};

const STATUS_VARIANTS: Record<StockCount["status"], "warning" | "success" | "destructive"> = {
  in_progress: "warning",
  completed: "success",
  cancelled: "destructive",
};

const STATUS_LABELS: Record<StockCount["status"], string> = {
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function StockCountsPage() {
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [rows, setRows] = useState<StockCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemType, setItemType] = useState<"raw_material" | "product">("raw_material");
  const [starting, setStarting] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/stock-counts")
      .then((r) => r.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }

  useEffect(load, []);

  async function startCount() {
    if (starting || !branchId) return;
    setStarting(true);
    try {
      const res = await fetch("/api/stock-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, itemType }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Something went wrong");
        return;
      }
      window.location.href = `/inventory/counts/${body.id}`;
    } finally {
      setStarting(false);
    }
  }

  const columns: Column<StockCount>[] = [
    { header: "Count #", cell: (r) => <code className="text-xs text-muted-foreground">{r.countNumber}</code> },
    { header: "Branch", cell: (r) => r.branchName ?? "—" },
    { header: "Type", cell: (r) => (r.itemType === "raw_material" ? "Raw Materials" : "Products") },
    { header: "Status", cell: (r) => <Badge variant={STATUS_VARIANTS[r.status]} pulse={r.status === "in_progress"}>{STATUS_LABELS[r.status]}</Badge> },
    { header: "Started By", cell: (r) => r.startedByName ?? "—" },
    { header: "Started", cell: (r) => new Date(r.createdAt).toLocaleString() },
    {
      header: "",
      cell: (r) => (
        <Link href={`/inventory/counts/${r.id}`} className="text-sm text-primary hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">Stock Counts</h1>
        <div className="flex items-end gap-3">
          {branches.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Count</Label>
            <Select value={itemType} onValueChange={(v) => setItemType(v as "raw_material" | "product")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw_material">Raw Materials</SelectItem>
                <SelectItem value="product">Products</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={startCount} disabled={starting || !branchId}>
            {starting ? "Starting…" : "Start New Count"}
          </Button>
        </div>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No stock counts yet." />
    </div>
  );
}
