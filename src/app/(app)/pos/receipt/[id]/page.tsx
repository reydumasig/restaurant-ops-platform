"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type SaleItem = { id: string; quantity: string; unitPrice: string; subtotal: string; meta?: { name: string; sku: string } };
type Sale = {
  id: string;
  branchName?: string;
  saleDate: string;
  importedAt: string;
  totalAmount: string;
  discountType: string;
  discountAmount: string;
  tenderedAmount: string;
  changeAmount: string;
};

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<{ sale: Sale; items: SaleItem[] } | null>(null);

  useEffect(() => {
    fetch(`/api/pos/sales/${params.id}`)
      .then((res) => res.json())
      .then(setData);
  }, [params.id]);

  if (!data) return <p className="p-6 text-sm text-gray-500">Loading…</p>;

  const { sale, items } = data;

  return (
    <div className="min-h-screen bg-gray-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-xs justify-between print:hidden">
        <Button variant="link" size="sm" onClick={() => router.push("/pos")} className="h-auto p-0">
          ← New Sale
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          Print Receipt
        </Button>
      </div>

      <div className="mx-auto max-w-xs bg-white p-4 font-mono text-xs text-gray-900 shadow print:mx-0 print:max-w-none print:w-full print:p-1.5 print:text-[10px] print:shadow-none print:leading-tight">
        <div className="text-center">
          <p className="font-bold">{sale.branchName ?? "Casa Inasal"}</p>
          <p>{new Date(sale.importedAt).toLocaleString()}</p>
          <p>Order #{sale.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="my-2 border-t border-dashed border-gray-400" />
        {items.map((item) => (
          <div key={item.id} className="flex justify-between">
            <span>
              {item.quantity} x {item.meta?.name ?? "Item"}
            </span>
            <span>₱{Number(item.subtotal).toFixed(2)}</span>
          </div>
        ))}
        <div className="my-2 border-t border-dashed border-gray-400" />
        {Number(sale.discountAmount) > 0 && (
          <div className="flex justify-between">
            <span>Senior/PWD Discount</span>
            <span>−₱{Number(sale.discountAmount).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span>₱{Number(sale.totalAmount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tendered</span>
          <span>₱{Number(sale.tenderedAmount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Change</span>
          <span>₱{Number(sale.changeAmount).toFixed(2)}</span>
        </div>
        <div className="my-2 border-t border-dashed border-gray-400" />
        <p className="text-center">Thank you!</p>
      </div>
    </div>
  );
}
