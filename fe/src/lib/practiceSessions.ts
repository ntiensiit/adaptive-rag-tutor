import { compareDesc, parseISO } from "date-fns";
import { PracticeSummary } from "@/lib/api";

export type PracticeSessionGroup = {
  session_id: string;
  created_at: string;
  count: number;
  submitted: number;
  correct: number;
  attemptIds: number[];
};

export function groupPracticeSessions(practices: PracticeSummary[]): PracticeSessionGroup[] {
  const groups = new Map<string, PracticeSummary[]>();
  for (const row of practices) {
    const key = row.session_id ?? `solo-${row.id}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  const sessions = [...groups.entries()].map(([session_id, items]) => {
    const sorted = [...items].sort((a, b) => a.id - b.id);
    const latest = sorted.reduce((best, item) => (compareDesc(parseISO(item.created_at), parseISO(best.created_at)) < 0 ? item : best), sorted[0]);
    const submitted = sorted.filter((item) => item.submitted).length;
    const correct = sorted.filter((item) => item.correct).length;
    const group: PracticeSessionGroup = {
      session_id,
      created_at: latest.created_at,
      count: sorted.length,
      submitted,
      correct,
      attemptIds: sorted.map((item) => item.id),
    };
    return group;
  });
  sessions.sort((a, b) => compareDesc(parseISO(a.created_at), parseISO(b.created_at)));
  return sessions;
}
