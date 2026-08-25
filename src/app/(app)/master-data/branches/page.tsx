"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
    toast.success(editing ? "Branch updated" : "Branch created");
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
        <Badge variant={r.active ? "success" : "secondary"}>{r.active ? "Active" : "Inactive"}</Badge>
      ),
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
        <h1 className="text-xl font-semibold text-foreground">Branches</h1>
        <Button onClick={openCreate}>Add Branch</Button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Branch" : "Add Branch"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as "commissary" | "branch" })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="branch">Branch</SelectItem>
                <SelectItem value="commissary">Commissary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
