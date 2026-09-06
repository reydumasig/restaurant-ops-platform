"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type PoItem = {
  id: string;
  rawMaterialId: string;
  quantityOrdered: string;
  unitCost: string;
  quantityReceived: string | null;
  actualUnitCost: string | null;
  meta?: { name: string; sku: string };
};

type PoDetail = {
  po: {
    id: string;
    poNumber: string;
    status: "ordered" | "received" | "cancelled";
    supplierName?: string;
    branchName?: string;
    createdAt: string;
    receivedAt: string | null;
    notes: string | null;
  };
  items: PoItem[];
};

const STATUS_VARIANTS: Record<PoDetail["po"]["status"], "warning" | "success" | "destructive"> = {
  ordered: "warning",
  received: "success",
  cancelled: "destructive",
};

const STATUS_LABELS: Record<PoDetail["po"]["status"], string> = {
  ordered: "Ordered",
  received: "Received",
  cancelled: "Cancelled",
};

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<PoDetail | null>(null);
  const [receivedQty, setReceivedQty] = useState<Record<string, string>>({});
  const [actualCost, setActualCost] = useState<Record<string, string>>({});
  const [expiryDate, setExpiryDate] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"receive" | "cancel" | null>(null);

  async function load() {
    const res = await fetch(`/api/purchase-orders/${params.id}`);
    if (!res.ok) return;
    const body: PoDetail = await res.json();
    setData(body);
    const qty: Record<string, string> = {};
    const cost: Record<string, string> = {};
    body.items.forEach((item) => {
      qty[item.id] = item.quantityOrdered;
      cost[item.id] = item.unitCost;
    });
    setReceivedQty(qty);
    setActualCost(cost);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const { po, items } = data;

  async function handleReceive() {
    if (action) return;
    setError(null);
    setAction("receive");

    try {
      const res = await fetch(`/api/purchase-orders/${po.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipts: items.map((i) => ({
            id: i.id,
            quantityReceived: Number(receivedQty[i.id] ?? 0),
            actualUnitCost: Number(actualCost[i.id] ?? i.unitCost),
            expiryDate: expiryDate[i.id] || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong");
        return;
      }

      const result = await res.json();
      if (result.priceWarnings?.length > 0) {
        for (const w of result.priceWarnings) {
          const rm = items.find((i) => i.rawMaterialId === w.rawMaterialId)?.meta?.name ?? "an item";
          toast.warning(`${rm}: received at ₱${Number(w.unitCost).toFixed(2)}, ${w.percentAboveAverage.toFixed(0)}% above the recent average (₱${Number(w.average).toFixed(2)})`);
        }
      } else {
        toast.success("Purchase order received");
      }
      await load();
    } finally {
      setAction(null);
    }
  }

  async function handleCancel() {
    if (action) return;
    setError(null);
    setAction("cancel");
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong");
        return;
      }
      await load();
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <Button variant="link" size="sm" className="mb-4 h-auto p-0" onClick={() => router.push("/purchasing")}>
        ← Back to Purchase Orders
      </Button>

      <Card className="mb-4">
        <CardContent>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">{po.poNumber}</h1>
            <Badge variant={STATUS_VARIANTS[po.status]} pulse={po.status === "ordered"}>
              {STATUS_LABELS[po.status]}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-foreground">
            {po.supplierName} → {po.branchName}
          </p>
          <p className="text-sm text-muted-foreground">Created {new Date(po.createdAt).toLocaleString()}</p>
          {po.receivedAt && <p className="text-sm text-muted-foreground">Received {new Date(po.receivedAt).toLocaleString()}</p>}
          {po.notes && <p className="mt-2 text-sm text-foreground">Notes: {po.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Actual Cost</TableHead>
                <TableHead>Expiry Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const discrepancy =
                  item.quantityReceived != null && Number(item.quantityReceived) !== Number(item.quantityOrdered);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.meta?.name}</TableCell>
                    <TableCell>{item.quantityOrdered}</TableCell>
                    <TableCell>₱{Number(item.unitCost).toFixed(4)}</TableCell>
                    <TableCell>
                      {po.status === "ordered" ? (
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={receivedQty[item.id] ?? ""}
                          onChange={(e) => setReceivedQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-24"
                        />
                      ) : (
                        <span className={discrepancy ? "text-warning" : undefined}>{item.quantityReceived ?? "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {po.status === "ordered" ? (
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={actualCost[item.id] ?? ""}
                          onChange={(e) => setActualCost((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-24"
                        />
                      ) : (
                        (item.actualUnitCost && `₱${Number(item.actualUnitCost).toFixed(4)}`) ?? "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {po.status === "ordered" ? (
                        <Input
                          type="date"
                          value={expiryDate[item.id] ?? ""}
                          onChange={(e) => setExpiryDate((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-36"
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {po.status === "ordered" && (
        <div className="mt-4 flex gap-3">
          <Button variant="success" onClick={handleReceive} disabled={action !== null}>
            {action === "receive" ? "Confirming…" : "Confirm Receipt"}
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={action !== null}>
            {action === "cancel" ? "Cancelling…" : "Cancel Purchase Order"}
          </Button>
        </div>
      )}
    </div>
  );
}
