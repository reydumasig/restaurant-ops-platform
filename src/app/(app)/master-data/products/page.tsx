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

type Product = {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  unitId: string;
  price: string;
  active: boolean;
};

type Category = { id: string; name: string; itemType: "raw_material" | "product" };
type Unit = { id: string; name: string; abbreviation: string };

const emptyForm = { sku: "", name: "", categoryId: "", unitId: "", price: "0" };

export default function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const productCategories = categories.filter((c) => c.itemType === "product");

  async function load() {
    setLoading(true);
    const [prodRes, catRes, unitRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/categories"),
      fetch("/api/units"),
    ]);
    setRows(await prodRes.json());
    setCategories(await catRes.json());
    setUnits(await unitRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, categoryId: productCategories[0]?.id ?? "", unitId: units[0]?.id ?? "" });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: Product) {
    setEditing(row);
    setForm({ sku: row.sku, name: row.name, categoryId: row.categoryId, unitId: row.unitId, price: row.price });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const body = {
      sku: form.sku,
      name: form.name,
      categoryId: form.categoryId,
      unitId: form.unitId,
      price: Number(form.price),
    };

    const res = await fetch(editing ? `/api/products/${editing.id}` : "/api/products", {
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
    toast.success(editing ? "Product updated" : "Product created");
    load();
  }

  async function toggleActive(row: Product) {
    const res = await fetch(`/api/products/${row.id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !row.active }),
    });
    if (res.ok) load();
  }

  const filteredRows = rows.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.sku.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: Column<Product>[] = [
    { header: "SKU", cell: (r) => <code className="text-xs text-gray-500">{r.sku}</code> },
    { header: "Name", cell: (r) => r.name },
    { header: "Category", cell: (r) => categoryById.get(r.categoryId)?.name ?? "—" },
    { header: "Unit", cell: (r) => unitById.get(r.unitId)?.abbreviation ?? "—" },
    {
      header: "Price",
      cell: (r) => (Number(r.price) > 0 ? `₱${Number(r.price).toFixed(2)}` : <span className="text-amber-600">Not set</span>),
    },
    {
      header: "Status",
      cell: (r) => <Badge variant={r.active ? "success" : "secondary"}>{r.active ? "Active" : "Inactive"}</Badge>,
    },
    {
      header: "",
      cell: (r) => (
        <div className="flex gap-3">
          <Button variant="link" size="sm" onClick={() => openEdit(r)} className="h-auto p-0">
            Edit
          </Button>
          <Button
            variant="link"
            size="sm"
            onClick={() => toggleActive(r)}
            className={cn("h-auto p-0", r.active ? "text-destructive" : "text-success")}
          >
            {r.active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            {rows.length} items. Items marked &quot;Not set&quot; need a real selling price entered here.
          </p>
        </div>
        <Button onClick={openCreate}>Add Product</Button>
      </div>

      <Input
        placeholder="Search by name or SKU…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm"
      />

      <DataTable columns={columns} rows={filteredRows} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Product" : "Add Product"} size="lg">
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
                  {productCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
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
          <div className="space-y-1.5">
            <Label>Selling Price (₱)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </Modal>
    </div>
  );
}
