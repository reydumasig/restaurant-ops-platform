"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ReportTable } from "@/components/report-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type RawMaterial = { id: string; sku: string; name: string; unitId: string };
type Unit = { id: string; abbreviation: string };

type Row = {
  id: string;
  supplierId: string;
  supplierName: string;
  unitCost: string;
  purchaseOrderId: string;
  recordedAt: string;
  trailingAverage: number | null;
  percentAboveAverage: number | null;
};

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("recordedAt", {
    header: "Date",
    cell: (c) => new Date(c.getValue()).toLocaleDateString(),
  }),
  columnHelper.accessor("supplierName", { header: "Supplier" }),
  columnHelper.accessor("unitCost", { header: "Unit Cost", cell: (c) => `₱${Number(c.getValue()).toFixed(2)}` }),
  columnHelper.accessor("trailingAverage", {
    header: "Trailing Avg (last 5)",
    cell: (c) => (c.getValue() != null ? `₱${c.getValue()!.toFixed(2)}` : "—"),
  }),
  columnHelper.accessor("percentAboveAverage", {
    header: "vs. Average",
    cell: (c) => {
      const value = c.getValue();
      if (value == null) return "—";
      const overpaid = value > 10;
      return (
        <span className={overpaid ? "font-medium text-destructive" : "text-muted-foreground"}>
          {value >= 0 ? "+" : ""}
          {value.toFixed(1)}%{overpaid && <Badge variant="destructive" className="ml-2">Overpaid</Badge>}
        </span>
      );
    },
  }),
];

export default function IngredientPricingReportPage() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [rawMaterialId, setRawMaterialId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/raw-materials").then((r) => r.json()), fetch("/api/units").then((r) => r.json())]).then(
      ([rawMaterialRows, unitRows]) => {
        setRawMaterials(rawMaterialRows);
        setUnits(unitRows);
        if (rawMaterialRows.length > 0) setRawMaterialId(rawMaterialRows[0].id);
      },
    );
  }, []);

  useEffect(() => {
    if (!rawMaterialId) return;
    setLoading(true);
    fetch(`/api/raw-materials/${rawMaterialId}/price-history`)
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, [rawMaterialId]);

  const sortedRawMaterials = useMemo(() => [...rawMaterials].sort((a, b) => a.name.localeCompare(b.name)), [rawMaterials]);
  const selected = rawMaterials.find((r) => r.id === rawMaterialId);
  const unitAbbr = units.find((u) => u.id === selected?.unitId)?.abbreviation;

  const exportRows = useMemo(
    () => (data: Row[]) =>
      data.map((r) => ({
        Date: new Date(r.recordedAt).toLocaleDateString(),
        Supplier: r.supplierName,
        "Unit Cost (PHP)": Number(r.unitCost).toFixed(2),
        "Trailing Avg (PHP)": r.trailingAverage != null ? r.trailingAverage.toFixed(2) : "",
        "vs. Average (%)": r.percentAboveAverage != null ? r.percentAboveAverage.toFixed(1) : "",
      })),
    [],
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-muted-foreground">
          What was paid for one ingredient over time, across every supplier and purchase — flags any purchase more than 10% above the
          trailing 5-purchase average.
        </p>
        <Select value={rawMaterialId} onValueChange={setRawMaterialId}>
          <SelectTrigger className="w-64 shrink-0">
            <SelectValue placeholder="Select ingredient…" />
          </SelectTrigger>
          <SelectContent>
            {sortedRawMaterials.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name} ({r.sku})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ReportTable
        title={`Ingredient Pricing History${selected ? ` — ${selected.name}${unitAbbr ? ` (per ${unitAbbr})` : ""}` : ""}`}
        columns={columns}
        data={rows}
        loading={loading}
        exportRows={exportRows}
        exportFilename="ingredient-pricing-history"
      />
    </div>
  );
}
