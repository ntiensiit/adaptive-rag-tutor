"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Sparkles, X } from "lucide-react";
import { ExerciseQuestion } from "@/components/ExerciseQuestion";
import { useExercise } from "@/components/ExerciseContext";
import { useStudent } from "@/components/StudentContext";
import {
  generatePractices,
  getProgress,
  QUESTION_TYPE_OPTIONS,
  QuestionType,
  submitPractice,
} from "@/lib/api";

const COURSE_ID = 1;
const MIN_COUNT = 1;
const MAX_COUNT = 10;
const COUNT_OPTIONS = Array.from({ length: MAX_COUNT }, (_, i) => i + MIN_COUNT);

type Props = { onProgressChange?: () => void; onClose?: () => void };

const selectWrap = "rounded-lg border border-border/60 bg-background/50 px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent/50";

function typesSummary(selected: QuestionType[]) {
  if (selected.length === 1) {
    const row = QUESTION_TYPE_OPTIONS.find((item) => item.id === selected[0]);
    const label = row?.label ?? selected[0].replace(/_/g, " ");
    return label;
  }
  const text = `${selected.length} types selected`;
  return text;
}

export function ExercisePanel({ onProgressChange, onClose }: Props) {
  const { studentId } = useStudent();
  const { sessionDetails, loadingSession, openFromGenerate, patchSessionItem, refreshPractices } = useExercise();
  const typesRef = useRef<HTMLDivElement>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [practiceError, setPracticeError] = useState("");
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(1);
  const [types, setTypes] = useState<QuestionType[]>(["short_answer"]);
  const [typesOpen, setTypesOpen] = useState(false);

  useEffect(() => {
    const next: Record<number, string> = {};
    for (const item of sessionDetails) {
      next[item.attempt_id] = item.student_answer ?? "";
    }
    setAnswers(next);
  }, [sessionDetails]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!typesRef.current?.contains(e.target as Node)) setTypesOpen(false);
    };
    if (!typesOpen) return;
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [typesOpen]);

  const toggleType = useCallback((type: QuestionType) => {
    setTypes((prev) => {
      const next = prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type];
      const result = next.length ? next : prev;
      return result;
    });
  }, []);

  const loadPractice = useCallback(async () => {
    if (!types.length) {
      setPracticeError("Select at least one question type.");
      return;
    }
    setPracticeLoading(true);
    setPracticeError("");
    try {
      const session = await generatePractices(studentId, COURSE_ID, count, types);
      if (!session.attempts.length) throw new Error("No exercises were generated.");
      openFromGenerate(session);
      await refreshPractices();
    } catch (err) {
      const msg = err instanceof Error && err.name === "AbortError" ? "Generation timed out. Try fewer questions." : err instanceof Error ? err.message : "Failed to load practice exercise.";
      setPracticeError(msg);
    } finally {
      setPracticeLoading(false);
    }
  }, [studentId, count, types, openFromGenerate, refreshPractices]);

  const submitAll = useCallback(async () => {
    const pending = sessionDetails.filter((row) => !row.submitted);
    if (!pending.length || submitting) return;
    const missing = pending.some((row) => !answers[row.attempt_id]?.trim());
    if (missing) {
      setPracticeError("Answer every question before submitting.");
      return;
    }
    setPracticeError("");
    setSubmitting(true);
    try {
      for (const item of pending) {
        const text = answers[item.attempt_id].trim();
        const res = await submitPractice(item.attempt_id, text);
        patchSessionItem(item.attempt_id, {
          student_answer: text,
          feedback: res.feedback,
          correct: res.correct,
          submitted: true,
        });
      }
      await getProgress(studentId);
      await refreshPractices();
      onProgressChange?.();
    } finally {
      setSubmitting(false);
    }
  }, [answers, sessionDetails, submitting, patchSessionItem, studentId, refreshPractices, onProgressChange]);

  const canGenerate = types.length > 0 && !practiceLoading;
  const hasPractice = sessionDetails.length > 0;
  const allSubmitted = hasPractice && sessionDetails.every((row) => row.submitted);
  const pendingCount = sessionDetails.filter((row) => !row.submitted).length;
  const canSubmit =
    pendingCount > 0 &&
    !submitting &&
    sessionDetails.filter((row) => !row.submitted).every((row) => answers[row.attempt_id]?.trim());

  return (
    <section className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/50 shadow-[0_0_30px_var(--glow)] backdrop-blur-sm">
      {onClose && (
        <button
          className="absolute top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card text-muted shadow-sm transition-colors hover:border-border hover:text-foreground"
          onClick={onClose}
          type="button"
          title="Close exercises"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <div className={`shrink-0 flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3 ${onClose ? "pr-11" : ""}`}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-2" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent-2">Exercises</h2>
          {hasPractice && (
            <span className="rounded-md border border-border/70 bg-background/60 px-2 py-0.5 text-[10px] text-muted">
              {sessionDetails.length} {sessionDetails.length === 1 ? "question" : "questions"}
            </span>
          )}
        </div>
        <button
          className="flex shrink-0 items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs text-accent transition-all hover:bg-accent/20 disabled:opacity-50"
          disabled={!canGenerate}
          onClick={loadPractice}
          type="button"
        >
          {practiceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {practiceLoading ? "Generating..." : count > 1 ? `Generate ${count}` : "New exercise"}
        </button>
      </div>
      <div className="shrink-0 border-b border-border/60 px-4 py-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            Questions
            <select
              className={`${selectWrap} w-full cursor-pointer`}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {COUNT_OPTIONS.map((n) => (
                <option key={n} value={n} className="bg-card text-foreground">
                  {n} {n === 1 ? "question" : "questions"}
                </option>
              ))}
            </select>
          </label>
          <div className="relative flex flex-col gap-1.5 text-xs text-muted" ref={typesRef}>
            Question types
            <button
              className={`${selectWrap} flex w-full cursor-pointer items-center justify-between gap-2 text-left`}
              onClick={() => setTypesOpen((open) => !open)}
              type="button"
            >
              <span className="truncate text-foreground">{typesSummary(types)}</span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${typesOpen ? "rotate-180" : ""}`} />
            </button>
            {typesOpen && (
              <ul className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-lg border border-border/80 bg-card shadow-xl">
                {QUESTION_TYPE_OPTIONS.map((item) => {
                  const active = types.includes(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs transition-colors ${active ? "bg-accent-2/15 text-foreground" : "text-muted hover:bg-background/80 hover:text-foreground"}`}
                        onClick={() => toggleType(item.id)}
                        type="button"
                      >
                        <span className={`h-3.5 w-3.5 rounded border ${active ? "border-accent-2 bg-accent-2" : "border-border"}`} />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="scrollbar-none flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
        {(loadingSession || practiceLoading) && (
          <div className="flex items-center justify-center gap-2 py-16 text-xs text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-accent-2" />
            Loading practice...
          </div>
        )}
        {!loadingSession && !practiceLoading && !hasPractice && !practiceError && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted">
            <Sparkles className="h-10 w-10 animate-pulse text-accent-2" />
            <p className="max-w-sm text-sm">Choose question count and types, then generate a practice or pick one from Drills.</p>
          </div>
        )}
        {practiceError && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{practiceError}</p>
        )}
        {!loadingSession && !practiceLoading && hasPractice && (
          <div className="space-y-6">
            {sessionDetails.map((item, index) => (
              <ExerciseQuestion
                key={item.attempt_id}
                item={item}
                index={index}
                total={sessionDetails.length}
                answer={answers[item.attempt_id] ?? ""}
                disabled={submitting || item.submitted}
                onAnswer={(value) => setAnswers((prev) => ({ ...prev, [item.attempt_id]: value }))}
              />
            ))}
          </div>
        )}
        </div>
        {!loadingSession && !practiceLoading && hasPractice && !allSubmitted && (
          <div className="shrink-0 border-t border-border/80 px-4 py-3">
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-accent-2 to-violet-400 px-4 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
              disabled={!canSubmit}
              onClick={submitAll}
              type="button"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
