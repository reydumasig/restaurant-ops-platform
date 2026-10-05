"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Recipe = {
  id: string;
  name: string;
  productId: string | null;
  outputRawMaterialId: string | null;
  yieldQuantity: string;
  yieldUnitId: string;
  active: boolean;
};

type Product = { id: string; name: string };
type RawMaterial = { id: string; name: string };
type Unit = { id: string; abbreviation: string };

export default function RecipesPage() {
  const [rows, setRows] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/recipes").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/raw-materials").then((r) => r.json()),
      fetch("/api/units").then((r) => r.json()),
    ]).then(([recipeRows, productRows, rawMaterialRows, unitRows]) => {
      setRows(recipeRows);
      setProducts(productRows);
      setRawMaterials(rawMaterialRows);
      setUnits(unitRows);
      setLoading(false);
    });
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  const rawMaterialById = useMemo(() => new Map(rawMaterials.map((r) => [r.id, r.name])), [rawMaterials]);
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u.abbreviation])), [units]);

  async function toggleActive(row: Recipe) {
    if (togglingId) return;
    setTogglingId(row.id);
    try {
      const res = await fetch(`/api/recipes/${row.id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !row.active }),
      });
      if (res.ok) {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r)));
      }
    } finally {
      setTogglingId(null);
    }
  }

  const columns: Column<Recipe>[] = [
    { header: "Recipe", cell: (r) => r.name },
    {
      header: "Produces",
      cell: (r) => (r.outputRawMaterialId ? rawMaterialById.get(r.outputRawMaterialId) : productById.get(r.productId ?? "")) ?? "—",
    },
    { header: "Yield", cell: (r) => `${r.yieldQuantity} ${unitById.get(r.yieldUnitId) ?? ""}` },
    {
      header: "Status",
      cell: (r) => <Badge variant={r.active ? "success" : "secondary"}>{r.active ? "Active" : "Inactive"}</Badge>,
    },
    {
      header: "",
      cell: (r) => (
        <Button
          variant="link"
          size="sm"
          onClick={() => toggleActive(r)}
          disabled={togglingId === r.id}
          className={cn("h-auto p-0", r.active ? "text-destructive" : "text-success")}
        >
          {togglingId === r.id ? "…" : r.active ? "Deactivate" : "Activate"}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Recipes / BOM</h1>
        <Button asChild>
          <Link href="/production/recipes/new">New Recipe</Link>
        </Button>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No recipes yet." />
    </div>
  );
}
