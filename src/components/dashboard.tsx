"use client";

import { useEffect, useState } from "react";
import { useBranchSelector } from "@/hooks/use-branch-selector";

type Summary = {
  inventoryByBranch: { branchId: string; branchName: string; rawMaterialValue: number; productValue: number; totalValue: number }[];
  totalInventoryValue: number;
  lowStockAlerts: { branchId: string; branchName?: string; name: string; sku: string; quantity: string; reorderPoint: string }[];
  salesToday: { totalSales: string; transactionCount: number; topProducts: { productId: string; productName: string; totalQuantity: string; totalRevenue: string }[] };
};

export function Dashboard() {
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard/summary${branchId ? `?branchId=${branchId}` : ""}`)
      .then((res) => res.json())
      .then((data) => {
        setSummary(data);
        setLoading(false);
      });
  }, [branchId]);

  if (loading || !summary) return <p className="text-sm text-gray-500">Loading dashboard…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Executive Dashboard</h2>
        {branches.length > 1 && (
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Inventory Value</p>
          <p className="text-2xl font-semibold text-gray-900">₱{summary.totalInventoryValue.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Sales Today</p>
          <p className="text-2xl font-semibold text-gray-900">₱{Number(summary.salesToday.totalSales).toFixed(2)}</p>
          <p className="text-xs text-gray-500">{summary.salesToday.transactionCount} transactions</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Low Stock Alerts</p>
          <p className={`text-2xl font-semibold ${summary.lowStockAlerts.length > 0 ? "text-red-600" : "text-gray-900"}`}>
            {summary.lowStockAlerts.length}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Inventory Value by Branch</h3>
          {summary.inventoryByBranch.length === 0 ? (
            <p className="text-sm text-gray-400">No branches to show.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {summary.inventoryByBranch.map((b) => (
                <li key={b.branchId} className="flex justify-between text-gray-700">
                  <span>{b.branchName}</span>
                  <span>₱{b.totalValue.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Top Selling Products Today</h3>
          {summary.salesToday.topProducts.length === 0 ? (
            <p className="text-sm text-gray-400">No sales yet today.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {summary.salesToday.topProducts.map((p) => (
                <li key={p.productId} className="flex justify-between text-gray-700">
                  <span>{p.productName}</span>
                  <span>{p.totalQuantity} sold</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Low Stock Alerts</h3>
        {summary.lowStockAlerts.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing below reorder point.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {summary.lowStockAlerts.map((a) => (
              <li key={`${a.branchId}-${a.sku}`} className="flex justify-between text-red-600">
                <span>
                  {a.name} ({a.branchName})
                </span>
                <span>
                  {a.quantity} left, reorder at {a.reorderPoint}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
