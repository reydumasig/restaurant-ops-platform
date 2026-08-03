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

type Branch = { id: string; name: string };
type Item = { id: string; sku: string; name: string };
type Line = { itemType: "raw_material" | "product"; itemId: string; quantity: string };

export default function NewTransferPage() {
  const router = useRouter();
  const { branches: fromBranches } = useBranchSelector();
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [rawMaterials, setRawMaterials] = useState<Item[]>([]);
  const [products, setProducts] = useState<Item[]>([]);
  const [lines, setLines] = useState<Line[]>([{ itemType: "raw_material", itemId: "", quantity: "" }]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then(setAllBranches);
    fetch("/api/raw-materials")
      .then((r) => r.json())
      .then(setRawMaterials);
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts);
  }, []);

  useEffect(() => {
    if (fromBranches.length > 0 && !fromBranchId) setFromBranchId(fromBranches[0].id);
  }, [fromBranches, fromBranchId]);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { itemType: "raw_material", itemId: "", quantity: "" }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (fromBranchId === toBranchId) {
      setError("Source and destination branch must differ");
      return;
    }

    const items = lines
      .filter((l) => l.itemId && l.quantity)
      .map((l) => ({ itemType: l.itemType, itemId: l.itemId, quantity: Number(l.quantity) }));

    if (items.length === 0) {
      setError("Add at least one item");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromBranchId, toBranchId, items, notes: notes || undefined }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }

    const created = await res.json();
    toast.success("Transfer dispatched");
    router.push(`/transfers/${created.id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">New Stock Transfer</h1>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>From Branch</Label>
                <Select value={fromBranchId} onValueChange={setFromBranchId} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {fromBranches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>To Branch</Label>
                <Select value={toBranchId} onValueChange={setToBranchId} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {allBranches
                      .filter((b) => b.id !== fromBranchId)
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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
                {lines.map((line, i) => {
                  const items = line.itemType === "raw_material" ? rawMaterials : products;
                  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
                  return (
                    <div key={i} className="flex gap-2">
                      <Select
                        value={line.itemType}
                        onValueChange={(value) => updateLine(i, { itemType: value as "raw_material" | "product", itemId: "" })}
                      >
                        <SelectTrigger className="w-40 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="raw_material">Raw Material</SelectItem>
                          <SelectItem value="product">Product</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={line.itemId} onValueChange={(value) => updateLine(i, { itemId: value })}>
                        <SelectTrigger className="w-0 min-w-0 flex-1">
                          <SelectValue placeholder="Select item…" />
                        </SelectTrigger>
                        <SelectContent>
                          {sorted.map((item) => (
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
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)} className="shrink-0 text-muted-foreground hover:text-destructive">
                        ✕
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Creating…" : "Dispatch Transfer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
