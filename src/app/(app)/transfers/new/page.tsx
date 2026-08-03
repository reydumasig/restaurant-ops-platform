"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBranchSelector } from "@/hooks/use-branch-selector";

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
    router.push(`/transfers/${created.id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">New Stock Transfer</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">From Branch</label>
            <select
              value={fromBranchId}
              onChange={(e) => setFromBranchId(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select…</option>
              {fromBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">To Branch</label>
            <select
              value={toBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select…</option>
              {allBranches
                .filter((b) => b.id !== fromBranchId)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Items</label>
            <button type="button" onClick={addLine} className="text-sm text-blue-600 hover:underline">
              + Add item
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((line, i) => {
              const items = line.itemType === "raw_material" ? rawMaterials : products;
              const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
              return (
                <div key={i} className="flex gap-2">
                  <select
                    value={line.itemType}
                    onChange={(e) => updateLine(i, { itemType: e.target.value as "raw_material" | "product", itemId: "" })}
                    className="rounded-md border border-gray-300 px-2 py-2 text-sm"
                  >
                    <option value="raw_material">Raw Material</option>
                    <option value="product">Product</option>
                  </select>
                  <select
                    value={line.itemId}
                    onChange={(e) => updateLine(i, { itemId: e.target.value })}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-2 text-sm"
                  >
                    <option value="">Select item…</option>
                    {sorted.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
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
                  <button type="button" onClick={() => removeLine(i)} className="px-2 text-gray-400 hover:text-red-600">
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
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
          disabled={submitting}
          className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Dispatch Transfer"}
        </button>
      </form>
    </div>
  );
}
