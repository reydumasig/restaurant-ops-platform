"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Supplier = { id: string; name: string };
type RawMaterial = { id: string; sku: string; name: string };
type Line = { rawMaterialId: string; quantity: string; unitCost: string };

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [lines, setLines] = useState<Line[]>([{ rawMaterialId: "", quantity: "", unitCost: "" }]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((data: (Supplier & { active: boolean })[]) => setSuppliers(data.filter((s) => s.active)));
    fetch("/api/raw-materials")
      .then((r) => r.json())
      .then(setRawMaterials);
  }, []);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { rawMaterialId: "", quantity: "", unitCost: "" }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const items = lines
      .filter((l) => l.rawMaterialId && l.quantity && l.unitCost)
      .map((l) => ({ rawMaterialId: l.rawMaterialId, quantity: Number(l.quantity), unitCost: Number(l.unitCost) }));

    if (items.length === 0) {
      setError("Add at least one item");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, branchId, items, notes: notes || undefined }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong");
        return;
      }

      const created = await res.json();
      toast.success("Purchase order created");
      router.push(`/purchasing/${created.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  const sortedRawMaterials = [...rawMaterials].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-foreground">New Purchase Order</h1>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Receiving Branch</Label>
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
                  <p className="pt-2 text-sm text-muted-foreground">{branches[0]?.name ?? "—"}</p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="link" size="sm" onClick={addLine} className="h-auto p-0">
                  + Add item
                </Button>
              </div>
              <div className="space-y-2">
                {lines.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <Select value={line.rawMaterialId} onValueChange={(value) => updateLine(i, { rawMaterialId: value })}>
                      <SelectTrigger className="w-0 min-w-0 flex-1">
                        <SelectValue placeholder="Select raw material…" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedRawMaterials.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.sku})
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
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="Unit cost"
                      value={line.unitCost}
                      onChange={(e) => updateLine(i, { unitCost: e.target.value })}
                      className="w-28 shrink-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(i)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Creating…" : "Create Purchase Order"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
