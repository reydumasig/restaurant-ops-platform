"use client";

import { useEffect, useMemo, useState } from "react";
import { useBranchSelector } from "@/hooks/use-branch-selector";

type Item = { id: string; sku: string; name: string };

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
  const [rawMaterials, setRawMaterials] = useState<Item[]>([]);
  const [products, setProducts] = useState<Item[]>([]);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
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
  }, []);

  const items = itemType === "raw_material" ? rawMaterials : products;
  const sortedItems = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const endpoint = mode === "stock-in" ? "/api/inventory/stock-in" : mode === "stock-out" ? "/api/inventory/stock-out" : "/api/inventory/adjustment";

    const body =
      mode === "adjustment"
        ? { branchId, itemType, itemId, correctedQuantity: Number(quantity), notes: notes || undefined }
        : { branchId, itemType, itemId, quantity: Number(quantity), notes: notes || undefined };

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
    setNotes("");
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Stock In / Out / Adjust</h1>

      <div className="mb-4 flex gap-2">
        {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError(null);
              setSuccess(null);
            }}
            className={`rounded-md px-3 py-1.5 text-sm ${mode === m ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-300"}`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

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
          <label className="text-sm font-medium text-gray-700">Item Type</label>
          <select
            value={itemType}
            onChange={(e) => {
              setItemType(e.target.value as "raw_material" | "product");
              setItemId("");
            }}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="raw_material">Raw Material</option>
            <option value="product">Product</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Item</label>
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select an item…</option>
            {sortedItems.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.sku})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            {mode === "adjustment" ? "Corrected Quantity (new total on hand)" : "Quantity"}
          </label>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
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
        {success && <p className="text-sm text-green-700">{success}</p>}

        <button
          type="submit"
          disabled={submitting || !branchId}
          className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "Saving…" : `Record ${MODE_LABELS[mode]}`}
        </button>
      </form>
    </div>
  );
}
