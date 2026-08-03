"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Modal } from "@/components/modal";

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

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", roleId: "", branchId: "" });
  const [error, setError] = useState<string | null>(null);

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
    setError(null);

    const body = editing
      ? { fullName: form.fullName, roleId: form.roleId, branchId: form.branchId || null }
      : { email: form.email, password: form.password, fullName: form.fullName, roleId: form.roleId, branchId: form.branchId || null };

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
    load();
  }

  async function toggleActive(row: UserRow) {
    const res = await fetch(`/api/users/${row.id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !row.active }),
    });
    if (res.ok) load();
  }

  const columns: Column<UserRow>[] = [
    { header: "Name", cell: (r) => r.fullName },
    { header: "Email", cell: (r) => r.email },
    { header: "Role", cell: (r) => r.roleName },
    { header: "Branch", cell: (r) => r.branchName ?? "All branches (HQ)" },
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
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <button onClick={openCreate} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">
          Add User
        </button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit User" : "Add User"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Initial Password</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Share this with the new user — they can log in immediately.</p>
              </div>
            </>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700">Full Name</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Role</label>
            <select
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Branch (leave blank for HQ / all branches)</label>
            <select
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All branches (HQ)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
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
