"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { useBranchSelector } from "@/hooks/use-branch-selector";

type Category = { id: string; name: string; itemType: "raw_material" | "product" };
type Product = { id: string; sku: string; name: string; categoryId: string; price: string; active: boolean };
type CartLine = { productId: string; name: string; price: number; quantity: number };

export default function PosPage() {
  const router = useRouter();
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<"none" | "senior_pwd">("none");
  const [tendered, setTendered] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Point of Sale</h1>
          <Link href="/pos/history" className="text-sm text-blue-600 hover:underline">
            Sales History
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {branches.length > 1 && (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex gap-2 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
                  activeCategoryId === cat.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {productsInCategory.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-gray-400"
                >
                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {Number(product.price) > 0 ? `₱${Number(product.price).toFixed(2)}` : "No price set"}
                  </p>
                </button>
              ))}
              {productsInCategory.length === 0 && <p className="text-sm text-gray-400">No products in this category.</p>}
            </div>
          </div>
        </div>

        <div className="flex w-96 flex-col border-l border-gray-200 bg-white">
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Current Order</h2>
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400">No items yet — tap a menu item to add it.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((line) => (
                  <div key={line.productId} className="flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <p className="text-gray-900">{line.name}</p>
                      <p className="text-gray-500">₱{line.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                        className="h-6 w-6 rounded border border-gray-300 text-gray-600"
                      >
                        −
                      </button>
                      <span className="w-6 text-center">{line.quantity}</span>
                      <button
                        onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                        className="h-6 w-6 rounded border border-gray-300 text-gray-600"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-4">
            <div className="mb-3">
              <label className="text-sm font-medium text-gray-700">Discount</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "none" | "senior_pwd")}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="none">None</option>
                <option value="senior_pwd">Senior Citizen / PWD (20%)</option>
              </select>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount</span>
                  <span>−₱{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-gray-900">
                <span>Total</span>
                <span>₱{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700">Amount Tendered</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              {tendered && (
                <p className={`mt-1 text-sm ${change < 0 ? "text-red-600" : "text-gray-600"}`}>
                  {change < 0 ? "Insufficient tender" : `Change: ₱${change.toFixed(2)}`}
                </p>
              )}
            </div>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <button
              onClick={handleCheckout}
              disabled={submitting || !branchId}
              className="mt-3 w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? "Processing…" : "Complete Sale"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
