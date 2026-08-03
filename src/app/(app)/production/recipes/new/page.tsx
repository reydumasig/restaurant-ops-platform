"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: string; sku: string; name: string };
type RawMaterial = { id: string; sku: string; name: string; unitId: string };
type Unit = { id: string; name: string; abbreviation: string };
type Line = { rawMaterialId: string; quantity: string; unitId: string };

export default function NewRecipePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [yieldQuantity, setYieldQuantity] = useState("1");
  const [yieldUnitId, setYieldUnitId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ rawMaterialId: "", quantity: "", unitId: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/raw-materials").then((r) => r.json()),
      fetch("/api/units").then((r) => r.json()),
    ]).then(([productRows, rawMaterialRows, unitRows]) => {
      setProducts(productRows);
      setRawMaterials(rawMaterialRows);
      setUnits(unitRows);
      setYieldUnitId(unitRows.find((u: Unit) => u.abbreviation === "pc")?.id ?? unitRows[0]?.id ?? "");
    });
  }, []);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const next = { ...l, ...patch };
        if (patch.rawMaterialId) {
          const rm = rawMaterials.find((r) => r.id === patch.rawMaterialId);
          if (rm) next.unitId = rm.unitId;
        }
        return next;
      }),
    );
  }

  function addLine() {
    setLines((prev) => [...prev, { rawMaterialId: "", quantity: "", unitId: "" }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const items = lines
      .filter((l) => l.rawMaterialId && l.quantity)
      .map((l) => ({ rawMaterialId: l.rawMaterialId, quantity: Number(l.quantity), unitId: l.unitId }));

    if (items.length === 0) {
      setError("Add at least one ingredient");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, productId, yieldQuantity: Number(yieldQuantity), yieldUnitId, items }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }

    router.push("/production/recipes");
  }

  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));
  const sortedRawMaterials = [...rawMaterials].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">New Recipe / BOM</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label className="text-sm font-medium text-gray-700">Recipe Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Chicken Inasal Solo"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Produces (Product)</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select product…</option>
            {sortedProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Yield Quantity</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={yieldQuantity}
              onChange={(e) => setYieldQuantity(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Yield Unit</label>
            <select
              value={yieldUnitId}
              onChange={(e) => setYieldUnitId(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.abbreviation})
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          e.g. yield 1 pc means the ingredient quantities below are for one serving; yield 40 pc means they're for one full batch.
        </p>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Ingredients (Raw Materials)</label>
            <button type="button" onClick={addLine} className="text-sm text-blue-600 hover:underline">
              + Add ingredient
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((line, i) => {
              const rm = rawMaterials.find((r) => r.id === line.rawMaterialId);
              const unitAbbr = units.find((u) => u.id === line.unitId)?.abbreviation ?? rm?.unitId;
              return (
                <div key={i} className="flex gap-2">
                  <select
                    value={line.rawMaterialId}
                    onChange={(e) => updateLine(i, { rawMaterialId: e.target.value })}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-2 text-sm"
                  >
                    <option value="">Select raw material…</option>
                    {sortedRawMaterials.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.sku})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, { quantity: e.target.value })}
                    className="w-24 rounded-md border border-gray-300 px-2 py-2 text-sm"
                  />
                  <span className="flex items-center px-1 text-sm text-gray-500">{unitAbbr}</span>
                  <button type="button" onClick={() => removeLine(i)} className="px-2 text-gray-400 hover:text-red-600">
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save Recipe"}
        </button>
      </form>
    </div>
  );
}
