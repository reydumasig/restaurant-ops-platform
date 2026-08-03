"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Modal } from "@/components/modal";

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
    setError(null);

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
    load();
  }

  async function toggleActive(row: RawMaterial) {
    const res = await fetch(`/api/raw-materials/${row.id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !row.active }),
    });
    if (res.ok) load();
  }

  const filteredRows = rows.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.sku.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: Column<RawMaterial>[] = [
    { header: "SKU", cell: (r) => <code className="text-xs text-gray-500">{r.sku}</code> },
    { header: "Name", cell: (r) => r.name },
    { header: "Category", cell: (r) => categoryById.get(r.categoryId)?.name ?? "—" },
    { header: "Unit", cell: (r) => unitById.get(r.unitId)?.abbreviation ?? "—" },
    { header: "Cost/Unit", cell: (r) => `₱${Number(r.costPerUnit).toFixed(4)}` },
    { header: "Reorder Point", cell: (r) => r.reorderPoint },
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
          <h1 className="text-xl font-semibold text-gray-900">Raw Materials</h1>
          <p className="mt-1 text-sm text-gray-500">{rows.length} items — imported from your item list and normalized.</p>
        </div>
        <button onClick={openCreate} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">
          Add Raw Material
        </button>
      </div>

      <input
        placeholder="Search by name or SKU…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      <DataTable columns={columns} rows={filteredRows} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Raw Material" : "Add Raw Material"}>
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
                {rawMaterialCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Base Unit</label>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Cost per Base Unit (₱)</label>
              <input
                type="number"
                step="0.0001"
                value={form.costPerUnit}
                onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Reorder Point</label>
              <input
                type="number"
                step="0.0001"
                value={form.reorderPoint}
                onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Purchase Unit Label (optional)</label>
              <input
                placeholder="e.g. Sack (25kg)"
                value={form.purchaseUnitLabel}
                onChange={(e) => setForm({ ...form, purchaseUnitLabel: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Base Units per Purchase Unit</label>
              <input
                type="number"
                step="0.0001"
                placeholder="e.g. 25000"
                value={form.purchaseUnitConversionFactor}
                onChange={(e) => setForm({ ...form, purchaseUnitConversionFactor: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
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
