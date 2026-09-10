"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  active: boolean;
  roleId: string;
  roleName: string;
  branchId: string | null;
  branchName: string | null;
};

type Role = { id: string; name: string };
type Branch = { id: string; name: string };

// Radix Select forbids an item with value="" — this sentinel represents the
// "All branches (HQ)" choice in the UI only. `form.branchId` itself still
// stores "" for HQ, unchanged from the original state shape.
const HQ_SENTINEL = "__hq__";

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", roleId: "", branchId: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [usersRes, rolesRes, branchesRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/roles"),
      fetch("/api/branches"),
    ]);
    setRows(await usersRes.json());
    setRoles(await rolesRes.json());
    setBranches(await branchesRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ email: "", password: "", fullName: "", roleId: roles[0]?.id ?? "", branchId: "" });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: UserRow) {
    setEditing(row);
    setForm({ email: row.email, password: "", fullName: row.fullName, roleId: row.roleId, branchId: row.branchId ?? "" });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    const body = editing
      ? { fullName: form.fullName, roleId: form.roleId, branchId: form.branchId || null }
      : { email: form.email, password: form.password, fullName: form.fullName, roleId: form.roleId, branchId: form.branchId || null };

    try {
      const res = await fetch(editing ? `/api/users/${editing.id}` : "/api/users", {
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
      toast.success(editing ? "User updated" : "User created");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(row: UserRow) {
    if (togglingId) return;
    setTogglingId(row.id);
    try {
      const res = await fetch(`/api/users/${row.id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !row.active }),
      });
      if (res.ok) await load();
    } finally {
      setTogglingId(null);
    }
  }

  const columns: Column<UserRow>[] = [
    { header: "Name", cell: (r) => r.fullName },
    { header: "Email", cell: (r) => r.email },
    { header: "Role", cell: (r) => r.roleName },
    { header: "Branch", cell: (r) => r.branchName ?? "All branches (HQ)" },
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
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <Button onClick={openCreate}>Add User</Button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit User" : "Add User"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Initial Password</Label>
                <Input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                />
                <p className="mt-1 text-xs text-muted-foreground">Share this with the new user — they can log in immediately.</p>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.roleId} onValueChange={(value) => setForm({ ...form, roleId: value })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Branch (leave blank for HQ / all branches)</Label>
            <Select
              value={form.branchId || HQ_SENTINEL}
              onValueChange={(value) => setForm({ ...form, branchId: value === HQ_SENTINEL ? "" : value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={HQ_SENTINEL}>All branches (HQ)</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && <Spinner />}
            {submitting ? "Saving…" : "Save"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
