"use client";

import { useEffect, useState } from "react";
import { useBranchSelector } from "@/hooks/use-branch-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Status = { clockedIn: boolean; since: string | null };
type Punch = { id: string; type: "in" | "out"; reason: string | null; punchedAt: string };

const REASONS: { value: "short_break" | "lunch" | "end_of_shift"; label: string }[] = [
  { value: "short_break", label: "Short Break" },
  { value: "lunch", label: "Lunch" },
  { value: "end_of_shift", label: "End of Shift" },
];

export default function TimekeepingPage() {
  const { branches, branchId, setBranchId } = useBranchSelector();
  const [status, setStatus] = useState<Status | null>(null);
  const [punches, setPunches] = useState<Punch[]>([]);
  const [pickingReason, setPickingReason] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    fetch("/api/timekeeping/me/status")
      .then((r) => r.json())
      .then(setStatus);
    fetch("/api/timekeeping/me/punches")
      .then((r) => r.json())
      .then(setPunches);
  }

  useEffect(refresh, []);

  async function punch(reason?: string) {
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/timekeeping/punch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, reason }),
    });
    setSubmitting(false);
    setPickingReason(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }
    refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-xl font-semibold text-foreground">Time Clock</h1>

      <Card>
        <CardContent className="space-y-4">
          {branches.length > 1 && (
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {status === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground">
                {status.clockedIn ? `Clocked in since ${new Date(status.since!).toLocaleTimeString()}` : "Clocked out"}
              </p>

              {!status.clockedIn && (
                <Button size="lg" className="h-16 w-full text-lg" disabled={!branchId || submitting} onClick={() => punch()}>
                  Clock In
                </Button>
              )}

              {status.clockedIn && !pickingReason && (
                <Button size="lg" variant="destructive" className="h-16 w-full text-lg" disabled={submitting} onClick={() => setPickingReason(true)}>
                  Clock Out
                </Button>
              )}

              {status.clockedIn && pickingReason && (
                <div className="space-y-2">
                  <p className="text-center text-sm text-muted-foreground">Why are you clocking out?</p>
                  {REASONS.map((r) => (
                    <Button key={r.value} variant="outline" className="w-full" disabled={submitting} onClick={() => punch(r.value)}>
                      {r.label}
                    </Button>
                  ))}
                  <Button variant="ghost" className="w-full" disabled={submitting} onClick={() => setPickingReason(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </>
          )}

          {error && <p className="text-center text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <h2 className="mt-6 mb-2 text-sm font-semibold text-foreground">Recent Punches</h2>
      <Card>
        <CardContent className="space-y-2">
          {punches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No punches yet.</p>
          ) : (
            punches.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {p.type === "in" ? "Clock In" : "Clock Out"}
                  {p.reason && <span className="text-muted-foreground"> — {p.reason.replaceAll("_", " ")}</span>}
                </span>
                <span className="text-muted-foreground">{new Date(p.punchedAt).toLocaleString()}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
