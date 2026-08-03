"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Modal } from "@/components/modal";

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
      cell: (r) => <span className={r.active ? "text-green-700" : "text-gray-400"}>{r.active ? "Active" : "Inactive"}</span>,
    },
    {
      header: "",
      cell: (r) => (
        <div className="flex gap-3">
          <button onClick={() => openEdit(r)} className="text-sm text-blue-600 hover:underline">
            Edit
          </button>
          <button onClick={() => toggleActive(r)} className="text-sm text-gray-600 hover:underline">
            {r.active ? "Deactivate" : "Activate"}
          </button>
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
        <button onClick={openCreate} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">
          Add Product
        </button>
      </div>

      <input
        placeholder="Search by name or SKU…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      <DataTable columns={columns} rows={filteredRows} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Product" : "Add Product"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">SKU</label>
            <input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {productCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Unit</label>
              <select
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.abbreviation})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Selling Price (₱)</label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">
            Save
          </button>
        </form>
      </Modal>
    </div>
  );
}
