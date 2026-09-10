"use client";

import { useState } from "react";
import { type ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, type SortingState, useReactTable } from "@tanstack/react-table";
import { exportToCsv } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCsv(exportFilename, exportRows(data))}
          >
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </div>
      </div>
      <h1 className="mb-2 hidden text-lg font-semibold text-foreground print:block">{title}</h1>

      <div className="rounded-lg border bg-card print:border-none">
        <Table>
          <TableHeader className="print:bg-white">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="print:hover:bg-white">
                <TableCell colSpan={columns.length} className="py-6">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Spinner />
                    Loading…
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow className="print:hover:bg-white">
                <TableCell colSpan={columns.length} className="py-6 text-center text-muted-foreground">
                  No records.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="print:hover:bg-white">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
