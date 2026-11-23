import { overall, THRESHOLD_PCT as T } from "./attendanceService.js";
import { bunkPlan, recoveryPlan, maxSafeBunks } from "./plannerService.js";

/**
 * Rule-based assistant. `answer()` is the single seam to swap for an external LLM later:
 * pass it the same `stats` and question and return { answer, intent }.
 */
export function answer(question, stats) {
  const q = (question || "").toLowerCase();
  const subj = stats.find((s) => q.includes(s.code.toLowerCase()) || q.includes(s.name.toLowerCase()));
  const o = overall(stats);

  if (!stats.length) return { intent: "none", answer: "You are not enrolled in any subjects yet." };

  if (/(bunk|skip|miss|leave|absent)/.test(q) && /(can|safe|how many|afford|should)/.test(q)) {
    if (subj) {
      const p = bunkPlan(subj, 1);
      return { intent: "bunk", answer: `${subj.name}: you're at ${p.currentPercentage}%. You can safely miss ${p.maxSafeSkips} more class(es) and stay at or above ${T}%.` };
    }
    const lines = stats.map((s) => `${s.name}: ${maxSafeBunks(s.attended, s.conducted)}`).join("; ");
    return { intent: "bunk", answer: `Classes you can safely skip per subject — ${lines}.` };
  }

  if (/(recover|catch up|improve|raise|need to attend|low|below|shortage)/.test(q)) {
    const targets = subj ? [subj] : stats.filter((s) => !s.eligible);
    if (!targets.length) return { intent: "recovery", answer: `Good news — every subject is at or above ${T}%.` };
    return { intent: "recovery", answer: targets.map((s) => `${s.name}: ${recoveryPlan(s).message}`).join(" ") };
  }

  if ((/(eligib|exam|detain|allowed|requirement)/.test(q) || q.includes(String(T)))) {
    const bad = stats.filter((s) => !s.eligible);
    return { intent: "eligibility", answer: bad.length
      ? `You are below ${T}% in: ${bad.map((s) => `${s.name} (${s.percentage}%)`).join(", ")}.`
      : `You meet the ${T}% requirement in every subject. Overall: ${o.percentage}%.` };
  }

  if (subj) {
    return { intent: "subject", answer: `${subj.name}: attended ${subj.attended} of ${subj.conducted} classes (${subj.percentage}%). ${subj.eligible ? "You're eligible." : `You're below the ${T}% requirement.`}` };
  }

  if (/(overall|total|attendance|percent|how am i|status)/.test(q)) {
    return { intent: "overall", answer: `Overall attendance is ${o.percentage}% (${o.attended}/${o.conducted}). ` + stats.map((s) => `${s.code}: ${s.percentage}%`).join(", ") + "." };
  }

  return { intent: "unknown", answer: "I can answer questions like “What's my overall attendance?”, “How many classes can I skip in <subject>?”, “How many classes do I need to attend to recover?”, or “Am I eligible?”" };
}
