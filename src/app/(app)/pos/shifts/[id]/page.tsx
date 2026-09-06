"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Sale = {
  id: string;
  totalAmount: string;
  discountType: string;
  importedAt: string;
};

type ShiftDetail = {
  shift: {
    id: string;
    branchName?: string;
    status: "open" | "closed";
    startingCash: string;
    expectedCash: string | null;
    countedCash: string | null;
    cashVariance: string | null;
    notes: string | null;
    openedAt: string;
    closedAt: string | null;
  };
  sales: Sale[];
};

export default function ShiftDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ShiftDetail | null>(null);

  useEffect(() => {
    fetch(`/api/pos-shifts/${params.id}`)
      .then((r) => r.json())
      .then(setData);
  }, [params.id]);

  if (!data) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  const { shift, sales } = data;
  const salesTotal = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <Link href="/pos/shifts" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Back to Shift History
      </Link>

      <Card className="mb-4">
        <CardContent>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">{shift.branchName}</h1>
            <Badge variant={shift.status === "open" ? "warning" : "success"} pulse={shift.status === "open"}>
              {shift.status === "open" ? "Open" : "Closed"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Opened {new Date(shift.openedAt).toLocaleString()}</p>
          {shift.closedAt && <p className="text-sm text-muted-foreground">Closed {new Date(shift.closedAt).toLocaleString()}</p>}

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Starting Cash</p>
              <p className="text-lg font-semibold text-foreground">₱{Number(shift.startingCash).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sales in Shift</p>
              <p className="text-lg font-semibold text-foreground">₱{salesTotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expected Cash</p>
              <p className="text-lg font-semibold text-foreground">{shift.expectedCash != null ? `₱${Number(shift.expectedCash).toFixed(2)}` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Counted Cash</p>
              <p className="text-lg font-semibold text-foreground">{shift.countedCash != null ? `₱${Number(shift.countedCash).toFixed(2)}` : "—"}</p>
            </div>
          </div>

          {shift.cashVariance != null && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">Variance</p>
              <p
                className={`text-lg font-semibold ${
                  Number(shift.cashVariance) < 0 ? "text-destructive" : Number(shift.cashVariance) > 0 ? "text-warning" : "text-success"
                }`}
              >
                {Number(shift.cashVariance) > 0 ? "+" : ""}₱{Number(shift.cashVariance).toFixed(2)}
              </p>
            </div>
          )}
          {shift.notes && <p className="mt-3 text-sm text-foreground">Notes: {shift.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Sales During This Shift ({sales.length})</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{new Date(s.importedAt).toLocaleTimeString()}</TableCell>
                  <TableCell>{s.discountType === "senior_pwd" ? "Senior/PWD" : "—"}</TableCell>
                  <TableCell>₱{Number(s.totalAmount).toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No sales recorded during this shift.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
