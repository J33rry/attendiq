/**
 * Guardrails around the LLM assistant: input screening, per-user rate limiting and
 * output checks. These run in code, independent of the model following its system prompt.
 */

export const LIMITS = {
  questionChars: 500,
  historyTurns: 6,
  historyChars: 1000,
  answerChars: 1500,
  requestsPerWindow: Number(process.env.ASSISTANT_RATE_LIMIT ?? 15),
  windowMs: 60_000,
};

export const REFUSAL = "I can only help with your own attendance, classes, schedule and recovery plans in AttendIQ.";

// Prompt-injection / jailbreak / data-exfiltration attempts we refuse before calling the model.
const BLOCKED_INPUT = [
  /\b(ignore|disregard|forget|override)\b.{0,40}\b(previous|above|prior|earlier|system|all)\b.{0,20}\b(instructions?|prompts?|rules?|messages?)/i,
  /\b(system|developer)\s*(prompt|message|instructions?)\b/i,
  /\b(jailbreak|dan mode|developer mode|god mode)\b/i,
  /\byou are (now|no longer)\b/i,
  /\b(act|pretend|roleplay)\s+(as|to be)\b/i,
  /\b(password|passwd|password_hash|auth_sessions?|session token|api[_\s-]?key|secret|credentials?)\b/i,
  /\b(drop|truncate|delete|insert|update|alter|grant)\s+(table|from|into|database|on)\b/i,
  /\b(other|another|all|every)\s+(students?|users?|people)('s)?\b.{0,40}\b(attendance|data|records?|details|emails?|marks)\b/i,
  /<\/?(system|assistant|tool)>/i,
];

export function screenInput(question) {
  const q = question.normalize("NFKC").replace(/[​-‏⁠﻿]/g, "");
  if (BLOCKED_INPUT.some((re) => re.test(q))) return { ok: false, reason: "blocked_input" };
  return { ok: true, question: q.trim() };
}

/** Keep only well-formed, short prior turns; never trust client-supplied system/tool messages. */
export function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-LIMITS.historyTurns)
    .map((m) => ({ role: m.role, content: m.content.normalize("NFKC").slice(0, LIMITS.historyChars) }))
    .filter((m) => m.role !== "user" || screenInput(m.content).ok);
}

// Things that must never appear in an answer, whatever the model decides.
const BLOCKED_OUTPUT = [
  /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{20,}/, // bcrypt hashes
  /\bgsk_[A-Za-z0-9]{10,}/, // Groq keys
  /\bpassword_hash\b|\bauth_sessions\b/i,
  /postgres(ql)?:\/\/\S+/i, // connection strings
];

/** Returns a safe answer string, or null if the output must be discarded. */
export function checkOutput(text, { ownEmail } = {}) {
  if (typeof text !== "string" || !text.trim()) return null;
  if (BLOCKED_OUTPUT.some((re) => re.test(text))) return null;
  // Only the student's own email may appear.
  const emails = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [];
  if (emails.some((e) => e.toLowerCase() !== (ownEmail || "").toLowerCase())) return null;
  let out = text.trim();
  if (out.length > LIMITS.answerChars) out = out.slice(0, LIMITS.answerChars).replace(/\s+\S*$/, "") + "…";
  return out;
}

// Simple in-memory sliding window per user. Per-instance only (serverless instances don't share
// it), which is fine as a cost guard; use a shared store if you need a hard global limit.
const hits = new Map();
export function rateLimit(userId, now = Date.now()) {
  const recent = (hits.get(userId) || []).filter((t) => now - t < LIMITS.windowMs);
  if (recent.length >= LIMITS.requestsPerWindow) {
    hits.set(userId, recent);
    return { ok: false, retryAfterSec: Math.ceil((LIMITS.windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(userId, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < LIMITS.windowMs)) hits.delete(k);
  return { ok: true };
}
