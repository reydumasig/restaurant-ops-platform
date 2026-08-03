"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

const STATUS_VARIANTS: Record<TransferDetail["transfer"]["status"], "secondary" | "warning" | "success" | "destructive"> = {
  pending: "secondary",
  in_transit: "warning",
  received: "success",
  cancelled: "destructive",
};

const STATUS_LABELS: Record<TransferDetail["transfer"]["status"], string> = {
  pending: "Pending",
  in_transit: "In Transit",
  received: "Received",
  cancelled: "Cancelled",
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

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

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
      <Button variant="link" size="sm" className="mb-4 h-auto p-0" onClick={() => router.push("/transfers")}>
        ← Back to history
      </Button>

      <Card className="mb-4">
        <CardContent>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">{transfer.transferNo}</h1>
            <Badge variant={STATUS_VARIANTS[transfer.status]}>{STATUS_LABELS[transfer.status]}</Badge>
          </div>
          <p className="mt-2 text-sm text-foreground">
            {transfer.fromBranchName} → {transfer.toBranchName}
          </p>
          <p className="text-sm text-muted-foreground">
            Created by {transfer.createdByName} on {new Date(transfer.createdAt).toLocaleString()}
          </p>
          {transfer.receivedByName && (
            <p className="text-sm text-muted-foreground">
              Received by {transfer.receivedByName} on {transfer.receivedAt && new Date(transfer.receivedAt).toLocaleString()}
            </p>
          )}
          {transfer.notes && <p className="mt-2 text-sm text-foreground">Notes: {transfer.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.meta?.name} ({item.kind})
                  </TableCell>
                  <TableCell>{item.quantitySent}</TableCell>
                  <TableCell>
                    {transfer.status === "in_transit" ? (
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={receivedQty[item.id] ?? ""}
                        onChange={(e) => setReceivedQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-24"
                      />
                    ) : (
                      item.quantityReceived ?? "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {transfer.status === "in_transit" && (
        <div className="mt-4 flex gap-3">
          <Button variant="success" onClick={handleReceive} disabled={submitting}>
            Confirm Receipt
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={submitting}>
            Cancel Transfer
          </Button>
        </div>
      )}
    </div>
  );
}
