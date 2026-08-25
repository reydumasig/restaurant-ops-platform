"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    toast.success(editing ? "Unit updated" : "Unit created");
    load();
  }

  const columns: Column<Unit>[] = [
    { header: "Name", cell: (r) => r.name },
    { header: "Abbreviation", cell: (r) => r.abbreviation },
    {
      header: "",
      cell: (r) => (
        <Button variant="link" size="sm" onClick={() => openEdit(r)} className="h-auto p-0">
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Units of Measure</h1>
        <Button onClick={openCreate}>Add Unit</Button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Unit" : "Add Unit"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Abbreviation</Label>
            <Input value={abbreviation} onChange={(e) => setAbbreviation(e.target.value)} required />
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
