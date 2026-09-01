"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { MasteryBar } from "@/components/MasteryBar";
import { useStudent } from "@/components/StudentContext";
import { getProgress, Progress } from "@/lib/api";

export function ProgressSummary() {
  const { studentId } = useStudent();
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    getProgress(studentId).then(setProgress).catch(() => setProgress(null));
  }, [studentId]);

  return (
    <div className="flex flex-col gap-3 p-3">
      {!progress && <p className="text-center text-xs text-muted">Loading...</p>}
      {progress && Object.entries(progress.mastery).map(([topic, score]) => (
        <MasteryBar key={topic} topic={topic} score={score} />
      ))}
      {progress && progress.misconceptions.length > 0 && (
        <ul className="space-y-1.5 border-t border-border/80 pt-3">
          {progress.misconceptions.map((m, i) => (
            <li key={i} className="flex gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-xs">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
              <span>
                <span className="font-medium capitalize text-foreground">{m.topic}</span>: {m.pattern}
              </span>
            </li>
          ))}
        </ul>
      )}
      {progress && progress.misconceptions.length === 0 && (
        <p className="flex items-center gap-2 border-t border-border/80 pt-3 text-xs text-muted">
          <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
          No major misconceptions.
        </p>
      )}
    </div>
  );
}
