"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { SignOutButton } from "@/components/sign-out-button";
import { PageLoading } from "@/components/page-loading";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Category = { id: string; name: string; itemType: "raw_material" | "product" };
type Product = { id: string; sku: string; name: string; categoryId: string; price: string; active: boolean };
type CartLine = { productId: string; name: string; price: number; quantity: number };
type OrderItem = { id: string; quantity: string; unitPrice: string; subtotal: string; meta?: { name: string; sku: string } };
type OrderDetail = {
  sale: { id: string; status: "open" | "closed" | "void"; tableLabel: string | null; totalAmount: string; branchName?: string; importedAt: string };
  items: OrderItem[];
};

export default function OrderScreenPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [addingItems, setAddingItems] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [discountType, setDiscountType] = useState<"none" | "senior_pwd">("none");
  const [tendered, setTendered] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);

  function loadOrder() {
    fetch(`/api/pos/orders/${params.id}`)
      .then((r) => r.json())
      .then(setOrder);
  }

  useEffect(loadOrder, [params.id]);

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

  const productsInCategory = products.filter((p) => p.categoryId === activeCategoryId);

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

  const cartSubtotal = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);

  async function handleAddToOrder() {
    if (addingItems || cart.length === 0) return;
    setAddError(null);
    setAddingItems(true);
    try {
      const res = await fetch(`/api/pos/orders/${params.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAddError(body.error ?? "Something went wrong");
        return;
      }
      setCart([]);
      toast.success("Added to order");
      loadOrder();
    } finally {
      setAddingItems(false);
    }
  }

  const orderSubtotal = order ? Number(order.sale.totalAmount) : 0;
  const { discountAmount, total } = useMemo(() => {
    if (discountType === "senior_pwd") {
      const vatExclusive = orderSubtotal / 1.12;
      const discount = vatExclusive * 0.2;
      return { discountAmount: discount, total: vatExclusive - discount };
    }
    return { discountAmount: 0, total: orderSubtotal };
  }, [orderSubtotal, discountType]);

  const change = tendered ? Number(tendered) - total : 0;

  async function handlePay() {
    if (paying) return;
    setPayError(null);
    if (!tendered || Number(tendered) < total) {
      setPayError("Tendered amount is less than the total due");
      return;
    }
    setPaying(true);
    try {
      const res = await fetch(`/api/pos/orders/${params.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountType, tenderedAmount: Number(tendered) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setPayError(body.error ?? "Something went wrong");
        return;
      }
      router.push(`/pos/receipt/${params.id}`);
    } finally {
      setPaying(false);
    }
  }

  async function handleVoid() {
    if (voiding) return;
    setVoiding(true);
    try {
      const res = await fetch(`/api/pos/orders/${params.id}/void`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Something went wrong");
        return;
      }
      toast.success("Order voided");
      router.push("/pos");
    } finally {
      setVoiding(false);
    }
  }

  if (!order) return <PageLoading />;

  if (order.sale.status !== "open") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6">
        <p className="text-sm text-muted-foreground">
          This order is already {order.sale.status}.
        </p>
        {order.sale.status === "closed" && (
          <Link href={`/pos/receipt/${order.sale.id}`} className="text-sm text-primary hover:underline">
            View Receipt
          </Link>
        )}
        <Link href="/pos" className="text-sm text-primary hover:underline">
          ← Back to Open Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:h-screen">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/pos" className="whitespace-nowrap text-sm text-primary hover:underline">
            ← Open Orders
          </Link>
          <h1 className="whitespace-nowrap text-lg font-semibold text-foreground">
            {order.sale.tableLabel || `Order #${order.sale.id.slice(0, 8).toUpperCase()}`}
          </h1>
        </div>
        <SignOutButton />
      </header>

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

        <div className="flex w-full flex-col border-t border-border bg-card md:w-96 md:border-t-0 md:border-l md:overflow-y-auto">
          {cart.length > 0 && (
            <div className="border-b border-border p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Adding to Order</h2>
              <div className="space-y-2">
                {cart.map((line) => (
                  <div key={line.productId} className="flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <p className="text-foreground">{line.name}</p>
                      <p className="text-muted-foreground">₱{line.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon-xs" onClick={() => updateQuantity(line.productId, line.quantity - 1)}>
                        −
                      </Button>
                      <span className="w-6 text-center">{line.quantity}</span>
                      <Button variant="outline" size="icon-xs" onClick={() => updateQuantity(line.productId, line.quantity + 1)}>
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {addError && <p className="mt-2 text-sm text-destructive">{addError}</p>}
              <Button onClick={handleAddToOrder} disabled={addingItems} className="mt-3 w-full">
                {addingItems && <Spinner />}
                {addingItems ? "Adding…" : `Add to Order (₱${cartSubtotal.toFixed(2)})`}
              </Button>
            </div>
          )}

          <div className="flex-1 p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Order So Far ({order.items.length})</h2>
            {order.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing added yet — tap a menu item to start.</p>
            ) : (
              <div className="space-y-1.5 text-sm">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-foreground">
                    <span>
                      {item.quantity} x {item.meta?.name ?? "Item"}
                    </span>
                    <span>₱{Number(item.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-4">
            {order.items.length === 0 ? (
              <Button variant="destructive" onClick={handleVoid} disabled={voiding} className="w-full">
                {voiding && <Spinner />}
                {voiding ? "Voiding…" : "Void Order"}
              </Button>
            ) : (
              <>
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
                    <span>₱{orderSubtotal.toFixed(2)}</span>
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
                  <Input type="number" step="0.01" min="0" value={tendered} onChange={(e) => setTendered(e.target.value)} />
                  {tendered && (
                    <p className={`text-sm ${change < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {change < 0 ? "Insufficient tender" : `Change: ₱${change.toFixed(2)}`}
                    </p>
                  )}
                </div>

                {payError && <p className="mt-2 text-sm text-destructive">{payError}</p>}

                <Button onClick={handlePay} disabled={paying} className="mt-3 w-full">
                  {paying && <Spinner />}
                  {paying ? "Processing…" : "Pay & Close Order"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
