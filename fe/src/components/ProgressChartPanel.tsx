"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, LineChart } from "lucide-react";
import { DayPicker } from "react-day-picker";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProgress } from "@/components/ProgressContext";
import { useStudent } from "@/components/StudentContext";
import { DayProgress, getProgress, getProgressTimeline, Progress, ProgressTimeline } from "@/lib/api";
import { chartRows, pct, periodDays, summaryStats } from "@/lib/progress";
import "react-day-picker/style.css";

type Props = { refreshKey?: number };

const PIE_COLORS = ["#22d3ee", "#818cf8", "#f472b6", "#34d399", "#fbbf24", "#fb7185"];

function coloredPieSector(props: { index?: number }) {
  const fill = PIE_COLORS[(props.index ?? 0) % PIE_COLORS.length];
  const sector = <Sector {...props} fill={fill} />;
  return sector;
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/50 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

function AggregateCharts({ days, progress }: { days: DayProgress[]; progress: Progress | null }) {
  const rows = chartRows(days);
  const topicRows = Object.entries(progress?.mastery ?? {})
    .map(([topic, score]) => ({ topic, value: Math.round(score * 100) }))
    .sort((a, b) => b.value - a.value);
  return (
    <>
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted">Mastery trend</p>
        <ResponsiveContainer width="100%" height={200}>
          <ReLineChart data={rows}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
            <Line type="monotone" dataKey="mastery" stroke="#22d3ee" strokeWidth={2} dot={false} connectNulls />
          </ReLineChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted">Drill accuracy by day</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={rows}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
            <Bar dataKey="accuracy" fill="#818cf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {topicRows.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted">Topic mastery share</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={topicRows}
                dataKey="value"
                nameKey="topic"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                shape={coloredPieSector}
              />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

function TopicCharts({ days, timeline }: { days: DayProgress[]; timeline: ProgressTimeline }) {
  const rows = chartRows(days);
  const drills = days.reduce((sum, d) => sum + d.exercises, 0);
  const correct = days.reduce((sum, d) => sum + d.exercises_correct, 0);
  const accuracy = drills > 0 ? correct / drills : null;
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <SummaryCard label="Topic mastery" value={pct(timeline.topic_mastery)} />
        <SummaryCard label="Drill accuracy" value={pct(accuracy)} hint={`${drills} submitted`} />
      </div>
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted">Daily drill accuracy</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={rows}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
            <Bar dataKey="accuracy" fill="#22d3ee" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted">Drills completed</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={rows}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
            <Bar dataKey="drills" fill="#818cf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export function ProgressChartPanel({ refreshKey = 0 }: Props) {
  const { studentId } = useStudent();
  const {
    year,
    month,
    selectedDate,
    selectedTopic,
    calendarOpen,
    setCalendarOpen,
    setYear,
    setMonth,
    setSelectedDate,
    periodLabel,
  } = useProgress();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [timeline, setTimeline] = useState<ProgressTimeline | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getProgressTimeline(studentId, year, month, selectedTopic), getProgress(studentId)])
      .then(([nextTimeline, nextProgress]) => {
        setTimeline(nextTimeline);
        setProgress(nextProgress);
      })
      .catch(() => {
        setTimeline(null);
        setProgress(null);
      })
      .finally(() => setLoading(false));
  }, [studentId, year, month, selectedTopic, refreshKey]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) setCalendarOpen(false);
    };
    if (!calendarOpen) return;
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [calendarOpen, setCalendarOpen]);

  const days = useMemo(() => periodDays(timeline?.days ?? [], selectedDate), [selectedDate, timeline]);
  const summary = useMemo(() => summaryStats(days, progress?.mastery), [days, progress]);

  const monthDate = new Date(year, month - 1, 1);

  return (
    <section className="flex h-full min-h-0 w-full flex-col rounded-2xl border border-border/80 bg-card/50 shadow-[0_0_30px_var(--glow)] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-accent-2" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent-2">Progress</h2>
        </div>
        <div className="relative" ref={popoverRef}>
          <button
            className="flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1 text-xs font-medium text-foreground hover:border-accent/40"
            onClick={() => setCalendarOpen(!calendarOpen)}
            type="button"
          >
            <CalendarDays className="h-3.5 w-3.5 text-accent" />
            {periodLabel}
          </button>
          {calendarOpen && (
            <div className="absolute top-full right-0 z-20 mt-2 rounded-xl border border-border/80 bg-card p-3 shadow-xl">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  if (date) {
                    setYear(date.getFullYear());
                    setMonth(date.getMonth() + 1);
                  }
                  setCalendarOpen(false);
                }}
                month={monthDate}
                onMonthChange={(date) => {
                  setYear(date.getFullYear());
                  setMonth(date.getMonth() + 1);
                  setSelectedDate(undefined);
                }}
                className="rdp-dark"
              />
              <button
                className="mt-2 w-full rounded-lg border border-border/60 px-2 py-1 text-[10px] text-muted hover:text-foreground"
                onClick={() => {
                  setSelectedDate(undefined);
                  setCalendarOpen(false);
                }}
                type="button"
              >
                Full month
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="scrollbar-none flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {loading && <p className="text-center text-xs text-muted">Loading progress...</p>}
        {!loading && !selectedTopic && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <SummaryCard label="Average mastery" value={pct(summary.current)} />
              <SummaryCard
                label="Period change"
                value={summary.delta === null ? "-" : `${summary.delta >= 0 ? "+" : ""}${Math.round(summary.delta * 100)}%`}
              />
              <SummaryCard label="Drill accuracy" value={pct(summary.accuracy)} hint={summary.exercises > 0 ? `${summary.exercises} submitted` : undefined} />
              <SummaryCard label="Topics" value={String(Object.keys(progress?.mastery ?? {}).length)} />
            </div>
            <AggregateCharts days={timeline?.days ?? []} progress={progress} />
          </>
        )}
        {!loading && selectedTopic && timeline && <TopicCharts days={days} timeline={timeline} />}
        {!loading && !timeline && <p className="text-center text-xs text-muted">No progress data for this period.</p>}
      </div>
    </section>
  );
}
