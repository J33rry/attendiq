import { THRESHOLD, THRESHOLD_PCT, pct } from "./attendanceService.js";

/** Max consecutive classes that can be skipped while staying >= the threshold: a/(c+n) >= T */
export function maxSafeBunks(attended, conducted) {
  return Math.max(0, Math.floor(attended / THRESHOLD - conducted + 1e-9));
}

/** Smallest x such that (a+x)/(c+x) >= T  =>  x >= (T*c - a)/(1-T) */
export function classesToRecover(attended, conducted) {
  if (conducted === 0 || attended / conducted >= THRESHOLD) return 0;
  return Math.ceil((THRESHOLD * conducted - attended) / (1 - THRESHOLD) - 1e-9);
}

export function bunkPlan(stat, skip) {
  const { attended: a, conducted: c, upcoming } = stat;
  const n = skip ?? 1;
  const after = pct(a, c + n);
  const safe = maxSafeBunks(a, c);
  return {
    subjectId: stat.id, code: stat.code, name: stat.name,
    attended: a, conducted: c, currentPercentage: pct(a, c),
    skip: n, percentageAfterSkipping: after,
    canSkip: after >= THRESHOLD * 100,
    maxSafeSkips: safe,
    upcomingClasses: upcoming,
    // worst case over the rest of the semester: skip n of the upcoming classes
    verdict: after >= THRESHOLD * 100
      ? `Safe: you would stay at ${after}% after missing ${n} class(es).`
      : `Risky: missing ${n} class(es) drops you to ${after}%, below ${THRESHOLD_PCT}%.`,
  };
}

export function recoveryPlan(stat) {
  const need = classesToRecover(stat.attended, stat.conducted);
  const feasible = need <= stat.upcoming;
  return {
    subjectId: stat.id, code: stat.code, name: stat.name,
    attended: stat.attended, conducted: stat.conducted, currentPercentage: pct(stat.attended, stat.conducted),
    classesNeeded: need, upcomingClasses: stat.upcoming,
    feasible: need === 0 ? true : feasible,
    message: need === 0
      ? `Attendance is at or above ${THRESHOLD_PCT}%.`
      : `Attend the next ${need} class(es) in a row to reach ${THRESHOLD_PCT}%.${feasible ? "" : ` Only ${stat.upcoming} are scheduled, so it cannot be reached by the scheduled sessions alone.`}`,
  };
}
