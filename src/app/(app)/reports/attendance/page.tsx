"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ReportTable } from "@/components/report-table";
import { Badge } from "@/components/ui/badge";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = {
  userId: string;
  userName: string;
  branchName: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  minutesWorked: number;
  incomplete: boolean;
};

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("userName", { header: "Employee" }),
  columnHelper.accessor("branchName", { header: "Branch" }),
  columnHelper.accessor("date", { header: "Date" }),
  columnHelper.accessor("clockIn", { header: "Clock In", cell: (c) => new Date(c.getValue()).toLocaleTimeString() }),
  columnHelper.accessor("clockOut", { header: "Clock Out", cell: (c) => (c.getValue() ? new Date(c.getValue()!).toLocaleTimeString() : "—") }),
  columnHelper.accessor("minutesWorked", { header: "Hours Worked", cell: (c) => formatHours(c.getValue()) }),
  columnHelper.accessor("incomplete", {
    header: "Status",
    cell: (c) => (c.getValue() ? <Badge variant="warning">Incomplete</Badge> : <Badge variant="success">Complete</Badge>),
  }),
];

export default function AttendanceReportPage() {
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/timekeeping/report${branchId ? `?branchId=${branchId}` : ""}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, [branchId]);

  const exportRows = useMemo(
    () => (data: Row[]) =>
      data.map((r) => ({
        Employee: r.userName,
        Branch: r.branchName,
        Date: r.date,
        "Clock In": new Date(r.clockIn).toLocaleString(),
        "Clock Out": r.clockOut ? new Date(r.clockOut).toLocaleString() : "",
        "Hours Worked": formatHours(r.minutesWorked),
        Status: r.incomplete ? "Incomplete" : "Complete",
      })),
    [],
  );

  return (
    <div>
      {branches.length > 1 && (
        <div className="mb-4 flex justify-end print:hidden">
          <Select value={branchId || "all"} onValueChange={(value) => setBranchId(value === "all" ? "" : value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <ReportTable
        title="Attendance Report"
        columns={columns}
        data={rows}
        loading={loading}
        exportRows={exportRows}
        exportFilename="attendance-report"
      />
    </div>
  );
}
