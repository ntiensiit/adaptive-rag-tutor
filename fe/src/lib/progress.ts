import { format, parseISO } from "date-fns";
import { DayProgress } from "@/lib/api";

export function pct(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  const text = `${Math.round(value * 100)}%`;
  return text;
}

export function periodDays(days: DayProgress[], selectedDate?: Date) {
  if (!selectedDate) return days;
  const key = format(selectedDate, "yyyy-MM-dd");
  const filtered = days.filter((day) => day.date === key);
  return filtered;
}

export function chartRows(days: DayProgress[]) {
  const rows = days.map((day) => ({
    date: format(parseISO(day.date), "d"),
    mastery: day.avg_mastery !== null ? Math.round(day.avg_mastery * 100) : null,
    accuracy: day.exercises > 0 ? Math.round((day.exercises_correct / day.exercises) * 100) : null,
    drills: day.exercises,
  }));
  return rows;
}

export function periodStats(days: DayProgress[], topicMastery: number | null | undefined, selectedTopic: string | null) {
  const drills = days.reduce((sum, day) => sum + day.exercises, 0);
  const correct = days.reduce((sum, day) => sum + day.exercises_correct, 0);
  const chats = days.reduce((sum, day) => sum + day.chats, 0);
  const mastery = selectedTopic ? topicMastery ?? null : days.find((day) => day.avg_mastery !== null)?.avg_mastery ?? null;
  const accuracy = drills > 0 ? correct / drills : null;
  const result = { drills, correct, chats, mastery, accuracy };
  return result;
}

export function summaryStats(days: DayProgress[], mastery: Record<string, number> | undefined) {
  const tracked = days.filter((day) => day.avg_mastery !== null);
  const start = tracked[0]?.avg_mastery ?? null;
  const end = tracked[tracked.length - 1]?.avg_mastery ?? null;
  const delta = start !== null && end !== null ? end - start : null;
  const drill = periodStats(days, null, null);
  const scores = Object.values(mastery ?? {});
  const current = end ?? (scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null);
  const result = { delta, current, accuracy: drill.accuracy, exercises: drill.drills };
  return result;
}
