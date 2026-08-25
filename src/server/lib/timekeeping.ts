import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { timePunches } from "@/db/schema";

export type PunchType = "in" | "out";
export type PunchReason = "short_break" | "lunch" | "end_of_shift";

/**
 * Manila-local calendar date (YYYY-MM-DD) for a UTC timestamp. Punches are
 * stored in UTC; bucketing "which day was this shift" by UTC would put a
 * shift ending near midnight Manila time on the wrong day.
 */
export function toManilaDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(date);
}

export async function getLastPunch(userId: string) {
  const [row] = await db.select().from(timePunches).where(eq(timePunches.userId, userId)).orderBy(desc(timePunches.punchedAt)).limit(1);
  return row ?? null;
}

export async function getStatus(userId: string) {
  const last = await getLastPunch(userId);
  return {
    clockedIn: !!last && last.type === "in",
    since: last?.punchedAt ?? null,
  };
}

/**
 * Toggles the user's punch state — always derives `in` vs `out` from their
 * last punch rather than trusting the caller, and serializes concurrent
 * calls for the same user (pg_advisory_xact_lock) so a double-tap can't
 * create two consecutive punches of the same type.
 */
export async function recordPunch(params: { userId: string; branchId: string; reason?: PunchReason }) {
  const { userId, branchId, reason } = params;

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);

    const [last] = await tx.select().from(timePunches).where(eq(timePunches.userId, userId)).orderBy(desc(timePunches.punchedAt)).limit(1);
    const nextType: PunchType = !last || last.type === "out" ? "in" : "out";

    if (nextType === "out" && !reason) {
      throw new Error("A reason is required when clocking out");
    }

    const [punch] = await tx
      .insert(timePunches)
      .values({
        userId,
        branchId,
        type: nextType,
        reason: nextType === "out" ? reason : null,
      })
      .returning();

    return punch;
  });
}

export async function listPunches(params: { userId?: string; branchId?: string; from?: Date; to?: Date; limit?: number }) {
  const { userId, branchId, from, to, limit = 500 } = params;

  return db
    .select()
    .from(timePunches)
    .where(
      and(
        userId ? eq(timePunches.userId, userId) : undefined,
        branchId ? eq(timePunches.branchId, branchId) : undefined,
        from ? gte(timePunches.punchedAt, from) : undefined,
        to ? lte(timePunches.punchedAt, to) : undefined,
      ),
    )
    .orderBy(desc(timePunches.punchedAt))
    .limit(limit);
}

export type DailyHoursRow = {
  userId: string;
  branchId: string;
  date: string;
  clockIn: Date;
  clockOut: Date | null;
  minutesWorked: number;
  incomplete: boolean;
};

/**
 * Pairs sequential in/out punches per user into shifts. No break deduction,
 * no overtime/night-diff/holiday classification — that's payroll-adjacent
 * computation this module deliberately doesn't do. A shift is bucketed
 * under the calendar date of its clock-in. An unmatched trailing "in"
 * (still clocked in, or a missed clock-out) is reported as incomplete
 * rather than guessed at.
 */
export function computeDailyHours(punches: Array<{ userId: string; branchId: string; type: string; punchedAt: Date }>): DailyHoursRow[] {
  const byUser = new Map<string, typeof punches>();
  for (const punch of punches) {
    const bucket = byUser.get(punch.userId);
    if (bucket) bucket.push(punch);
    else byUser.set(punch.userId, [punch]);
  }

  const rows: DailyHoursRow[] = [];

  for (const userPunches of byUser.values()) {
    const sorted = [...userPunches].sort((a, b) => a.punchedAt.getTime() - b.punchedAt.getTime());
    let openIn: (typeof sorted)[number] | null = null;

    for (const punch of sorted) {
      if (punch.type === "in") {
        if (openIn) rows.push(incompleteRow(openIn));
        openIn = punch;
      } else if (openIn) {
        rows.push({
          userId: openIn.userId,
          branchId: openIn.branchId,
          date: toManilaDateString(openIn.punchedAt),
          clockIn: openIn.punchedAt,
          clockOut: punch.punchedAt,
          minutesWorked: Math.round((punch.punchedAt.getTime() - openIn.punchedAt.getTime()) / 60000),
          incomplete: false,
        });
        openIn = null;
      }
      // An "out" with no preceding "in" is a data anomaly that shouldn't
      // occur given recordPunch's toggle logic — skipped rather than guessed at.
    }

    if (openIn) rows.push(incompleteRow(openIn));
  }

  return rows.sort((a, b) => b.clockIn.getTime() - a.clockIn.getTime());
}

function incompleteRow(openIn: { userId: string; branchId: string; punchedAt: Date }): DailyHoursRow {
  return {
    userId: openIn.userId,
    branchId: openIn.branchId,
    date: toManilaDateString(openIn.punchedAt),
    clockIn: openIn.punchedAt,
    clockOut: null,
    minutesWorked: 0,
    incomplete: true,
  };
}
