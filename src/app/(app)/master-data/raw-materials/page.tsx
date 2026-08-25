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
import { cn } from "@/lib/utils";

type RawMaterial = {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  unitId: string;
  costPerUnit: string;
  reorderPoint: string;
  purchaseUnitLabel: string | null;
  purchaseUnitConversionFactor: string | null;
  active: boolean;
};

type Category = { id: string; name: string; itemType: "raw_material" | "product" };
type Unit = { id: string; name: string; abbreviation: string };

const emptyForm = {
  sku: "",
  name: "",
  categoryId: "",
  unitId: "",
  costPerUnit: "0",
  reorderPoint: "0",
  purchaseUnitLabel: "",
  purchaseUnitConversionFactor: "",
};

export default function RawMaterialsPage() {
  const [rows, setRows] = useState<RawMaterial[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RawMaterial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const rawMaterialCategories = categories.filter((c) => c.itemType === "raw_material");

  async function load() {
    setLoading(true);
    const [rmRes, catRes, unitRes] = await Promise.all([
      fetch("/api/raw-materials"),
      fetch("/api/categories"),
      fetch("/api/units"),
    ]);
    setRows(await rmRes.json());
    setCategories(await catRes.json());
    setUnits(await unitRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, categoryId: rawMaterialCategories[0]?.id ?? "", unitId: units[0]?.id ?? "" });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: RawMaterial) {
    setEditing(row);
    setForm({
      sku: row.sku,
      name: row.name,
      categoryId: row.categoryId,
      unitId: row.unitId,
      costPerUnit: row.costPerUnit,
      reorderPoint: row.reorderPoint,
      purchaseUnitLabel: row.purchaseUnitLabel ?? "",
      purchaseUnitConversionFactor: row.purchaseUnitConversionFactor ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    const body = {
      sku: form.sku,
      name: form.name,
      categoryId: form.categoryId,
      unitId: form.unitId,
      costPerUnit: Number(form.costPerUnit),
      reorderPoint: Number(form.reorderPoint),
      purchaseUnitLabel: form.purchaseUnitLabel || null,
      purchaseUnitConversionFactor: form.purchaseUnitConversionFactor ? Number(form.purchaseUnitConversionFactor) : null,
    };

    try {
      const res = await fetch(editing ? `/api/raw-materials/${editing.id}` : "/api/raw-materials", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const resBody = await res.json().catch(() => ({}));
        setError(resBody.error ?? "Something went wrong");
        return;
      }

      setModalOpen(false);
      toast.success(editing ? "Raw material updated" : "Raw material created");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(row: RawMaterial) {
    if (togglingId) return;
    setTogglingId(row.id);
    try {
      const res = await fetch(`/api/raw-materials/${row.id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !row.active }),
      });
      if (res.ok) await load();
    } finally {
      setTogglingId(null);
    }
  }

  const filteredRows = rows.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.sku.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: Column<RawMaterial>[] = [
    { header: "SKU", cell: (r) => <code className="text-xs text-muted-foreground">{r.sku}</code> },
    { header: "Name", cell: (r) => r.name },
    { header: "Category", cell: (r) => categoryById.get(r.categoryId)?.name ?? "—" },
    { header: "Unit", cell: (r) => unitById.get(r.unitId)?.abbreviation ?? "—" },
    { header: "Cost/Unit", cell: (r) => `₱${Number(r.costPerUnit).toFixed(4)}` },
    { header: "Reorder Point", cell: (r) => r.reorderPoint },
    {
      header: "Status",
      cell: (r) => <Badge variant={r.active ? "success" : "secondary"}>{r.active ? "Active" : "Inactive"}</Badge>,
    },
    {
      header: "",
      cell: (r) => (
        <div className="flex gap-3">
          <Button variant="link" size="sm" onClick={() => openEdit(r)} disabled={togglingId === r.id} className="h-auto p-0">
            Edit
          </Button>
          <Button
            variant="link"
            size="sm"
            onClick={() => toggleActive(r)}
            disabled={togglingId === r.id}
            className={cn("h-auto p-0", r.active ? "text-destructive" : "text-success")}
          >
            {togglingId === r.id ? "…" : r.active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Raw Materials</h1>
          <p className="mt-1 text-sm text-muted-foreground">{rows.length} items — imported from your item list and normalized.</p>
        </div>
        <Button onClick={openCreate}>Add Raw Material</Button>
      </div>

      <Input
        placeholder="Search by name or SKU…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm"
      />

      <DataTable columns={columns} rows={filteredRows} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Raw Material" : "Add Raw Material"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>SKU</Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(value) => setForm({ ...form, categoryId: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {rawMaterialCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Base Unit</Label>
              <Select value={form.unitId} onValueChange={(value) => setForm({ ...form, unitId: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cost per Base Unit (₱)</Label>
              <Input
                type="number"
                step="0.0001"
                value={form.costPerUnit}
                onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reorder Point</Label>
              <Input
                type="number"
                step="0.0001"
                value={form.reorderPoint}
                onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Purchase Unit Label (optional)</Label>
              <Input
                placeholder="e.g. Sack (25kg)"
                value={form.purchaseUnitLabel}
                onChange={(e) => setForm({ ...form, purchaseUnitLabel: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Base Units per Purchase Unit</Label>
              <Input
                type="number"
                step="0.0001"
                placeholder="e.g. 25000"
                value={form.purchaseUnitConversionFactor}
                onChange={(e) => setForm({ ...form, purchaseUnitConversionFactor: e.target.value })}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Saving…" : "Save"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
