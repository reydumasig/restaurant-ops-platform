"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBranchSelector } from "@/hooks/use-branch-selector";

type Recipe = { id: string; name: string; productId: string; yieldQuantity: string; active: boolean };
type Product = { id: string; name: string };

export default function NewProductionRunPage() {
  const router = useRouter();
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [quantityProduced, setQuantityProduced] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data: Recipe[]) => setRecipes(data.filter((r) => r.active)));
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts);
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  const selectedRecipe = recipes.find((r) => r.id === recipeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/production/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId, branchId, quantityProduced: Number(quantityProduced), notes: notes || undefined }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }

    router.push("/production");
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">New Production Run</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label className="text-sm font-medium text-gray-700">Branch</label>
          {branches.length > 1 ? (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 text-sm text-gray-600">{branches[0]?.name ?? "—"}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Recipe</label>
          <select
            value={recipeId}
            onChange={(e) => setRecipeId(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select recipe…</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — produces {productById.get(r.productId) ?? "?"}
              </option>
            ))}
          </select>
          {selectedRecipe && (
            <p className="mt-1 text-xs text-gray-500">
              This recipe's batch yields {selectedRecipe.yieldQuantity} unit(s). Ingredient quantities scale automatically to the
              amount you produce below.
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Quantity Produced</label>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={quantityProduced}
            onChange={(e) => setQuantityProduced(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !branchId}
          className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Record Production Run"}
        </button>
      </form>
    </div>
  );
}
