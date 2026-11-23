"use client";
import { useEffect, useRef, useState } from "react";
import { studentApi } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { Badge, cx } from "@/components/ui/primitives";
import Icon from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/Logo";

const WELCOME = "Hey! I'm here to help you understand your attendance. Ask me anything about your classes, attendance or recovery plan.";

const INTENT = {
  overall: { label: "Overall attendance", tone: "sky" },
  subject: { label: "Subject check", tone: "lavender" },
  bunk: { label: "Bunk planner", tone: "butter" },
  recovery: { label: "Recovery plan", tone: "sage" },
  eligibility: { label: "Eligibility", tone: "coral" },
};

/** Turn "A — x: 1; y: 2." style answers into a short list when the backend returns one. */
function AnswerBody({ text }) {
  const m = text.match(/^(.*?)\s—\s(.*)$/);
  if (m && m[2].includes(";")) {
    return (
      <>
        <p>{m[1]}:</p>
        <ul className="mt-1.5 space-y-1">
          {m[2].replace(/\.$/, "").split(/;\s*/).map((line) => (
            <li key={line} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-sage-400" />{line}</li>
          ))}
        </ul>
      </>
    );
  }
  // Recovery answers list several subjects as sentences: "A: ... B: ..."
  const parts = text.split(/(?<=\.)\s(?=[A-Z][\w &]+:)/);
  if (parts.length > 1) return <ul className="space-y-1.5">{parts.map((p) => <li key={p}>{p}</li>)}</ul>;
  return <p>{text}</p>;
}

export default function AssistantPage() {
  const dash = useApi(() => studentApi.dashboard());
  const [messages, setMessages] = useState([{ id: 0, from: "bot", text: WELCOME }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const idRef = useRef(1);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);

  const firstSubject = dash.data?.subjects[0];
  const chips = [
    "What's my overall attendance?",
    firstSubject ? `How is my ${firstSubject.name} attendance?` : null,
    "Can I miss my next class?",
    "How can I improve my attendance?",
    "Explain my attendance status.",
    "Am I eligible for exams?",
  ].filter(Boolean);

  async function ask(question) {
    const q = question.trim();
    if (!q) { setHint("Type a question first — or tap one of the suggestions."); inputRef.current?.focus(); return; }
    if (busy) return;
    setHint("");
    setInput("");
    setMessages((m) => [...m, { id: idRef.current++, from: "me", text: q }]);
    setBusy(true);
    try {
      const res = await studentApi.ask(q);
      setMessages((m) => [...m, { id: idRef.current++, from: "bot", text: res.answer, intent: res.intent }]);
    } catch (e) {
      setMessages((m) => [...m, { id: idRef.current++, from: "bot", error: true, text: e.message }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="-mb-20 flex h-[calc(100dvh-9.5rem)] flex-col lg:-mb-8 lg:h-[calc(100dvh-7.5rem)]">
      <header className="mb-4 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-sage-50 ring-1 ring-sage-200"><LogoMark size={30} /></span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight">AttendIQ Assistant</h1>
          <p className="text-sm text-ink-400">Rule-based helper · reads your live attendance, no AI model involved</p>
        </div>
      </header>

      <div className="paper-dots flex-1 overflow-y-auto rounded-[var(--radius-card)] bg-paper-50 p-4 ring-1 ring-paper-300/70 sm:p-6" aria-live="polite">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.map((m) => (
            <div key={m.id} className={cx("flex animate-pop gap-2.5", m.from === "me" ? "justify-end" : "justify-start")}>
              {m.from === "bot" && <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-paper-300"><LogoMark size={20} /></span>}
              <div className={cx("max-w-[85%] rounded-2xl px-4 py-3 text-[0.95rem] leading-relaxed",
                m.from === "me" ? "rounded-br-md bg-ink-900 text-paper-50"
                  : m.error ? "rounded-bl-md bg-coral-50 text-coral-700 ring-1 ring-coral-200"
                    : "rounded-bl-md bg-white text-ink-900 shadow-soft ring-1 ring-paper-300/70")}>
                {m.from === "bot" && !m.error ? <AnswerBody text={m.text} /> : <p>{m.error ? `I couldn't get an answer: ${m.text}` : m.text}</p>}
                {INTENT[m.intent] && <Badge tone={INTENT[m.intent].tone} className="mt-2">{INTENT[m.intent].label}</Badge>}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-white ring-1 ring-paper-300"><LogoMark size={20} /></span>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3.5 ring-1 ring-paper-300/70" aria-label="Checking your attendance">
                {[0, 150, 300].map((d) => <span key={d} className="size-2 animate-bounce rounded-full bg-ink-300" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="mx-auto mt-3 w-full max-w-2xl">
        <div className="scrollbar-none -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {chips.map((c) => (
            <button key={c} onClick={() => ask(c)} disabled={busy}
              className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-ink-700 ring-1 ring-paper-300 transition hover:-translate-y-0.5 hover:ring-sage-300 hover:text-sage-700 disabled:opacity-50">
              {c}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex items-end gap-2">
          <label className="sr-only" htmlFor="ask">Ask about your attendance</label>
          <textarea id="ask" ref={inputRef} rows={1} value={input} maxLength={500}
            onChange={(e) => { setInput(e.target.value); if (hint) setHint(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
            placeholder="Ask about your classes, attendance or recovery…"
            className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl bg-white px-4 py-3 ring-1 ring-paper-300 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-sky-400" />
          <button type="submit" disabled={busy} aria-label="Send"
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sage-600 text-white shadow-soft transition hover:bg-sage-700 active:translate-y-px disabled:opacity-50">
            <Icon name="send" />
          </button>
        </form>
        <p className={cx("mt-1.5 min-h-5 text-xs", hint ? "text-coral-700" : "text-ink-400")}>{hint || "Press Enter to send · Shift + Enter for a new line"}</p>
      </div>
    </div>
  );
}
