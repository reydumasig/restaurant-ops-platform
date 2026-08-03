"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table";

type Transfer = {
  id: string;
  transferNo: string;
  fromBranchName?: string;
  toBranchName?: string;
  status: "pending" | "in_transit" | "received" | "cancelled";
  createdByName?: string;
  createdAt: string;
};

const STATUS_STYLES: Record<Transfer["status"], string> = {
  pending: "text-gray-500",
  in_transit: "text-amber-600",
  received: "text-green-700",
  cancelled: "text-red-500",
};

const STATUS_LABELS: Record<Transfer["status"], string> = {
  pending: "Pending",
  in_transit: "In Transit",
  received: "Received",
  cancelled: "Cancelled",
};

export default function TransfersPage() {
  const [rows, setRows] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transfers")
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, []);

  const columns: Column<Transfer>[] = [
    { header: "Transfer #", cell: (r) => <code className="text-xs text-gray-500">{r.transferNo}</code> },
    { header: "From", cell: (r) => r.fromBranchName ?? "—" },
    { header: "To", cell: (r) => r.toBranchName ?? "—" },
    { header: "Status", cell: (r) => <span className={STATUS_STYLES[r.status]}>{STATUS_LABELS[r.status]}</span> },
    { header: "Created By", cell: (r) => r.createdByName ?? "—" },
    { header: "Created", cell: (r) => new Date(r.createdAt).toLocaleString() },
    {
      header: "",
      cell: (r) => (
        <Link href={`/transfers/${r.id}`} className="text-sm text-blue-600 hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Transfer History</h1>
      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No transfers yet." />
    </div>
  );
}
