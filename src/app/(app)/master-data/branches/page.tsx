"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Modal } from "@/components/modal";

type Branch = {
  id: string;
  code: string;
  name: string;
  type: "commissary" | "branch";
  address: string | null;
  active: boolean;
};

export default function BranchesPage() {
  const [rows, setRows] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState({ code: "", name: "", type: "branch" as "commissary" | "branch", address: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/branches");
    setRows(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ code: "", name: "", type: "branch", address: "" });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: Branch) {
    setEditing(row);
    setForm({ code: row.code, name: row.name, type: row.type, address: row.address ?? "" });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch(editing ? `/api/branches/${editing.id}` : "/api/branches", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }

    setModalOpen(false);
    load();
  }

  async function toggleActive(row: Branch) {
    await fetch(`/api/branches/${row.id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !row.active }),
    });
    load();
  }

  const columns: Column<Branch>[] = [
    { header: "Code", cell: (r) => r.code },
    { header: "Name", cell: (r) => r.name },
    { header: "Type", cell: (r) => (r.type === "commissary" ? "Commissary" : "Branch") },
    { header: "Address", cell: (r) => r.address ?? "—" },
    {
      header: "Status",
      cell: (r) => (
        <span className={r.active ? "text-green-700" : "text-gray-400"}>{r.active ? "Active" : "Inactive"}</span>
      ),
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
        <h1 className="text-xl font-semibold text-gray-900">Branches</h1>
        <button onClick={openCreate} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">
          Add Branch
        </button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Branch" : "Add Branch"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
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
          <div>
            <label className="text-sm font-medium text-gray-700">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "commissary" | "branch" })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="branch">Branch</option>
              <option value="commissary">Commissary</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
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
