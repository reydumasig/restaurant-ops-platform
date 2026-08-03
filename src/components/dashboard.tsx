"use client";

import { useEffect, useState } from "react";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">Total Inventory Value</p>
            <p className="text-2xl font-semibold text-gray-900">₱{summary.totalInventoryValue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">Sales Today</p>
            <p className="text-2xl font-semibold text-gray-900">₱{Number(summary.salesToday.totalSales).toFixed(2)}</p>
            <p className="text-xs text-gray-500">{summary.salesToday.transactionCount} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">Low Stock Alerts</p>
            <p className={`text-2xl font-semibold ${summary.lowStockAlerts.length > 0 ? "text-red-600" : "text-gray-900"}`}>
              {summary.lowStockAlerts.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
