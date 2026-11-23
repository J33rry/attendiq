import { overall as overallOf } from "../attendanceService.js";
import { maxSafeBunks, classesToRecover } from "../plannerService.js";
import { answer as ruleBasedAnswer } from "../assistantService.js";
import { systemPrompt, TOOLS } from "./prompt.js";
import { runReadOnlyQuery, QueryRejected } from "./readOnlyQuery.js";
import { checkOutput, REFUSAL } from "./guardrails.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const PLACEHOLDER_KEY = "your-groq-api-key-here";
const MAX_TOOL_ROUNDS = 4;
const TIMEOUT_MS = 20_000;

// Groq retires models regularly; override with GROQ_MODEL (list: GET https://api.groq.com/openai/v1/models).
const MODEL = () => process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const apiKey = () => process.env.GROQ_API_KEY?.trim() || PLACEHOLDER_KEY;
export const groqConfigured = () => apiKey() !== PLACEHOLDER_KEY && process.env.NODE_ENV !== "test";

async function chat(messages, { tools = true } = {}) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey()}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL(),
      messages,
      temperature: 0.2,
      max_tokens: 2000,
      // gpt-oss models reason before answering; keep that short so the answer fits in max_tokens.
      ...(/gpt-oss/.test(MODEL()) ? { reasoning_effort: "low" } : {}),
      ...(tools ? { tools: TOOLS, tool_choice: "auto", parallel_tool_calls: false } : {}),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`Groq ${res.status}: ${body.slice(0, 200)}`), { status: res.status });
  }
  return (await res.json()).choices?.[0]?.message;
}

async function runTool(call, studentId) {
  if (call.function?.name !== "query_attendance_db") return { error: "unknown tool" };
  let args;
  try { args = JSON.parse(call.function.arguments || "{}"); } catch { return { error: "arguments must be JSON" }; }
  try {
    return await runReadOnlyQuery(studentId, args.sql);
  } catch (e) {
    if (e instanceof QueryRejected) return { error: `query rejected: ${e.message}` };
    return { error: "query failed: " + String(e.message || e).split("\n")[0].slice(0, 200) };
  }
}

/**
 * Answer a student's question with Groq. Falls back to the rule-based assistant when no key
 * is configured or the model call fails, so the feature always responds.
 */
export async function askAssistant({ question, history, student, user, stats }) {
  if (!groqConfigured()) return { ...ruleBasedAnswer(question, stats), source: "rules" };

  const plans = stats.map((s) => ({
    subject: s.name, code: s.code, attended: s.attended, conducted: s.conducted, upcoming: s.upcoming,
    percentage: s.percentage, eligible: s.eligible,
    safeSkips: maxSafeBunks(s.attended, s.conducted),
    classesNeededToRecover: classesToRecover(s.attended, s.conducted),
  }));
  const messages = [
    { role: "system", content: systemPrompt({ student: { ...student, name: user.name }, stats, overall: overallOf(stats), plans }) },
    ...history,
    { role: "user", content: question },
  ];

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const msg = await chat(messages, { tools: round < MAX_TOOL_ROUNDS });
      if (!msg) break;
      if (msg.tool_calls?.length) {
        messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls });
        for (const call of msg.tool_calls) {
          const result = await runTool(call, student.id);
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result).slice(0, 12_000) });
        }
        continue;
      }
      const safe = checkOutput(msg.content, { ownEmail: user.email });
      return safe ? { intent: "ai", answer: safe, source: "groq" } : { intent: "refused", answer: REFUSAL, source: "guardrail" };
    }
  } catch (e) {
    console.error("[assistant] Groq failed, using rule-based fallback:", e.message);
  }
  return { ...ruleBasedAnswer(question, stats), source: "rules" };
}
