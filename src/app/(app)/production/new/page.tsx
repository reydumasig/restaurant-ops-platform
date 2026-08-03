"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Branch</Label>
              {branches.length > 1 ? (
                <Select value={branchId} onValueChange={setBranchId} required>
                  <SelectTrigger className="w-full">
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
                <p className="text-sm text-gray-600">{branches[0]?.name ?? "—"}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Recipe</Label>
              <Select value={recipeId} onValueChange={setRecipeId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select recipe…" />
                </SelectTrigger>
                <SelectContent>
                  {recipes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} — produces {productById.get(r.productId) ?? "?"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRecipe && (
                <p className="text-xs text-gray-500">
                  This recipe's batch yields {selectedRecipe.yieldQuantity} unit(s). Ingredient quantities scale automatically to the
                  amount you produce below.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Quantity Produced</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={quantityProduced}
                onChange={(e) => setQuantityProduced(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting || !branchId} className="w-full">
              {submitting ? "Saving…" : "Record Production Run"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
