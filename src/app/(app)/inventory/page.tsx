"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
          <span className="flex items-center gap-2">
            <span className={low ? "font-medium text-destructive" : ""}>
              {qty} {r.meta?.unitAbbreviation}
            </span>
            {low && <Badge variant="destructive">Low stock</Badge>}
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
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger>
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
        ) : (
          <span className="text-sm text-gray-500">{branches[0]?.name ?? ""}</span>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <Button variant={tab === "raw_material" ? "default" : "outline"} onClick={() => setTab("raw_material")}>
          Raw Materials
        </Button>
        <Button variant={tab === "product" ? "default" : "outline"} onClick={() => setTab("product")}>
          Products
        </Button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading || branchesLoading} emptyMessage="No stock recorded yet for this branch." />
    </div>
  );
}
