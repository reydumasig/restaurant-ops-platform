"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplierName?: string;
  branchName?: string;
  status: "ordered" | "received" | "cancelled";
  createdByName?: string;
  createdAt: string;
};

const STATUS_VARIANTS: Record<PurchaseOrder["status"], "warning" | "success" | "destructive"> = {
  ordered: "warning",
  received: "success",
  cancelled: "destructive",
};

const STATUS_LABELS: Record<PurchaseOrder["status"], string> = {
  ordered: "Ordered",
  received: "Received",
  cancelled: "Cancelled",
};

export default function PurchaseOrdersPage() {
  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/purchase-orders")
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, []);

  const columns: Column<PurchaseOrder>[] = [
    { header: "PO #", cell: (r) => <code className="text-xs text-muted-foreground">{r.poNumber}</code> },
    { header: "Supplier", cell: (r) => r.supplierName ?? "—" },
    { header: "Branch", cell: (r) => r.branchName ?? "—" },
    {
      header: "Status",
      cell: (r) => (
        <Badge variant={STATUS_VARIANTS[r.status]} pulse={r.status === "ordered"}>
          {STATUS_LABELS[r.status]}
        </Badge>
      ),
    },
    { header: "Created By", cell: (r) => r.createdByName ?? "—" },
    { header: "Created", cell: (r) => new Date(r.createdAt).toLocaleString() },
    {
      header: "",
      cell: (r) => (
        <Link href={`/purchasing/${r.id}`} className="text-sm text-primary hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Purchase Orders</h1>
        <Button asChild>
          <Link href="/purchasing/new">New Purchase Order</Link>
        </Button>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No purchase orders yet." />
    </div>
  );
}
