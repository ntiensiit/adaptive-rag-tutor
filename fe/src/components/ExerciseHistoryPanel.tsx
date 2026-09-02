"use client";

import { format, parseISO } from "date-fns";
import { CheckCircle2, Circle, Layers, XCircle } from "lucide-react";
import { useExercise } from "@/components/ExerciseContext";
import { groupPracticeSessions } from "@/lib/practiceSessions";

function SessionStatus({ submitted, count, correct }: { submitted: number; count: number; correct: number }) {
  if (submitted === 0) return <Circle className="h-3.5 w-3.5 text-muted" />;
  if (submitted < count) return <Circle className="h-3.5 w-3.5 text-amber-300" />;
  if (correct === count) return <CheckCircle2 className="h-3.5 w-3.5 text-accent" />;
  return <XCircle className="h-3.5 w-3.5 text-rose-300" />;
}

export function ExerciseHistoryPanel() {
  const { practices, sessionId, openSession } = useExercise();
  const sessions = groupPracticeSessions(practices);
  return (
    <div className="flex flex-col gap-1 p-2">
      {sessions.length === 0 && (
        <p className="px-2 py-4 text-center text-xs text-muted">No practices yet. Generate one in the center panel.</p>
      )}
      {sessions.map((session) => {
        const active = sessionId === session.session_id;
        const btn = active
          ? "border-accent-2/50 bg-accent-2/15 text-foreground"
          : "border-transparent bg-background/40 text-muted hover:border-border hover:bg-background/70 hover:text-foreground";
        const done = session.submitted === session.count;
        const status = !session.submitted
          ? "Not started"
          : !done
            ? `${session.submitted}/${session.count} answered`
            : session.correct === session.count
              ? "All correct"
              : `${session.correct}/${session.count} correct`;
        return (
          <button
            key={session.session_id}
            className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${btn}`}
            onClick={() => openSession(session.session_id, session.attemptIds)}
            type="button"
          >
            <div className="flex items-start gap-2">
              <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-2" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    Practice ({session.count} {session.count === 1 ? "question" : "questions"})
                  </p>
                  <SessionStatus submitted={session.submitted} count={session.count} correct={session.correct} />
                </div>
                <p className="mt-0.5 text-xs text-muted">{format(parseISO(session.created_at), "MMM d, HH:mm")} | {status}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
