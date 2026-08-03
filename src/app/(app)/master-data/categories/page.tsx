"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Category = {
  id: string;
  name: string;
  itemType: "raw_material" | "product";
};

export default function CategoriesPage() {
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState<"raw_material" | "product">("raw_material");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/categories");
    setRows(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setItemType("raw_material");
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: Category) {
    setEditing(row);
    setName(row.name);
    setItemType(row.itemType);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch(editing ? `/api/categories/${editing.id}` : "/api/categories", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, itemType }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }

    setModalOpen(false);
    toast.success(editing ? "Category updated" : "Category created");
    load();
  }

  const columns: Column<Category>[] = [
    { header: "Name", cell: (r) => r.name },
    { header: "Type", cell: (r) => (r.itemType === "raw_material" ? "Raw Material" : "Product") },
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
        <h1 className="text-xl font-semibold text-gray-900">Categories</h1>
        <Button onClick={openCreate}>Add Category</Button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Category" : "Add Category"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={itemType} onValueChange={(value) => setItemType(value as "raw_material" | "product")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw_material">Raw Material</SelectItem>
                <SelectItem value="product">Product</SelectItem>
              </SelectContent>
            </Select>
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
