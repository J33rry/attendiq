"use client";
import { useState } from "react";
import { studentApi } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/hooks";
import { fmtPct, plural } from "@/lib/format";
import { Badge, Card, EmptyState, ErrorState, PageHeader, ProgressBar, Select, Skeleton, cx } from "@/components/ui/primitives";
import Icon from "@/components/ui/Icon";
import { SubjectTag } from "@/components/student/SubjectCard";

const MAX_SKIP = 20;

export default function BunkPlanner() {
  const [skip, setSkip] = useState(1);
  const [focus, setFocus] = useState("");
  const q = useDebounced(skip, 250);
  // All numbers below come from GET /api/student/planner/bunk — nothing is recalculated here.
  const { data, error, reload, loading } = useApi(() => studentApi.bunk(q), [q]);

  const plans = data?.plans;
  const threshold = data?.threshold;
  const selected = plans?.find((p) => String(p.subjectId) === focus) ?? plans?.[0];

  return (
    <>
      <PageHeader hand="the big question" title="Bunk Planner"
        subtitle="See what missing a class would really do to your percentage — before you decide." />

      {error ? <ErrorState error={error} onRetry={reload} /> : !plans ? <Skeleton className="h-64" /> : !plans.length ? (
        <EmptyState icon="compass" title="Nothing to plan yet">You aren&apos;t enrolled in any subjects.</EmptyState>
      ) : (
        <>
          {/* Scenario builder */}
          <Card className="overflow-hidden">
            <div className="grid lg:grid-cols-[1fr_1.1fr]">
              <div className="paper-dots border-b border-paper-200 bg-paper-50 p-6 lg:border-b-0 lg:border-r">
                <p className="font-hand text-xl text-ink-400">What if…</p>
                <div className="mt-2 space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-ink-700">I miss classes in</span>
                    <Select value={selected ? String(selected.subjectId) : ""} onChange={(e) => setFocus(e.target.value)}>
                      {plans.map((p) => <option key={p.subjectId} value={p.subjectId}>{p.code} · {p.name}</option>)}
                    </Select>
                  </label>
                  <div>
                    <span className="mb-1.5 block text-sm font-semibold text-ink-700">How many in a row?</span>
                    <div className="flex items-center gap-3">
                      <Stepper value={skip} onChange={setSkip} />
                      <input type="range" min={1} max={MAX_SKIP} value={skip} onChange={(e) => setSkip(Number(e.target.value))}
                        className="h-2 flex-1 cursor-pointer accent-[var(--color-sage-600)]" aria-label="Number of classes to miss" />
                    </div>
                  </div>
                </div>
                <p className="mt-6 text-xs text-ink-400">Requirement: {threshold}% · Based on classes held so far.</p>
              </div>

              {selected && <Verdict p={selected} threshold={threshold} loading={loading} />}
            </div>
          </Card>

          <h2 className="mb-1 mt-10 text-xl font-semibold">Every subject, if you miss {plural(q, "class", "classes")}</h2>
          <p className="mb-4 text-sm text-ink-400">Tap a card to explore it above.</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {plans.map((p) => (
              <Card key={p.subjectId} as="button" interactive onClick={() => { setFocus(String(p.subjectId)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={cx("p-5 text-left", selected?.subjectId === p.subjectId && "ring-2 ring-sky-400")}>
                <div className="flex items-center justify-between gap-2">
                  <SubjectTag id={p.subjectId} code={p.code} />
                  <Badge tone={p.canSkip ? "sage" : "butter"} dot>{p.canSkip ? "Room to spare" : "Better to attend"}</Badge>
                </div>
                <h3 className="mt-2 truncate font-semibold">{p.name}</h3>
                <div className="mt-3 flex items-center gap-2 text-sm tabular">
                  <span className="font-semibold">{fmtPct(p.currentPercentage)}</span>
                  <Icon name="arrowRight" size={14} className="text-ink-300" />
                  <span className={cx("font-semibold", p.canSkip ? "text-sage-700" : "text-coral-700")}>{fmtPct(p.percentageAfterSkipping)}</span>
                </div>
                <ProgressBar value={p.percentageAfterSkipping} tone={p.canSkip ? "sage" : "coral"} marker={threshold} size="sm" className="mt-2" />
                <p className="mt-3 text-sm text-ink-500">
                  Safe to miss: <span className="font-semibold text-ink-900">{p.maxSafeSkips}</span> · {p.attended}/{p.conducted} attended
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Verdict({ p, threshold, loading }) {
  const ok = p.canSkip;
  return (
    <div className={cx("relative p-6 transition-opacity", loading && "opacity-60")} aria-live="polite">
      <div className="flex items-start gap-4">
        <span className={cx("grid size-14 shrink-0 place-items-center rounded-2xl", ok ? "bg-sage-50 text-sage-700" : "bg-butter-100 text-butter-700")}>
          <Icon name={ok ? "coffee" : "board"} size={28} />
        </span>
        <div>
          <h2 className="text-2xl font-semibold leading-tight">
            {ok ? "Yes, you'd still be on track." : "This one's worth attending."}
          </h2>
          <p className="mt-1 text-ink-500">
            {ok
              ? `Missing ${plural(p.skip, "class", "classes")} of ${p.name} keeps you at or above ${threshold}%.`
              : `Missing ${plural(p.skip, "class", "classes")} of ${p.name} would take you below ${threshold}%.`}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Figure label="Right now" value={fmtPct(p.currentPercentage)} sub={`${p.attended} of ${p.conducted} attended`} />
        <Figure label={`After missing ${p.skip}`} value={fmtPct(p.percentageAfterSkipping)} sub={`${p.attended} of ${p.conducted + p.skip}`} tone={ok ? "sage" : "coral"} />
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs text-ink-400"><span>0%</span><span>Requirement {threshold}%</span><span>100%</span></div>
        <ProgressBar value={p.percentageAfterSkipping} tone={ok ? "sage" : "coral"} marker={threshold} />
      </div>

      <p className="mt-5 rounded-xl bg-paper-50 p-3 text-sm text-ink-700">
        {p.maxSafeSkips > 0
          ? <>Overall you can miss up to <strong>{plural(p.maxSafeSkips, "class", "classes")}</strong> of {p.name} and stay at {threshold}% or more.</>
          : <>There&apos;s no spare class in {p.name} right now — attending the next few will build up a cushion.</>}
        {p.upcomingClasses > 0 && <> {plural(p.upcomingClasses, "class is", "classes are")} still scheduled.</>}
      </p>
    </div>
  );
}

const Figure = ({ label, value, sub, tone }) => (
  <div className="rounded-2xl bg-paper-50 p-4 ring-1 ring-paper-200">
    <p className="text-xs font-semibold text-ink-400">{label}</p>
    <p className={cx("font-display text-3xl font-semibold tabular", tone === "sage" && "text-sage-700", tone === "coral" && "text-coral-700")}>{value}</p>
    <p className="text-xs text-ink-400 tabular">{sub}</p>
  </div>
);

function Stepper({ value, onChange }) {
  const set = (v) => onChange(Math.max(1, Math.min(MAX_SKIP, v)));
  return (
    <div className="inline-flex items-center rounded-full bg-white ring-1 ring-paper-300">
      <button onClick={() => set(value - 1)} disabled={value <= 1} className="grid size-10 place-items-center rounded-full text-lg font-bold text-ink-500 hover:bg-paper-100 disabled:opacity-30" aria-label="One fewer">−</button>
      <span className="w-8 text-center font-display text-xl font-semibold tabular" aria-live="polite">{value}</span>
      <button onClick={() => set(value + 1)} disabled={value >= MAX_SKIP} className="grid size-10 place-items-center rounded-full text-lg font-bold text-ink-500 hover:bg-paper-100 disabled:opacity-30" aria-label="One more">+</button>
    </div>
  );
}
