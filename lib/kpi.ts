"use server";
//kpi = Σ over DELIVERED tasks of: complexity_i × multiplier(task_i)

import { db } from "@/lib/db";

export type KpiRole = "LLR" | "LLT";

export type UserKpi = {
  userId: string;
  role: KpiRole;
  functionsDelivered: number; // count of DELIVERED tasks assigned to this person in this role
  onTimeCount: number;
  offTimeCount: number;
  undatedCount: number; // delivered but missing estimatedDays, so on-time/off-time can't be judged
  onTimeRate: number; // onTimeCount / (onTimeCount + offTimeCount), 0 if none are judgeable
  totalComplexity: number; // sum of complexity across all delivered tasks (null complexity = 0)
  kpi: number; // final score, see WEIGHTS below
};

// --- Tunable weights -------------------------------------------------
// kpi = Σ over delivered tasks of: complexity_i * multiplier(task_i)
//   - on-time task  -> ON_TIME_MULTIPLIER
//   - off-time task -> OFF_TIME_MULTIPLIER (penalty, < ON_TIME_MULTIPLIER)
//   - undated task (no estimatedDays to judge against) -> UNDATED_MULTIPLIER
// Adjust these to change how heavily lateness is penalized relative to
// raw complexity delivered.
const ON_TIME_MULTIPLIER = 1;
const OFF_TIME_MULTIPLIER = 0.5;
const UNDATED_MULTIPLIER = 0.75;

// A task with no complexity set contributes this many "points" instead
// of 0, so simple/unscored functions aren't worth literally nothing.
const DEFAULT_COMPLEXITY_IF_MISSING = 0;

async function computeKpiForRole(
  userId: string,
  role: KpiRole,
): Promise<UserKpi> {
  const assigneeField = role === "LLR" ? "assigneeLLRId" : "assigneeLLTId";

  const tasks = await db.task.findMany({
    where: {
      [assigneeField]: userId,
      status: "DELIVERED",
    },
    select: {
      id: true,
      complexity: true,
      estimatedDays: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  let onTimeCount = 0;
  let offTimeCount = 0;
  let undatedCount = 0;
  let totalComplexity = 0;
  let kpi = 0;

  for (const task of tasks) {
    const complexity = task.complexity ?? DEFAULT_COMPLEXITY_IF_MISSING;
    totalComplexity += complexity;

    // Due date = createdAt + estimatedDays. "Delivered" timestamp is
    // approximated by updatedAt (the row's last write, which is the
    // status->DELIVERED transition in the normal flow via saveSheet).
    // NOTE: if a Task is edited again after being marked DELIVERED
    // (e.g. a later sheet save touches another field on the same row),
    // updatedAt moves forward and this comparison silently uses that
    // later timestamp instead of the actual delivery moment. If that
    // turns out to matter, add a dedicated `deliveredAt` column set
    // once, the first time status flips to DELIVERED.
    if (task.estimatedDays == null) {
      undatedCount += 1;
      kpi += complexity * UNDATED_MULTIPLIER;
      continue;
    }

    const dueDate = new Date(task.createdAt);
    dueDate.setDate(dueDate.getDate() + task.estimatedDays);

    const onTime = task.updatedAt.getTime() <= dueDate.getTime();
    if (onTime) {
      onTimeCount += 1;
      kpi += complexity * ON_TIME_MULTIPLIER;
    } else {
      offTimeCount += 1;
      kpi += complexity * OFF_TIME_MULTIPLIER;
    }
  }

  const judged = onTimeCount + offTimeCount;
  const onTimeRate = judged > 0 ? onTimeCount / judged : 0;

  return {
    userId,
    role,
    functionsDelivered: tasks.length,
    onTimeCount,
    offTimeCount,
    undatedCount,
    onTimeRate,
    totalComplexity,
    kpi,
  };
}

// Computes the LLR KPI and LLT KPI separately for a person — they are
// two independent roles a user can hold tasks under, not summed
// together, per how assigneeLLRId/assigneeLLTId work in the schema.
export async function getUserKpi(userId: string): Promise<{
  llr: UserKpi;
  llt: UserKpi;
}> {
  const [llr, llt] = await Promise.all([
    computeKpiForRole(userId, "LLR"),
    computeKpiForRole(userId, "LLT"),
  ]);
  return { llr, llt };
}

// Convenience for a single role, if a page only ever needs one.
export async function getUserKpiForRole(
  userId: string,
  role: KpiRole,
): Promise<UserKpi> {
  return computeKpiForRole(userId, role);
}
