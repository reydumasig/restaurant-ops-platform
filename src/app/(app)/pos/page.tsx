"use client";

import { useEffect, useMemo, useState } from "react";
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

type Category = { id: string; name: string; itemType: "raw_material" | "product" };
type Product = { id: string; sku: string; name: string; categoryId: string; price: string; active: boolean };
type CartLine = { productId: string; name: string; price: number; quantity: number };
type Shift = { id: string; branchId: string; startingCash: string; status: "open" | "closed" };
type ClosedShiftSummary = { startingCash: string; expectedCash: string; countedCash: string; cashVariance: string };

export default function PosPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<"none" | "senior_pwd">("none");
  const [tendered, setTendered] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [shift, setShift] = useState<Shift | null | undefined>(undefined); // undefined = loading
  const [startingCash, setStartingCash] = useState("");
  const [openingShift, setOpeningShift] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [countedCash, setCountedCash] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");
  const [closingShift, setClosingShift] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closedSummary, setClosedSummary] = useState<ClosedShiftSummary | null>(null);

  function loadOpenShift() {
    if (!branchId) return;
    setShift(undefined);
    fetch(`/api/pos-shifts/open?branchId=${branchId}`)
      .then((r) => r.json())
      .then(setShift);
  }

  useEffect(loadOpenShift, [branchId]);

  useEffect(() => {
    Promise.all([fetch("/api/categories").then((r) => r.json()), fetch("/api/products").then((r) => r.json())]).then(
      ([catRows, productRows]: [Category[], Product[]]) => {
        const productCats = catRows.filter((c) => c.itemType === "product");
        setCategories(productCats);
        setProducts(productRows.filter((p) => p.active));
        setActiveCategoryId(productCats[0]?.id ?? "");
      },
    );
  }, []);

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

  const productsInCategory = products.filter((p) => p.categoryId === activeCategoryId);

  const { subtotal, discountAmount, total } = useMemo(() => {
    const sub = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
    if (discountType === "senior_pwd") {
      const vatExclusive = sub / 1.12;
      const discount = vatExclusive * 0.2;
      return { subtotal: sub, discountAmount: discount, total: vatExclusive - discount };
    }
    return { subtotal: sub, discountAmount: 0, total: sub };
  }, [cart, discountType]);

  const change = tendered ? Number(tendered) - total : 0;

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId: product.id, name: product.name, price: Number(product.price), quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((l) => l.productId !== productId));
      return;
    }
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)));
  }

  async function handleCheckout() {
    setError(null);

    if (cart.length === 0) {
      setError("Cart is empty");
      return;
    }
    if (!tendered || Number(tendered) < total) {
      setError("Tendered amount is less than the total due");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/pos/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        lines: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        discountType,
        tenderedAmount: Number(tendered),
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }

    const sale = await res.json();
    router.push(`/pos/receipt/${sale.id}`);
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
                  <div className={`flex justify-between font-medium ${Number(closedSummary.cashVariance) < 0 ? "text-destructive" : Number(closedSummary.cashVariance) > 0 ? "text-warning" : "text-success"}`}>
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
      <div className="flex flex-1 flex-col overflow-visible md:flex-row md:overflow-hidden">
        <div className="flex flex-1 flex-col overflow-visible md:overflow-hidden">
          <div className="flex gap-2 overflow-x-auto border-b border-border bg-card px-4 py-2">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategoryId === cat.id ? "default" : "outline"}
                onClick={() => setActiveCategoryId(cat.id)}
                className="shrink-0 whitespace-nowrap"
              >
                {cat.name}
              </Button>
            ))}
          </div>
          <div className="flex-1 p-4 md:overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {productsInCategory.map((product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  onClick={() => addToCart(product)}
                  className="h-auto flex-col items-start whitespace-normal p-3 text-left"
                >
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {Number(product.price) > 0 ? `₱${Number(product.price).toFixed(2)}` : "No price set"}
                  </p>
                </Button>
              ))}
              {productsInCategory.length === 0 && <p className="text-sm text-muted-foreground">No products in this category.</p>}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col border-t border-border bg-card md:w-96 md:border-t-0 md:border-l">
          <div className="flex-1 p-4 md:overflow-y-auto">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Current Order</h2>
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet — tap a menu item to add it.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((line) => (
                  <div key={line.productId} className="flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <p className="text-foreground">{line.name}</p>
                      <p className="text-muted-foreground">₱{line.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                      >
                        −
                      </Button>
                      <span className="w-6 text-center">{line.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-4">
            <div className="mb-3 space-y-1.5">
              <Label>Discount</Label>
              <Select value={discountType} onValueChange={(value) => setDiscountType(value as "none" | "senior_pwd")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="senior_pwd">Senior Citizen / PWD (20%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span>−₱{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-foreground">
                <span>Total</span>
                <span>₱{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              <Label>Amount Tendered</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
              />
              {tendered && (
                <p className={`text-sm ${change < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {change < 0 ? "Insufficient tender" : `Change: ₱${change.toFixed(2)}`}
                </p>
              )}
            </div>

            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

            <Button
              onClick={handleCheckout}
              disabled={submitting || !branchId}
              className="mt-3 w-full"
            >
              {submitting ? "Processing…" : "Complete Sale"}
            </Button>
          </div>
        </div>
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
    </div>
  );
}
