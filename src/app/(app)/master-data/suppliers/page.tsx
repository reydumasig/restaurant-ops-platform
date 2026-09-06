"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  active: boolean;
};

const emptyForm = { name: "", contactName: "", contactPhone: "", contactEmail: "", address: "" };

export default function SuppliersPage() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/suppliers");
    setRows(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: Supplier) {
    setEditing(row);
    setForm({
      name: row.name,
      contactName: row.contactName ?? "",
      contactPhone: row.contactPhone ?? "",
      contactEmail: row.contactEmail ?? "",
      address: row.address ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(editing ? `/api/suppliers/${editing.id}` : "/api/suppliers", {
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
      toast.success(editing ? "Supplier updated" : "Supplier created");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(row: Supplier) {
    if (togglingId) return;
    setTogglingId(row.id);
    try {
      const res = await fetch(`/api/suppliers/${row.id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !row.active }),
      });
      if (res.ok) await load();
    } finally {
      setTogglingId(null);
    }
  }

  const filteredRows = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const columns: Column<Supplier>[] = [
    { header: "Name", cell: (r) => r.name },
    { header: "Contact", cell: (r) => r.contactName ?? "—" },
    { header: "Phone", cell: (r) => r.contactPhone ?? "—" },
    { header: "Email", cell: (r) => r.contactEmail ?? "—" },
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
        <h1 className="text-xl font-semibold text-foreground">Suppliers</h1>
        <Button onClick={openCreate}>Add Supplier</Button>
      </div>

      <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 w-full max-w-sm" />

      <DataTable columns={columns} rows={filteredRows} loading={loading} emptyMessage="No suppliers yet." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Supplier" : "Add Supplier"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Name</Label>
            <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
