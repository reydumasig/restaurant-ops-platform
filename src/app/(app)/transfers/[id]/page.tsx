"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoading } from "@/components/page-loading";
import { useCurrentUser } from "@/hooks/use-current-user";

type TransferItem = {
  id: string;
  quantityRequested: string;
  quantitySent: string | null;
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
    approvedByName?: string | null;
    approvedAt: string | null;
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
  pending: "Pending Approval",
  in_transit: "In Transit",
  received: "Received",
  cancelled: "Cancelled",
};

const COMMISSARY_ROLES = ["owner", "admin", "commissary_staff"];

export default function TransferDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [data, setData] = useState<TransferDetail | null>(null);
  const [receivedQty, setReceivedQty] = useState<Record<string, string>>({});
  const [sendQty, setSendQty] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"receive" | "cancel" | "approve" | "reject" | null>(null);

  async function load() {
    const res = await fetch(`/api/transfers/${params.id}`);
    if (!res.ok) return;
    const body: TransferDetail = await res.json();
    setData(body);
    const allItems = [...body.rawMaterialItems, ...body.productItems];
    const initialReceived: Record<string, string> = {};
    const initialSend: Record<string, string> = {};
    allItems.forEach((item) => {
      initialReceived[item.id] = item.quantitySent ?? "";
      initialSend[item.id] = item.quantityRequested;
    });
    setReceivedQty(initialReceived);
    setSendQty(initialSend);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (!data) return <PageLoading />;

  const { transfer, rawMaterialItems, productItems } = data;
  const canApprove = currentUser ? COMMISSARY_ROLES.includes(currentUser.roleKey) : false;

  async function handleReceive() {
    if (action) return;
    setError(null);
    setAction("receive");

    try {
      const res = await fetch(`/api/transfers/${transfer.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawMaterialReceipts: rawMaterialItems.map((i) => ({ id: i.id, quantityReceived: Number(receivedQty[i.id] ?? 0) })),
          productReceipts: productItems.map((i) => ({ id: i.id, quantityReceived: Number(receivedQty[i.id] ?? 0) })),
        }),
      });

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

  async function handleCancel() {
    if (action) return;
    setError(null);
    setAction("cancel");
    try {
      const res = await fetch(`/api/transfers/${transfer.id}/cancel`, { method: "POST" });
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

  async function handleApprove() {
    if (action) return;
    setError(null);
    setAction("approve");
    try {
      const res = await fetch(`/api/transfers/${transfer.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawMaterialLines: rawMaterialItems.map((i) => ({ id: i.id, quantityToSend: Number(sendQty[i.id] ?? 0) })),
          productLines: productItems.map((i) => ({ id: i.id, quantityToSend: Number(sendQty[i.id] ?? 0) })),
        }),
      });
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

  async function handleReject() {
    if (action) return;
    setError(null);
    setAction("reject");
    try {
      const res = await fetch(`/api/transfers/${transfer.id}/reject`, { method: "POST" });
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

  const allItems = [
    ...rawMaterialItems.map((i) => ({ ...i, kind: "Raw Material" as const })),
    ...productItems.map((i) => ({ ...i, kind: "Product" as const })),
  ];

  return (
    <div className="max-w-2xl">
      <Button variant="link" size="sm" className="mb-4 h-auto p-0 print:hidden" onClick={() => router.push("/transfers")}>
        ← Back to history
      </Button>

      <Card className="mb-4 print:border-none print:shadow-none">
        <CardContent>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">{transfer.transferNo}</h1>
            <Badge variant={STATUS_VARIANTS[transfer.status]} pulse={transfer.status === "in_transit"} className="print:hidden">
              {STATUS_LABELS[transfer.status]}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-foreground">
            {transfer.fromBranchName} → {transfer.toBranchName}
          </p>
          <p className="text-sm text-muted-foreground">
            Requested by {transfer.createdByName} on {new Date(transfer.createdAt).toLocaleString()}
          </p>
          {transfer.approvedByName && (
            <p className="text-sm text-muted-foreground">
              {transfer.status === "cancelled" ? "Rejected" : "Approved"} by {transfer.approvedByName} on{" "}
              {transfer.approvedAt && new Date(transfer.approvedAt).toLocaleString()}
            </p>
          )}
          {transfer.receivedByName && (
            <p className="text-sm text-muted-foreground">
              Received by {transfer.receivedByName} on {transfer.receivedAt && new Date(transfer.receivedAt).toLocaleString()}
            </p>
          )}
          {transfer.notes && <p className="mt-2 text-sm text-foreground">Notes: {transfer.notes}</p>}
          <div className="mt-4 hidden border-t pt-3 text-xs text-muted-foreground print:block">
            <div className="flex justify-between">
              <span>Prepared by: ___________________</span>
              <span>Received by: ___________________</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="print:border-none print:shadow-none">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Requested</TableHead>
                {transfer.status === "pending" ? (
                  <TableHead>{canApprove ? "Send" : "Status"}</TableHead>
                ) : (
                  <>
                    <TableHead>Sent</TableHead>
                    <TableHead>Received</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.meta?.name} ({item.kind})
                  </TableCell>
                  <TableCell>{item.quantityRequested}</TableCell>
                  {transfer.status === "pending" ? (
                    <TableCell>
                      {canApprove ? (
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={sendQty[item.id] ?? ""}
                          onChange={(e) => setSendQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-24 print:hidden"
                        />
                      ) : (
                        <span className="text-muted-foreground">Awaiting approval</span>
                      )}
                    </TableCell>
                  ) : (
                    <>
                      <TableCell>{item.quantitySent ?? "—"}</TableCell>
                      <TableCell>
                        {transfer.status === "in_transit" ? (
                          <Input
                            type="number"
                            step="0.0001"
                            min="0"
                            value={receivedQty[item.id] ?? ""}
                            onChange={(e) => setReceivedQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-24 print:hidden"
                          />
                        ) : (
                          item.quantityReceived ?? "—"
                        )}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {error && <p className="mt-4 text-sm text-destructive print:hidden">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-3 print:hidden">
        {transfer.status === "pending" && canApprove && (
          <>
            <Button variant="success" onClick={handleApprove} disabled={action !== null}>
              {action === "approve" ? "Approving…" : "Approve & Dispatch"}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={action !== null}>
              {action === "reject" ? "Rejecting…" : "Reject"}
            </Button>
          </>
        )}
        {transfer.status === "in_transit" && (
          <>
            <Button variant="success" onClick={handleReceive} disabled={action !== null}>
              {action === "receive" ? "Confirming…" : "Confirm Receipt"}
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={action !== null}>
              {action === "cancel" ? "Cancelling…" : "Cancel Transfer"}
            </Button>
          </>
        )}
        {(transfer.status === "in_transit" || transfer.status === "received") && (
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
        )}
      </div>
    </div>
  );
}
