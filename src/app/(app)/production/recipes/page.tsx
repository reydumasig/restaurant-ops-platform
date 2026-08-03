"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table";

type Recipe = {
  id: string;
  name: string;
  productId: string;
  yieldQuantity: string;
  yieldUnitId: string;
  active: boolean;
};

type Product = { id: string; name: string };
type Unit = { id: string; abbreviation: string };

export default function RecipesPage() {
  const [rows, setRows] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/recipes").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/units").then((r) => r.json()),
    ]).then(([recipeRows, productRows, unitRows]) => {
      setRows(recipeRows);
      setProducts(productRows);
      setUnits(unitRows);
      setLoading(false);
    });
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u.abbreviation])), [units]);

  async function toggleActive(row: Recipe) {
    const res = await fetch(`/api/recipes/${row.id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !row.active }),
    });
    if (res.ok) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r)));
    }
  }

  const columns: Column<Recipe>[] = [
    { header: "Recipe", cell: (r) => r.name },
    { header: "Produces", cell: (r) => productById.get(r.productId) ?? "—" },
    { header: "Yield", cell: (r) => `${r.yieldQuantity} ${unitById.get(r.yieldUnitId) ?? ""}` },
    {
      header: "Status",
      cell: (r) => <span className={r.active ? "text-green-700" : "text-gray-400"}>{r.active ? "Active" : "Inactive"}</span>,
    },
    {
      header: "",
      cell: (r) => (
        <button onClick={() => toggleActive(r)} className="text-sm text-gray-600 hover:underline">
          {r.active ? "Deactivate" : "Activate"}
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Recipes / BOM</h1>
        <Link href="/production/recipes/new" className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">
          New Recipe
        </Link>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No recipes yet." />
    </div>
  );
}
