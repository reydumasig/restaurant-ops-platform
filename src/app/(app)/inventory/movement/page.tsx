"use client";

import { useEffect, useMemo, useState } from "react";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Item = { id: string; sku: string; name: string; unitId: string };
type RawMaterialItem = Item & { purchaseUnitLabel: string | null; purchaseUnitConversionFactor: string | null };
type Unit = { id: string; abbreviation: string };

type Mode = "stock-in" | "stock-out" | "adjustment";

const MODE_LABELS: Record<Mode, string> = {
  "stock-in": "Stock In",
  "stock-out": "Stock Out",
  adjustment: "Adjustment",
};

export default function StockMovementPage() {
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [mode, setMode] = useState<Mode>("stock-in");
  const [itemType, setItemType] = useState<"raw_material" | "product">("raw_material");
  const [rawMaterials, setRawMaterials] = useState<RawMaterialItem[]>([]);
  const [products, setProducts] = useState<Item[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [quantityUnitMode, setQuantityUnitMode] = useState<"tracked" | "purchase">("tracked");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/raw-materials")
      .then((r) => r.json())
      .then(setRawMaterials);
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts);
    fetch("/api/units")
      .then((r) => r.json())
      .then(setUnits);
  }, []);

  const items = itemType === "raw_material" ? rawMaterials : products;
  const sortedItems = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u.abbreviation])), [units]);
  const selectedItem = items.find((i) => i.id === itemId);
  const trackedUnitAbbr = selectedItem ? unitById.get(selectedItem.unitId) : undefined;
  const selectedRawMaterial = itemType === "raw_material" ? (selectedItem as RawMaterialItem | undefined) : undefined;
  const hasPurchaseUnit = !!(selectedRawMaterial?.purchaseUnitLabel && selectedRawMaterial?.purchaseUnitConversionFactor);
  const conversionFactor = hasPurchaseUnit ? Number(selectedRawMaterial!.purchaseUnitConversionFactor) : null;
  const effectiveUnitMode = hasPurchaseUnit ? quantityUnitMode : "tracked";
  const convertedQuantity =
    effectiveUnitMode === "purchase" && conversionFactor && quantity ? Number(quantity) * conversionFactor : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const endpoint = mode === "stock-in" ? "/api/inventory/stock-in" : mode === "stock-out" ? "/api/inventory/stock-out" : "/api/inventory/adjustment";
    const quantityInTrackedUnit = convertedQuantity ?? Number(quantity);

    const body =
      mode === "adjustment"
        ? { branchId, itemType, itemId, correctedQuantity: quantityInTrackedUnit, notes: notes || undefined }
        : {
            branchId,
            itemType,
            itemId,
            quantity: quantityInTrackedUnit,
            notes: notes || undefined,
            expiryDate: mode === "stock-in" && itemType === "raw_material" ? expiryDate || undefined : undefined,
          };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);

    if (!res.ok) {
      const resBody = await res.json().catch(() => ({}));
      setError(resBody.error ?? "Something went wrong");
      return;
    }

    setSuccess(`${MODE_LABELS[mode]} recorded.`);
    setItemId("");
    setQuantity("");
    setQuantityUnitMode("tracked");
    setExpiryDate("");
    setNotes("");
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-xl font-semibold text-foreground">Stock In / Out / Adjust</h1>

      <div className="mb-4 flex gap-2">
        {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
          <Button
            key={m}
            type="button"
            variant={mode === m ? "default" : "outline"}
            onClick={() => {
              setMode(m);
              setError(null);
              setSuccess(null);
            }}
          >
            {MODE_LABELS[m]}
          </Button>
        ))}
      </div>

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
                <p className="text-sm text-muted-foreground">{branches[0]?.name ?? "—"}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Item Type</Label>
              <Select
                value={itemType}
                onValueChange={(value) => {
                  setItemType(value as "raw_material" | "product");
                  setItemId("");
                  setQuantityUnitMode("tracked");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw_material">Raw Material</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Item</Label>
              <Select
                value={itemId}
                onValueChange={(value) => {
                  setItemId(value);
                  setQuantityUnitMode("tracked");
                }}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an item…" />
                </SelectTrigger>
                <SelectContent>
                  {sortedItems.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} ({i.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                {mode === "adjustment" ? "Corrected Quantity (new total on hand)" : "Quantity"}
                {effectiveUnitMode === "tracked" && trackedUnitAbbr ? ` (${trackedUnitAbbr})` : ""}
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="flex-1"
                />
                {hasPurchaseUnit && (
                  <Select value={quantityUnitMode} onValueChange={(value) => setQuantityUnitMode(value as "tracked" | "purchase")}>
                    <SelectTrigger className="w-32 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tracked">{trackedUnitAbbr}</SelectItem>
                      <SelectItem value="purchase">{selectedRawMaterial!.purchaseUnitLabel}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              {convertedQuantity != null && (
                <p className="text-xs text-muted-foreground">
                  = {convertedQuantity.toLocaleString()} {trackedUnitAbbr}
                </p>
              )}
            </div>

            {mode === "stock-in" && itemType === "raw_material" && (
              <div className="space-y-1.5">
                <Label>Expiry Date (optional)</Label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-success">{success}</p>}

            <Button type="submit" disabled={submitting || !branchId} className="w-full">
              {submitting && <Spinner />}
              {submitting ? "Saving…" : `Record ${MODE_LABELS[mode]}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
