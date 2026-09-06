"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { useCurrentUser } from "@/hooks/use-current-user";

type WasteReport = {
  id: string;
  branchName?: string;
  itemType: "raw_material" | "product";
  quantity: string;
  reason: "spoilage" | "damage" | "expiry";
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  reportedByName?: string;
  reviewedByName?: string | null;
  reviewNotes: string | null;
  itemMeta?: { name: string; sku: string };
  createdAt: string;
};

type Item = { id: string; sku: string; name: string };

const REASON_LABELS: Record<WasteReport["reason"], string> = { spoilage: "Spoilage", damage: "Damage", expiry: "Expiry" };
const STATUS_VARIANTS: Record<WasteReport["status"], "warning" | "success" | "destructive"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

const MANAGER_ROLES = ["owner", "admin", "commissary_staff", "branch_manager"];

export default function WasteReportsPage() {
  const currentUser = useCurrentUser();
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [rows, setRows] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [rawMaterials, setRawMaterials] = useState<Item[]>([]);
  const [products, setProducts] = useState<Item[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ itemType: "raw_material" as "raw_material" | "product", itemId: "", quantity: "", reason: "spoilage" as WasteReport["reason"], notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const canReview = currentUser ? MANAGER_ROLES.includes(currentUser.roleKey) : false;

  function load() {
    setLoading(true);
    fetch(`/api/waste-reports${branchId ? `?branchId=${branchId}` : ""}`)
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
    setForm({ itemType: "raw_material", itemId: "", quantity: "", reason: "spoilage", notes: "" });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/waste-reports", {
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
      toast.success("Waste reported — pending manager review");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function review(id: string, action: "approve" | "reject") {
    if (actingId) return;
    setActingId(id);
    try {
      const res = await fetch(`/api/waste-reports/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Something went wrong");
        return;
      }
      toast.success(action === "approve" ? "Waste approved — stock deducted" : "Waste report rejected");
      load();
    } finally {
      setActingId(null);
    }
  }

  const items = form.itemType === "raw_material" ? rawMaterials : products;
  const sortedItems = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);

  const columns: Column<WasteReport>[] = [
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
        <h1 className="text-xl font-semibold text-foreground">Waste Reports</h1>
        <Button onClick={openReport}>Report Waste</Button>
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

      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No waste reports yet." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Report Waste">
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
              <Select value={form.reason} onValueChange={(value) => setForm({ ...form, reason: value as WasteReport["reason"] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spoilage">Spoilage</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="expiry">Expiry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting || !branchId} className="w-full">
            {submitting ? "Submitting…" : "Submit Report"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
