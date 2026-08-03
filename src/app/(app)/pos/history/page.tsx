"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table";
import { SignOutButton } from "@/components/sign-out-button";
import { useBranchSelector } from "@/hooks/use-branch-selector";

type Sale = {
  id: string;
  branchName?: string;
  totalAmount: string;
  discountType: string;
  importedAt: string;
  importedByName?: string;
};

type Summary = {
  totalSales: string;
  transactionCount: number;
  topProducts: { productId: string; productName: string; totalQuantity: string; totalRevenue: string }[];
};

export default function SalesHistoryPage() {
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/pos/sales").then((r) => r.json()),
      fetch(`/api/pos/summary${branchId ? `?branchId=${branchId}` : ""}`).then((r) => r.json()),
    ]).then(([saleRows, summaryBody]) => {
      setSales(saleRows);
      setSummary(summaryBody);
      setLoading(false);
    });
  }, [branchId]);

  const columns: Column<Sale>[] = [
    { header: "Branch", cell: (r) => r.branchName ?? "—" },
    { header: "Total", cell: (r) => `₱${Number(r.totalAmount).toFixed(2)}` },
    { header: "Discount", cell: (r) => (r.discountType === "senior_pwd" ? "Senior/PWD" : "—") },
    { header: "Cashier", cell: (r) => r.importedByName ?? "—" },
    { header: "When", cell: (r) => new Date(r.importedAt).toLocaleString() },
    {
      header: "",
      cell: (r) => (
        <Link href={`/pos/receipt/${r.id}`} className="text-sm text-blue-600 hover:underline">
          View Receipt
        </Link>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/pos" className="text-lg font-semibold text-gray-900">
            ← Point of Sale
          </Link>
          <span className="text-sm text-gray-400">Sales History</span>
        </div>
        <div className="flex items-center gap-4">
          {branches.length > 1 && (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <SignOutButton />
        </div>
      </header>

      <main className="p-6">
        {summary && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Today's Sales</p>
              <p className="text-2xl font-semibold text-gray-900">₱{Number(summary.totalSales).toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Transactions Today</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.transactionCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Top Seller Today</p>
              <p className="text-lg font-semibold text-gray-900">{summary.topProducts[0]?.productName ?? "—"}</p>
            </div>
          </div>
        )}

        {summary && summary.topProducts.length > 0 && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Top Products Today</h2>
            <ul className="space-y-1 text-sm">
              {summary.topProducts.map((p) => (
                <li key={p.productId} className="flex justify-between text-gray-700">
                  <span>{p.productName}</span>
                  <span>
                    {p.totalQuantity} sold — ₱{Number(p.totalRevenue).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <h2 className="mb-3 text-lg font-semibold text-gray-900">All Sales</h2>
        <DataTable columns={columns} rows={sales} loading={loading} emptyMessage="No sales recorded yet." />
      </main>
    </div>
  );
}
