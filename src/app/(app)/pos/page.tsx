"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { SignOutButton } from "@/components/sign-out-button";
import { Modal } from "@/components/modal";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Shift = { id: string; branchId: string; startingCash: string; status: "open" | "closed" };
type ClosedShiftSummary = { startingCash: string; expectedCash: string; countedCash: string; cashVariance: string };
type OpenOrder = { id: string; tableLabel: string | null; totalAmount: string; importedAt: string };

export default function PosPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { branches, branchId, setBranchId } = useBranchSelector();

  const [shift, setShift] = useState<Shift | null | undefined>(undefined); // undefined = loading
  const [startingCash, setStartingCash] = useState("");
  const [openingShift, setOpeningShift] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [countedCash, setCountedCash] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");
  const [closingShift, setClosingShift] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closedSummary, setClosedSummary] = useState<ClosedShiftSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [tableLabel, setTableLabel] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);

  function loadOpenShift() {
    if (!branchId) return;
    setShift(undefined);
    fetch(`/api/pos-shifts/open?branchId=${branchId}`)
      .then((r) => r.json())
      .then(setShift);
  }

  function loadOpenOrders() {
    if (!branchId) return;
    setOrdersLoading(true);
    fetch(`/api/pos/orders?branchId=${branchId}`)
      .then((r) => r.json())
      .then((data) => {
        setOpenOrders(data);
        setOrdersLoading(false);
      });
  }

  useEffect(loadOpenShift, [branchId]);
  useEffect(loadOpenOrders, [branchId]);

  async function handleStartShift(e: React.FormEvent) {
    e.preventDefault();
    if (openingShift || !branchId) return;
    setError(null);
    setOpeningShift(true);
    try {
      const res = await fetch("/api/pos-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, startingCash: Number(startingCash || 0) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong");
        return;
      }
      setStartingCash("");
      setClosedSummary(null);
      loadOpenShift();
    } finally {
      setOpeningShift(false);
    }
  }

  async function handleCloseShift() {
    if (closingShift || !shift) return;
    setCloseError(null);
    setClosingShift(true);
    try {
      const res = await fetch(`/api/pos-shifts/${shift.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countedCash: Number(countedCash || 0), notes: shiftNotes || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setCloseError(body.error ?? "Something went wrong");
        return;
      }
      const closed = await res.json();
      setClosedSummary(closed);
      setCloseModalOpen(false);
      setCountedCash("");
      setShiftNotes("");
      toast.success("Shift closed");
      loadOpenShift();
    } finally {
      setClosingShift(false);
    }
  }

  async function handleNewOrder() {
    if (creatingOrder || !branchId) return;
    setCreatingOrder(true);
    try {
      const res = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, tableLabel: tableLabel || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Something went wrong");
        return;
      }
      const order = await res.json();
      setNewOrderModalOpen(false);
      setTableLabel("");
      router.push(`/pos/orders/${order.id}`);
    } finally {
      setCreatingOrder(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:h-screen">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          {(currentUser?.roleKey === "owner" || currentUser?.roleKey === "admin") && (
            <Link href="/" className="whitespace-nowrap text-sm text-primary hover:underline">
              ← Dashboard
            </Link>
          )}
          <h1 className="whitespace-nowrap text-lg font-semibold text-foreground">Point of Sale</h1>
          <Link href="/pos/history" className="whitespace-nowrap text-sm text-primary hover:underline">
            Sales History
          </Link>
          <Link href="/pos/shifts" className="whitespace-nowrap text-sm text-primary hover:underline">
            Shift History
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {shift && (
            <Button variant="outline" size="sm" onClick={() => setCloseModalOpen(true)}>
              Close Shift
            </Button>
          )}
          {branches.length > 1 && (
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
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
          )}
          <Link href="/faqs" className="whitespace-nowrap text-sm text-muted-foreground hover:text-foreground hover:underline">
            FAQs
          </Link>
          <SignOutButton />
        </div>
      </header>

      {!branchId ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Select a branch to continue.</p>
        </div>
      ) : shift === undefined ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      ) : shift === null ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="w-full max-w-sm">
            <CardContent>
              <h2 className="mb-1 text-lg font-semibold text-foreground">Start Shift</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Enter the starting cash float to open the register before ringing up sales.
              </p>
              {closedSummary && (
                <div className="mb-4 rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <p className="mb-1 font-medium text-foreground">Previous shift closed</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Expected cash</span>
                    <span>₱{Number(closedSummary.expectedCash).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Counted cash</span>
                    <span>₱{Number(closedSummary.countedCash).toFixed(2)}</span>
                  </div>
                  <div
                    className={`flex justify-between font-medium ${Number(closedSummary.cashVariance) < 0 ? "text-destructive" : Number(closedSummary.cashVariance) > 0 ? "text-warning" : "text-success"}`}
                  >
                    <span>Variance</span>
                    <span>
                      {Number(closedSummary.cashVariance) > 0 ? "+" : ""}
                      ₱{Number(closedSummary.cashVariance).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              <form onSubmit={handleStartShift} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Starting Cash</Label>
                  <Input type="number" step="0.01" min="0" value={startingCash} onChange={(e) => setStartingCash(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={openingShift} className="w-full">
                  {openingShift ? "Starting…" : "Start Shift"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Open Orders</h2>
            <Button onClick={() => setNewOrderModalOpen(true)}>+ New Order</Button>
          </div>

          {ordersLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : openOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open orders — start one for a new table or takeout order.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {openOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => router.push(`/pos/orders/${order.id}`)}
                  className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary"
                >
                  <p className="font-semibold text-foreground">{order.tableLabel || `Order #${order.id.slice(0, 8).toUpperCase()}`}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Opened {new Date(order.importedAt).toLocaleTimeString()}</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">₱{Number(order.totalAmount).toFixed(2)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={closeModalOpen} onClose={() => setCloseModalOpen(false)} title="Close Shift">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Count the cash drawer and enter what you actually counted — this shift started with ₱
            {shift ? Number(shift.startingCash).toFixed(2) : "0.00"}.
          </p>
          <div className="space-y-1.5">
            <Label>Counted Cash</Label>
            <Input type="number" step="0.01" min="0" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={shiftNotes} onChange={(e) => setShiftNotes(e.target.value)} rows={2} />
          </div>
          {closeError && <p className="text-sm text-destructive">{closeError}</p>}
          <Button onClick={handleCloseShift} disabled={closingShift || !countedCash} className="w-full">
            {closingShift ? "Closing…" : "Close Shift"}
          </Button>
        </div>
      </Modal>

      <Modal open={newOrderModalOpen} onClose={() => setNewOrderModalOpen(false)} title="New Order">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Table / Order Label (optional)</Label>
            <Input value={tableLabel} onChange={(e) => setTableLabel(e.target.value)} placeholder="e.g. Table 5" />
          </div>
          <Button onClick={handleNewOrder} disabled={creatingOrder} className="w-full">
            {creatingOrder ? "Starting…" : "Start Order"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
