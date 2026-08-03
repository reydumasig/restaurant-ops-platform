"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Modal } from "@/components/modal";

type Unit = {
  id: string;
  name: string;
  abbreviation: string;
};

export default function UnitsPage() {
  const [rows, setRows] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/units");
    setRows(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setAbbreviation("");
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: Unit) {
    setEditing(row);
    setName(row.name);
    setAbbreviation(row.abbreviation);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch(editing ? `/api/units/${editing.id}` : "/api/units", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, abbreviation }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }

    setModalOpen(false);
    load();
  }

  const columns: Column<Unit>[] = [
    { header: "Name", cell: (r) => r.name },
    { header: "Abbreviation", cell: (r) => r.abbreviation },
    {
      header: "",
      cell: (r) => (
        <button onClick={() => openEdit(r)} className="text-sm text-blue-600 hover:underline">
          Edit
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Units of Measure</h1>
        <button onClick={openCreate} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">
          Add Unit
        </button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Unit" : "Add Unit"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Abbreviation</label>
            <input
              value={abbreviation}
              onChange={(e) => setAbbreviation(e.target.value)}
              required
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
