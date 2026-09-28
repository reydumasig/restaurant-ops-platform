"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { useCurrentUser } from "@/hooks/use-current-user";

type CompReport = {
  id: string;
  branchName?: string;
  itemType: "raw_material" | "product";
  quantity: string;
  reason: "staff_perk" | "customer_comp" | "promo_giveaway";
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  reportedByName?: string;
  reviewedByName?: string | null;
  reviewNotes: string | null;
  itemMeta?: { name: string; sku: string };
  createdAt: string;
};

type Item = { id: string; sku: string; name: string };

const REASON_LABELS: Record<CompReport["reason"], string> = {
  staff_perk: "Staff Perk",
  customer_comp: "Customer Comp",
  promo_giveaway: "Promo / Marketing",
};
const STATUS_VARIANTS: Record<CompReport["status"], "warning" | "success" | "destructive"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

const MANAGER_ROLES = ["owner", "admin", "commissary_staff", "branch_manager"];

export default function CompReportsPage() {
  const currentUser = useCurrentUser();
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [rows, setRows] = useState<CompReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [rawMaterials, setRawMaterials] = useState<Item[]>([]);
  const [products, setProducts] = useState<Item[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    itemType: "raw_material" as "raw_material" | "product",
    itemId: "",
    quantity: "",
    reason: "staff_perk" as CompReport["reason"],
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const canReview = currentUser ? MANAGER_ROLES.includes(currentUser.roleKey) : false;

  function load() {
    setLoading(true);
    fetch(`/api/comp-reports${branchId ? `?branchId=${branchId}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }

  useEffect(load, [branchId]);

  useEffect(() => {
    fetch("/api/raw-materials")
      .then((r) => r.json())
      .then(setRawMaterials);
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts);
  }, []);

  function openReport() {
    setForm({ itemType: "raw_material", itemId: "", quantity: "", reason: "staff_perk", notes: "" });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/comp-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          itemType: form.itemType,
          itemId: form.itemId,
          quantity: Number(form.quantity),
          reason: form.reason,
          notes: form.notes || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong");
        return;
      }

      setModalOpen(false);
      toast.success("Comp reported — pending manager review");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function review(id: string, action: "approve" | "reject") {
    if (actingId) return;
    setActingId(id);
    try {
      const res = await fetch(`/api/comp-reports/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Something went wrong");
        return;
      }
      toast.success(action === "approve" ? "Comp approved — stock deducted" : "Comp report rejected");
      load();
    } finally {
      setActingId(null);
    }
  }

  const items = form.itemType === "raw_material" ? rawMaterials : products;
  const sortedItems = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);

  const columns: Column<CompReport>[] = [
    { header: "Item", cell: (r) => r.itemMeta?.name ?? "—" },
    { header: "Branch", cell: (r) => r.branchName ?? "—" },
    { header: "Qty", cell: (r) => r.quantity },
    { header: "Reason", cell: (r) => REASON_LABELS[r.reason] },
    { header: "Reported By", cell: (r) => r.reportedByName ?? "—" },
    { header: "Reported", cell: (r) => new Date(r.createdAt).toLocaleString() },
    { header: "Status", cell: (r) => <Badge variant={STATUS_VARIANTS[r.status]}>{r.status[0].toUpperCase() + r.status.slice(1)}</Badge> },
    {
      header: "",
      cell: (r) =>
        r.status === "pending" && canReview ? (
          <div className="flex gap-3">
            <Button variant="link" size="sm" onClick={() => review(r.id, "approve")} disabled={actingId === r.id} className="h-auto p-0 text-success">
              {actingId === r.id ? "…" : "Approve"}
            </Button>
            <Button variant="link" size="sm" onClick={() => review(r.id, "reject")} disabled={actingId === r.id} className="h-auto p-0 text-destructive">
              {actingId === r.id ? "…" : "Reject"}
            </Button>
          </div>
        ) : r.reviewedByName ? (
          <span className="text-xs text-muted-foreground">by {r.reviewedByName}</span>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Comps / Giveaways</h1>
        <Button onClick={openReport}>Report Comp</Button>
      </div>

      {branches.length > 1 && (
        <div className="mb-4">
          <Select value={branchId || "all"} onValueChange={(value) => setBranchId(value === "all" ? "" : value)}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No comps reported yet." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Report Comp">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Item Type</Label>
            <Select value={form.itemType} onValueChange={(value) => setForm({ ...form, itemType: value as "raw_material" | "product", itemId: "" })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw_material">Raw Material</SelectItem>
                <SelectItem value="product">Product</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Item</Label>
            <Select value={form.itemId} onValueChange={(value) => setForm({ ...form, itemId: value })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {sortedItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" step="0.0001" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={form.reason} onValueChange={(value) => setForm({ ...form, reason: value as CompReport["reason"] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff_perk">Staff Perk</SelectItem>
                  <SelectItem value="customer_comp">Customer Comp</SelectItem>
                  <SelectItem value="promo_giveaway">Promo / Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Who it was given to, and why" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting || !branchId} className="w-full">
            {submitting && <Spinner />}
            {submitting ? "Submitting…" : "Submit Report"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
