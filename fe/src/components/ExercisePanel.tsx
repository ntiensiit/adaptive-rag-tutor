"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { useExercise } from "@/components/ExerciseContext";
import { useStudent } from "@/components/StudentContext";
import { getPractice, getProgress, submitPractice } from "@/lib/api";

const COURSE_ID = 1;

type Props = { onProgressChange?: () => void; generateSignal?: number; onClose?: () => void };

export function ExercisePanel({ onProgressChange, generateSignal = 0, onClose }: Props) {
  const { studentId } = useStudent();
  const { detail, loadingDetail, selectAttempt, refreshPractices, setDetail } = useExercise();
  const [answer, setAnswer] = useState("");
  const [practiceError, setPracticeError] = useState("");
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAnswer(detail?.student_answer ?? "");
    setPracticeError("");
  }, [detail?.attempt_id, detail?.student_answer]);

  const loadPractice = useCallback(async () => {
    setPracticeLoading(true);
    setPracticeError("");
    try {
      const item = await getPractice(studentId, COURSE_ID);
      selectAttempt(item.attempt_id);
      setDetail({
        attempt_id: item.attempt_id,
        topic: item.topic,
        question: item.question,
        student_answer: null,
        feedback: null,
        correct: null,
        submitted: false,
      });
      setAnswer("");
      await refreshPractices();
    } catch (err) {
      setPracticeError(err instanceof Error ? err.message : "Failed to load practice exercise.");
    } finally {
      setPracticeLoading(false);
    }
  }, [studentId, selectAttempt, setDetail, refreshPractices]);

  useEffect(() => {
    if (generateSignal > 0) loadPractice();
  }, [generateSignal, loadPractice]);

  async function submitAnswer() {
    if (!detail || !answer.trim() || submitting || detail.submitted) return;
    setSubmitting(true);
    try {
      const res = await submitPractice(detail.attempt_id, answer.trim());
      setDetail((d) =>
        d ? { ...d, student_answer: answer.trim(), feedback: res.feedback, correct: res.correct, submitted: true } : d,
      );
      await getProgress(studentId);
      await refreshPractices();
      onProgressChange?.();
    } finally {
      setSubmitting(false);
    }
  }

  const feedback = detail?.feedback ?? "";
  const readOnly = detail?.submitted ?? false;

  return (
    <section className="relative flex h-full min-h-0 w-full flex-col rounded-2xl border border-border/80 bg-card/50 shadow-[0_0_30px_var(--glow)] backdrop-blur-sm">
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
      <div className={`flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3 ${onClose ? "pr-11" : ""}`}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-2" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent-2">Exercises</h2>
        </div>
        <button
          className="flex shrink-0 items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs text-accent transition-all hover:bg-accent/20 disabled:opacity-50"
          disabled={practiceLoading}
          onClick={loadPractice}
          type="button"
        >
          {practiceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {practiceLoading ? "Generating..." : "New exercise"}
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
        {loadingDetail && (
          <div className="flex flex-1 items-center justify-center gap-2 text-xs text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-accent-2" />
            Loading exercise...
          </div>
        )}
        {!loadingDetail && !detail && !practiceError && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted">
            <Sparkles className="h-10 w-10 animate-pulse text-accent-2" />
            <p className="max-w-sm text-sm">Generate a practice exercise or pick one from the Drills tab.</p>
          </div>
        )}
        {practiceError && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{practiceError}</p>
        )}
        {!loadingDetail && detail && (
          <div className="space-y-4">
            <p className="rounded-xl border border-border/70 bg-background/50 p-4 text-sm leading-relaxed">
              <span className="font-mono text-xs uppercase tracking-widest text-accent-2">{detail.topic}</span>
              <br />
              {detail.question}
            </p>
            <textarea
              className="w-full rounded-xl border border-border bg-background/80 p-3 text-sm outline-none transition-all focus:border-accent/60 focus:ring-2 focus:ring-accent/20 disabled:opacity-70"
              rows={6}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write your answer..."
              disabled={submitting || readOnly}
            />
            {!readOnly && (
              <button
                className="rounded-xl bg-linear-to-r from-accent-2 to-violet-400 px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
                disabled={submitting || !answer.trim()}
                onClick={submitAnswer}
                type="button"
              >
                {submitting ? "Evaluating..." : "Submit answer"}
              </button>
            )}
            {feedback && (
              <p className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-foreground">{feedback}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
