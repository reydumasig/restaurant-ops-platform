"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ReportTable } from "@/components/report-table";

type Row = {
  transferNo: string;
  fromBranchName?: string;
  toBranchName?: string;
  status: string;
  createdByName?: string;
  createdAt: string;
  receivedByName?: string | null;
  receivedAt: string | null;
};

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("transferNo", { header: "Transfer #" }),
  columnHelper.accessor("fromBranchName", { header: "From" }),
  columnHelper.accessor("toBranchName", { header: "To" }),
  columnHelper.accessor("status", { header: "Status" }),
  columnHelper.accessor("createdByName", { header: "Created By" }),
  columnHelper.accessor("createdAt", { header: "Created", cell: (c) => new Date(c.getValue()).toLocaleString() }),
  columnHelper.accessor("receivedByName", { header: "Received By", cell: (c) => c.getValue() ?? "—" }),
  columnHelper.accessor("receivedAt", { header: "Received", cell: (c) => (c.getValue() ? new Date(c.getValue() as string).toLocaleString() : "—") }),
];

export default function TransfersReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transfers")
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, []);

  const exportRows = useMemo(
    () => (data: Row[]) =>
      data.map((r) => ({
        "Transfer #": r.transferNo,
        From: r.fromBranchName,
        To: r.toBranchName,
        Status: r.status,
        "Created By": r.createdByName,
        Created: new Date(r.createdAt).toLocaleString(),
        "Received By": r.receivedByName ?? "",
        Received: r.receivedAt ? new Date(r.receivedAt).toLocaleString() : "",
      })),
    [],
  );

  return (
    <ReportTable
      title="Transfers Report"
      columns={columns}
      data={rows}
      loading={loading}
      exportRows={exportRows}
      exportFilename="transfers-report"
    />
  );
}
