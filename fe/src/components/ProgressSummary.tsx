"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useProgress } from "@/components/ProgressContext";
import { useStudent } from "@/components/StudentContext";
import { getProgress, getProgressTimeline } from "@/lib/api";
import { pct, periodDays, periodStats } from "@/lib/progress";

type Props = { refreshKey?: number };

export function ProgressSummary({ refreshKey = 0 }: Props) {
  const { studentId } = useStudent();
  const { year, month, selectedDate, selectedTopic, setSelectedTopic, periodLabel } = useProgress();
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof getProgress>> | null>(null);
  const [timeline, setTimeline] = useState<Awaited<ReturnType<typeof getProgressTimeline>> | null>(null);

  useEffect(() => {
    Promise.all([getProgress(studentId), getProgressTimeline(studentId, year, month, selectedTopic)])
      .then(([nextProgress, nextTimeline]) => {
        setProgress(nextProgress);
        setTimeline(nextTimeline);
      })
      .catch(() => {
        setProgress(null);
        setTimeline(null);
      });
  }, [studentId, year, month, selectedTopic, refreshKey]);

  const topics = useMemo(() => Object.entries(progress?.mastery ?? {}).sort((a, b) => b[1] - a[1]), [progress]);
  const period = useMemo(() => periodDays(timeline?.days ?? [], selectedDate), [selectedDate, timeline]);
  const stats = useMemo(() => periodStats(period, timeline?.topic_mastery, selectedTopic), [period, selectedTopic, timeline]);
  const misc = progress?.misconceptions.filter((m) => !selectedTopic || m.topic === selectedTopic) ?? [];
  const body = (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted">{periodLabel}</p>
      {!progress && <p className="text-center text-xs text-muted">Loading...</p>}
      {progress && (
        <>
          <div className="flex flex-wrap gap-1.5">
            <button className={`rounded-lg border px-2 py-1 text-[10px] capitalize transition-colors ${selectedTopic === null ? "border-accent bg-accent/15 text-accent" : "border-border/60 text-muted hover:text-foreground"}`} onClick={() => setSelectedTopic(null)} type="button">All topics</button>
            {topics.map(([topic, score]) => {
              const active = selectedTopic === topic;
              const tone = active ? "border-accent-2 bg-accent-2/15 text-accent-2" : "border-border/60 text-muted hover:text-foreground";
              return (
                <button key={topic} className={`rounded-lg border px-2 py-1 text-[10px] capitalize transition-colors ${tone}`} onClick={() => setSelectedTopic(active ? null : topic)} type="button">
                  {topic} {Math.round(score * 100)}%
                </button>
              );
            })}
          </div>
          {selectedTopic && (
            <div className="rounded-xl border border-border/70 bg-background/50 p-3 text-xs">
              <p className="font-medium capitalize text-foreground">{selectedTopic}</p>
              <p className="mt-2 text-muted">Mastery {pct(stats.mastery)}</p>
              <p className="mt-1 text-muted">Drill accuracy {pct(stats.accuracy)} ({stats.drills} drills)</p>
              <p className="mt-1 text-muted">{stats.chats} tutor exchanges</p>
            </div>
          )}
          {misc.length > 0 && (
            <ul className="space-y-1.5 border-t border-border/80 pt-3">
              {misc.map((m, i) => (
                <li key={i} className="flex gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-xs">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
                  <span><span className="font-medium capitalize text-foreground">{m.topic}</span>: {m.pattern}</span>
                </li>
              ))}
            </ul>
          )}
          {!selectedTopic && topics.length > 0 && <p className="text-xs text-muted">Select a topic to see period stats in the chart panel.</p>}
        </>
      )}
    </div>
  );
  return body;
}
