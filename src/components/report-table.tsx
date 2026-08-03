"use client";

import { useState } from "react";
import { type ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, type SortingState, useReactTable } from "@tanstack/react-table";
import { exportToExcel } from "@/lib/export";

export function ReportTable<T>({
  title,
  columns,
  data,
  loading,
  exportRows,
  exportFilename,
}: {
  title: string;
  columns: ColumnDef<T, any>[];
  data: T[];
  loading?: boolean;
  exportRows: (rows: T[]) => Record<string, unknown>[];
  exportFilename: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportToExcel(exportFilename, exportRows(data))}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Export Excel
          </button>
          <button onClick={() => window.print()} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            Print / Save PDF
          </button>
        </div>
      </div>
      <h1 className="mb-2 hidden text-lg font-semibold text-gray-900 print:block">{title}</h1>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white print:border-none">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 print:bg-white">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer px-4 py-2 text-left font-medium text-gray-500 select-none"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-400">
                  No records.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 print:hover:bg-white">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2 text-gray-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
