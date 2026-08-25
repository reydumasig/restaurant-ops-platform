import { and, asc, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { timePunches } from "@/db/schema";
import { computeDailyHours, getStatus, recordPunch, toManilaDateString } from "@/server/lib/timekeeping";
import { createTestBranch, createTestUser } from "../helpers/fixtures";

describe("computeDailyHours (pure)", () => {
  it("pairs a simple in/out into one shift, bucketed under the clock-in's Manila date", () => {
    const clockIn = new Date("2026-08-25T01:00:00.000Z"); // 09:00 Manila
    const clockOut = new Date("2026-08-25T09:30:00.000Z"); // 17:30 Manila, same day

    const rows = computeDailyHours([
      { userId: "u1", branchId: "b1", type: "in", punchedAt: clockIn },
      { userId: "u1", branchId: "b1", type: "out", punchedAt: clockOut },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: "u1", date: toManilaDateString(clockIn), minutesWorked: 510, incomplete: false });
  });

  it("reports a trailing unmatched clock-in as incomplete, not a guessed duration", () => {
    const clockIn = new Date("2026-08-25T01:00:00.000Z");
    const rows = computeDailyHours([{ userId: "u1", branchId: "b1", type: "in", punchedAt: clockIn }]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ clockOut: null, minutesWorked: 0, incomplete: true });
  });

  it("keeps multiple users' shifts independent", () => {
    const base = new Date("2026-08-25T01:00:00.000Z");
    const rows = computeDailyHours([
      { userId: "u1", branchId: "b1", type: "in", punchedAt: base },
      { userId: "u2", branchId: "b1", type: "in", punchedAt: base },
      { userId: "u1", branchId: "b1", type: "out", punchedAt: new Date(base.getTime() + 60 * 60000) },
      { userId: "u2", branchId: "b1", type: "out", punchedAt: new Date(base.getTime() + 30 * 60000) },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.userId === "u1")?.minutesWorked).toBe(60);
    expect(rows.find((r) => r.userId === "u2")?.minutesWorked).toBe(30);
  });

  it("closes an unmatched clock-in as incomplete before starting the next shift", () => {
    const base = new Date("2026-08-25T01:00:00.000Z");
    const rows = computeDailyHours([
      { userId: "u1", branchId: "b1", type: "in", punchedAt: base },
      { userId: "u1", branchId: "b1", type: "in", punchedAt: new Date(base.getTime() + 60 * 60000) },
      { userId: "u1", branchId: "b1", type: "out", punchedAt: new Date(base.getTime() + 90 * 60000) },
    ]);

    expect(rows).toHaveLength(2);
    const incomplete = rows.find((r) => r.incomplete);
    const complete = rows.find((r) => !r.incomplete);
    expect(incomplete).toBeDefined();
    expect(complete?.minutesWorked).toBe(30);
  });
});

describe("recordPunch", () => {
  let performedBy: string;

  beforeAll(async () => {
    performedBy = await createTestUser();
  });

  it("toggles in -> out -> in, and requires a reason on clock-out", async () => {
    const branch = await createTestBranch();

    const first = await recordPunch({ userId: performedBy, branchId: branch.id });
    expect(first.type).toBe("in");
    expect(first.reason).toBeNull();

    await expect(recordPunch({ userId: performedBy, branchId: branch.id })).rejects.toThrow("A reason is required when clocking out");

    const second = await recordPunch({ userId: performedBy, branchId: branch.id, reason: "lunch" });
    expect(second.type).toBe("out");
    expect(second.reason).toBe("lunch");

    const third = await recordPunch({ userId: performedBy, branchId: branch.id });
    expect(third.type).toBe("in");
  });

  it("getStatus reflects the last punch", async () => {
    const branch = await createTestBranch();
    const user = await createTestUser();

    expect((await getStatus(user)).clockedIn).toBe(false);

    await recordPunch({ userId: user, branchId: branch.id });
    expect((await getStatus(user)).clockedIn).toBe(true);

    await recordPunch({ userId: user, branchId: branch.id, reason: "short_break" });
    expect((await getStatus(user)).clockedIn).toBe(false);
  });

  it("serializes concurrent punches so the resulting sequence still strictly alternates (regression test)", async () => {
    const branch = await createTestBranch();
    const user = await createTestUser();

    // Fired concurrently from a clean slate. Without the advisory lock, all
    // 5 could read "no prior punch" simultaneously and all insert type='in'.
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () => recordPunch({ userId: user, branchId: branch.id, reason: "end_of_shift" })),
    );
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(5);

    const rows = await db
      .select()
      .from(timePunches)
      .where(and(eq(timePunches.userId, user), eq(timePunches.branchId, branch.id)))
      .orderBy(asc(timePunches.punchedAt));

    expect(rows).toHaveLength(5);
    expect(rows[0].type).toBe("in"); // clean slate — the first punch must be an "in"
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].type).not.toBe(rows[i - 1].type);
    }
  });
});
