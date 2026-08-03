"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { useBranchSelector } from "@/hooks/use-branch-selector";

type StockRow = {
  id: string;
  quantity: string;
  rawMaterialId?: string;
  productId?: string;
  meta?: { id: string; name: string; sku: string; unitAbbreviation: string; categoryName: string; reorderPoint?: string };
};

export default function StockLevelsPage() {
  const { branches, branchId, setBranchId, loading: branchesLoading } = useBranchSelector();
  const [rawMaterials, setRawMaterials] = useState<StockRow[]>([]);
  const [products, setProducts] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"raw_material" | "product">("raw_material");

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    fetch(`/api/inventory/stock?branchId=${branchId}`)
      .then((res) => res.json())
      .then((data) => {
        setRawMaterials(data.rawMaterials ?? []);
        setProducts(data.products ?? []);
        setLoading(false);
      });
  }, [branchId]);

  const columns: Column<StockRow>[] = [
    { header: "SKU", cell: (r) => <code className="text-xs text-gray-500">{r.meta?.sku}</code> },
    { header: "Name", cell: (r) => r.meta?.name ?? "—" },
    { header: "Category", cell: (r) => r.meta?.categoryName ?? "—" },
    {
      header: "Quantity",
      cell: (r) => {
        const qty = Number(r.quantity);
        const reorder = r.meta?.reorderPoint != null ? Number(r.meta.reorderPoint) : null;
        const low = reorder != null && reorder > 0 && qty <= reorder;
        return (
          <span className={low ? "font-medium text-red-600" : ""}>
            {qty} {r.meta?.unitAbbreviation}
            {low && " ⚠ low stock"}
          </span>
        );
      },
    },
  ];

  const rows = tab === "raw_material" ? rawMaterials : products;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Stock Levels</h1>
        {branches.length > 1 ? (
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-gray-500">{branches[0]?.name ?? ""}</span>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("raw_material")}
          className={`rounded-md px-3 py-1.5 text-sm ${tab === "raw_material" ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-300"}`}
        >
          Raw Materials
        </button>
        <button
          onClick={() => setTab("product")}
          className={`rounded-md px-3 py-1.5 text-sm ${tab === "product" ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-300"}`}
        >
          Products
        </button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading || branchesLoading} emptyMessage="No stock recorded yet for this branch." />
    </div>
  );
}
