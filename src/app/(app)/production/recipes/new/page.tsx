"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      <h1 className="mb-4 text-xl font-semibold text-foreground">New Recipe / BOM</h1>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Recipe Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Chicken Inasal Solo"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Produces (Product)</Label>
              <Select value={productId} onValueChange={setProductId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select product…" />
                </SelectTrigger>
                <SelectContent>
                  {sortedProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Yield Quantity</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={yieldQuantity}
                  onChange={(e) => setYieldQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Yield Unit</Label>
                <Select value={yieldUnitId} onValueChange={setYieldUnitId} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              e.g. yield 1 pc means the ingredient quantities below are for one serving; yield 40 pc means they're for one full batch.
            </p>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Ingredients (Raw Materials)</Label>
                <Button type="button" variant="link" size="sm" onClick={addLine} className="h-auto p-0">
                  + Add ingredient
                </Button>
              </div>
              <div className="space-y-2">
                {lines.map((line, i) => {
                  const rm = rawMaterials.find((r) => r.id === line.rawMaterialId);
                  const unitAbbr = units.find((u) => u.id === line.unitId)?.abbreviation ?? rm?.unitId;
                  return (
                    <div key={i} className="flex gap-2">
                      <Select value={line.rawMaterialId} onValueChange={(value) => updateLine(i, { rawMaterialId: value })}>
                        <SelectTrigger className="w-0 min-w-0 flex-1">
                          <SelectValue placeholder="Select raw material…" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedRawMaterials.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name} ({r.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="Qty"
                        value={line.quantity}
                        onChange={(e) => updateLine(i, { quantity: e.target.value })}
                        className="w-24 shrink-0"
                      />
                      <span className="flex items-center px-1 text-sm text-muted-foreground">{unitAbbr}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)} className="shrink-0 text-muted-foreground hover:text-destructive">
                        ✕
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Spinner />}
              {submitting ? "Saving…" : "Save Recipe"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
