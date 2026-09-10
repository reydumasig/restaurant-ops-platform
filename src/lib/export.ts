/**
 * CSV export, no library — every report's export was already a single flat
 * sheet with no formulas/formatting, so a real .xlsx never bought anything
 * over CSV here, and CSV opens in Excel identically. Avoids depending on
 * an xlsx-parsing library (and its CVEs) just to write one plain table.
 */
function toCsvValue(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const lines = [
    headers.map(toCsvValue).join(","),
    ...rows.map((row) => headers.map((h) => toCsvValue(row[h])).join(",")),
  ];
  // Leading BOM so Excel opens UTF-8 (₱, etc.) correctly instead of guessing the wrong encoding.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
