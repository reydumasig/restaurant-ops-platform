"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoading } from "@/components/page-loading";

type CountItem = {
  id: string;
  expectedQuantity: string;
  countedQuantity: string | null;
  meta?: { name: string; sku: string };
};

type CountDetail = {
  count: {
    id: string;
    countNumber: string;
    branchName?: string;
    itemType: "raw_material" | "product";
    status: "in_progress" | "completed" | "cancelled";
    startedAt?: string;
    createdAt: string;
    completedAt: string | null;
    notes: string | null;
  };
  items: CountItem[];
};

const STATUS_VARIANTS: Record<CountDetail["count"]["status"], "warning" | "success" | "destructive"> = {
  in_progress: "warning",
  completed: "success",
  cancelled: "destructive",
};

const STATUS_LABELS: Record<CountDetail["count"]["status"], string> = {
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function StockCountDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CountDetail | null>(null);
  const [countedQty, setCountedQty] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"complete" | "cancel" | null>(null);

  async function load() {
    const res = await fetch(`/api/stock-counts/${params.id}`);
    if (!res.ok) return;
    const body: CountDetail = await res.json();
    setData(body);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (!data) return <PageLoading />;

  const { count, items } = data;

  async function handleComplete() {
    if (action) return;
    setError(null);

    const counts = items
      .filter((i) => countedQty[i.id] !== undefined && countedQty[i.id] !== "")
      .map((i) => ({ id: i.id, countedQuantity: Number(countedQty[i.id]) }));

    if (counts.length === 0) {
      setError("Enter at least one counted quantity");
      return;
    }

    setAction("complete");
    try {
      const res = await fetch(`/api/stock-counts/${count.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counts }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong");
        return;
      }
      toast.success("Stock count completed — adjustments applied");
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
      const res = await fetch(`/api/stock-counts/${count.id}/cancel`, { method: "POST" });
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
      <Button variant="link" size="sm" className="mb-4 h-auto p-0" onClick={() => router.push("/inventory/counts")}>
        ← Back to Stock Counts
      </Button>

      <Card className="mb-4">
        <CardContent>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">{count.countNumber}</h1>
            <Badge variant={STATUS_VARIANTS[count.status]} pulse={count.status === "in_progress"}>
              {STATUS_LABELS[count.status]}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-foreground">
            {count.branchName} — {count.itemType === "raw_material" ? "Raw Materials" : "Products"}
          </p>
          <p className="text-sm text-muted-foreground">Started {new Date(count.createdAt).toLocaleString()}</p>
          {count.completedAt && <p className="text-sm text-muted-foreground">Completed {new Date(count.completedAt).toLocaleString()}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Counted</TableHead>
                <TableHead>Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const counted = item.countedQuantity != null ? Number(item.countedQuantity) : countedQty[item.id] ? Number(countedQty[item.id]) : null;
                const variance = counted != null ? counted - Number(item.expectedQuantity) : null;
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.meta?.name}</TableCell>
                    <TableCell>{item.expectedQuantity}</TableCell>
                    <TableCell>
                      {count.status === "in_progress" ? (
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          placeholder="—"
                          value={countedQty[item.id] ?? ""}
                          onChange={(e) => setCountedQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-24"
                        />
                      ) : (
                        (item.countedQuantity ?? "—")
                      )}
                    </TableCell>
                    <TableCell>
                      {variance == null ? (
                        "—"
                      ) : variance === 0 ? (
                        <span className="text-muted-foreground">0</span>
                      ) : (
                        <span className={variance < 0 ? "text-destructive" : "text-success"}>
                          {variance > 0 ? "+" : ""}
                          {variance}
                        </span>
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

      {count.status === "in_progress" && (
        <div className="mt-4 flex gap-3">
          <Button variant="success" onClick={handleComplete} disabled={action !== null}>
            {action === "complete" ? "Completing…" : "Complete Count"}
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={action !== null}>
            {action === "cancel" ? "Cancelling…" : "Cancel Count"}
          </Button>
        </div>
      )}
    </div>
  );
}
