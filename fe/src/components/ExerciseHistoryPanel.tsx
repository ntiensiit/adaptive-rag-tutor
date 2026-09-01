"use client";

import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { useExercise } from "@/components/ExerciseContext";

function formatWhen(iso: string) {
  const date = new Date(iso);
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return label;
}

function StatusIcon({ submitted, correct }: { submitted: boolean; correct: boolean | null }) {
  if (!submitted) return <Circle className="h-3 w-3 text-muted" />;
  if (correct) return <CheckCircle2 className="h-3 w-3 text-accent" />;
  return <XCircle className="h-3 w-3 text-rose-300" />;
}

export function ExerciseHistoryPanel() {
  const { practices, attemptId, selectAttempt } = useExercise();
  return (
    <div className="flex flex-col gap-1 p-2">
      {practices.length === 0 && (
        <p className="px-2 py-4 text-center text-xs text-muted">No exercises yet. Generate one in the center panel.</p>
      )}
      {practices.map((p) => {
        const active = attemptId === p.id;
        const btn = active
          ? "border-accent-2/50 bg-accent-2/15 text-foreground"
          : "border-transparent bg-background/40 text-muted hover:border-border hover:bg-background/70 hover:text-foreground";
        const status = !p.submitted ? "Pending" : p.correct ? "Correct" : "Review";
        return (
          <button
            key={p.id}
            className={`rounded-xl border px-3 py-2 text-left transition-colors ${btn}`}
            onClick={() => selectAttempt(p.id)}
            type="button"
          >
            <div className="flex items-start gap-2">
              <StatusIcon submitted={p.submitted} correct={p.correct} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium capitalize">{p.topic}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{p.title}</p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {formatWhen(p.created_at)} · {status}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
