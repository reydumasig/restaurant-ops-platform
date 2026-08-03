"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type TransferItem = {
  id: string;
  quantitySent: string;
  quantityReceived: string | null;
  meta?: { name: string; sku: string };
};

type TransferDetail = {
  transfer: {
    id: string;
    transferNo: string;
    status: "pending" | "in_transit" | "received" | "cancelled";
    fromBranchName?: string;
    toBranchName?: string;
    createdByName?: string;
    createdAt: string;
    receivedByName?: string | null;
    receivedAt: string | null;
    notes: string | null;
  };
  rawMaterialItems: TransferItem[];
  productItems: TransferItem[];
};

export default function TransferDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<TransferDetail | null>(null);
  const [receivedQty, setReceivedQty] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await fetch(`/api/transfers/${params.id}`);
    if (!res.ok) return;
    const body: TransferDetail = await res.json();
    setData(body);
    const initial: Record<string, string> = {};
    [...body.rawMaterialItems, ...body.productItems].forEach((item) => {
      initial[item.id] = item.quantitySent;
    });
    setReceivedQty(initial);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;

  const { transfer, rawMaterialItems, productItems } = data;

  async function handleReceive() {
    setError(null);
    setSubmitting(true);

    const res = await fetch(`/api/transfers/${transfer.id}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawMaterialReceipts: rawMaterialItems.map((i) => ({ id: i.id, quantityReceived: Number(receivedQty[i.id] ?? 0) })),
        productReceipts: productItems.map((i) => ({ id: i.id, quantityReceived: Number(receivedQty[i.id] ?? 0) })),
      }),
    });

    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }
    load();
  }

  async function handleCancel() {
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/transfers/${transfer.id}/cancel`, { method: "POST" });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }
    load();
  }

  const allItems = [
    ...rawMaterialItems.map((i) => ({ ...i, kind: "Raw Material" as const })),
    ...productItems.map((i) => ({ ...i, kind: "Product" as const })),
  ];

  return (
    <div className="max-w-2xl">
      <button onClick={() => router.push("/transfers")} className="mb-4 text-sm text-blue-600 hover:underline">
        ← Back to history
      </button>

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">{transfer.transferNo}</h1>
          <span className="text-sm font-medium text-gray-600">{transfer.status.replace("_", " ")}</span>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {transfer.fromBranchName} → {transfer.toBranchName}
        </p>
        <p className="text-sm text-gray-500">
          Created by {transfer.createdByName} on {new Date(transfer.createdAt).toLocaleString()}
        </p>
        {transfer.receivedByName && (
          <p className="text-sm text-gray-500">
            Received by {transfer.receivedByName} on {transfer.receivedAt && new Date(transfer.receivedAt).toLocaleString()}
          </p>
        )}
        {transfer.notes && <p className="mt-2 text-sm text-gray-600">Notes: {transfer.notes}</p>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Item</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Sent</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allItems.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2 text-gray-700">
                  {item.meta?.name} ({item.kind})
                </td>
                <td className="px-4 py-2 text-gray-700">{item.quantitySent}</td>
                <td className="px-4 py-2">
                  {transfer.status === "in_transit" ? (
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={receivedQty[item.id] ?? ""}
                      onChange={(e) => setReceivedQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    item.quantityReceived ?? "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {transfer.status === "in_transit" && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleReceive}
            disabled={submitting}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Confirm Receipt
          </button>
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Cancel Transfer
          </button>
        </div>
      )}
    </div>
  );
}
