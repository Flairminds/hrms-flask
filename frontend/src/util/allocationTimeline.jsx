// Resolves an employee's/project's allocation % as it stood on a specific
// date, using the full history of allocation snapshots (current + edits)
// instead of only today's value. This keeps historical reports (Timesheet
// Analyser, Efforts Analyser) stable even after allocations later change.
//
// Resolution rule: among snapshots whose own [start_date, end_date] window
// covers the target date, the one with the most recent effective_at wins
// (a later correction is treated as authoritative for that date). If none
// of a pair's snapshots cover the date, the snapshot with the latest
// start_date that is still <= the target date is used as a fallback.

const toTime = (d) => (d ? new Date(d).getTime() : 0);

/**
 * Groups a flat allocation-timeline response (from getAllocationTimeline)
 * by "employee_id::project_id" for fast per-pair lookups.
 */
export function buildAllocationIndex(timeline) {
  const index = new Map();
  for (const snap of timeline || []) {
    const key = `${snap.employee_id}::${snap.project_id}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(snap);
  }
  return index;
}

/**
 * Resolves the allocation % (raw 0-100 scale, same as project_allocation)
 * for one employee+project pair as of `dateStr` (YYYY-MM-DD or Date).
 * Returns 0 if no snapshot applies (e.g. date before the employee ever
 * had this allocation).
 */
export function resolveAllocationAsOf(index, employeeId, projectId, dateStr) {
  const snapshots = index.get(`${employeeId}::${projectId}`);
  if (!snapshots || snapshots.length === 0) return null;

  const target = toTime(dateStr);

  const covering = snapshots.filter((s) => {
    const start = toTime(s.start_date);
    const end = s.end_date ? toTime(s.end_date) : Infinity;
    return start <= target && target <= end;
  });

  if (covering.length > 0) {
    return covering.reduce((best, s) =>
      toTime(s.effective_at) > toTime(best.effective_at) ? s : best
    );
  }

  // Fallback: no snapshot's own window covers the date — use the most
  // recent one that had already started by then.
  const started = snapshots.filter((s) => toTime(s.start_date) <= target);
  if (started.length === 0) return null;

  return started.reduce((best, s) => {
    const bestStart = toTime(best.start_date);
    const sStart = toTime(s.start_date);
    if (sStart !== bestStart) return sStart > bestStart ? s : best;
    return toTime(s.effective_at) > toTime(best.effective_at) ? s : best;
  });
}

/**
 * Resolves an employee's TOTAL allocation % across all their projects,
 * as of `dateStr`. Pass `billableOnly: true` to sum only billable projects.
 */
export function resolveTotalAllocationAsOf(index, employeeId, dateStr, { billableOnly = false } = {}) {
  let total = 0;
  for (const key of index.keys()) {
    const [empId, projectId] = key.split('::');
    if (empId !== employeeId) continue;
    const snap = resolveAllocationAsOf(index, empId, projectId, dateStr);
    if (!snap) continue;
    if (billableOnly && !snap.is_billing) continue;
    total += snap.project_allocation;
  }
  return total;
}
