"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/data-table";

type Role = {
  id: string;
  key: string;
  name: string;
  description: string | null;
};

export default function RolesPage() {
  const [rows, setRows] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/roles")
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, []);

  const columns: Column<Role>[] = [
    { header: "Name", cell: (r) => r.name },
    { header: "Key", cell: (r) => <code className="text-xs text-gray-500">{r.key}</code> },
    { header: "Description", cell: (r) => r.description ?? "—" },
  ];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Roles</h1>
        <p className="mt-1 text-sm text-gray-500">
          Roles are fixed for Phase 1 — each one has hardcoded permissions in the platform. Assign them to users
          from the Users screen.
        </p>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} />
    </div>
  );
}
