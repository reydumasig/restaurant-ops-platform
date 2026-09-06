"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/sign-out-button";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Shift = {
  id: string;
  branchName?: string;
  status: "open" | "closed";
  startingCash: string;
  expectedCash: string | null;
  countedCash: string | null;
  cashVariance: string | null;
  openedByName?: string;
  openedAt: string;
  closedAt: string | null;
};

export default function ShiftHistoryPage() {
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [rows, setRows] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pos-shifts${branchId ? `?branchId=${branchId}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, [branchId]);

  const columns: Column<Shift>[] = [
    { header: "Branch", cell: (r) => r.branchName ?? "—" },
    { header: "Status", cell: (r) => <Badge variant={r.status === "open" ? "warning" : "success"} pulse={r.status === "open"}>{r.status === "open" ? "Open" : "Closed"}</Badge> },
    { header: "Opened By", cell: (r) => r.openedByName ?? "—" },
    { header: "Opened", cell: (r) => new Date(r.openedAt).toLocaleString() },
    { header: "Starting Cash", cell: (r) => `₱${Number(r.startingCash).toFixed(2)}` },
    { header: "Expected", cell: (r) => (r.expectedCash != null ? `₱${Number(r.expectedCash).toFixed(2)}` : "—") },
    { header: "Counted", cell: (r) => (r.countedCash != null ? `₱${Number(r.countedCash).toFixed(2)}` : "—") },
    {
      header: "Variance",
      cell: (r) => {
        if (r.cashVariance == null) return "—";
        const v = Number(r.cashVariance);
        return <span className={v < 0 ? "text-destructive" : v > 0 ? "text-warning" : "text-success"}>{v > 0 ? "+" : ""}₱{v.toFixed(2)}</span>;
      },
    },
    {
      header: "",
      cell: (r) => (
        <Link href={`/pos/shifts/${r.id}`} className="text-sm text-primary hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/pos" className="text-lg font-semibold text-foreground">
            ← Point of Sale
          </Link>
          <span className="text-sm text-muted-foreground">Shift History</span>
        </div>
        <div className="flex items-center gap-4">
          {branches.length > 1 && (
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
          )}
          <SignOutButton />
        </div>
      </header>

      <main className="p-6">
        <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No shifts recorded yet." />
      </main>
    </div>
  );
}
