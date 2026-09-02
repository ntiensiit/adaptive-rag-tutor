"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getPracticeDetail, getPracticeSession, listPractices, PracticeDetail, PracticeGenerateResult, PracticeSummary } from "@/lib/api";
import { useStudent } from "@/components/StudentContext";

const COURSE_ID = 1;

type ExerciseContextValue = {
  practices: PracticeSummary[];
  sessionId: string | null;
  sessionDetails: PracticeDetail[];
  loadingSession: boolean;
  openSession: (sessionId: string, attemptIds: number[]) => Promise<void>;
  openFromGenerate: (session: PracticeGenerateResult) => void;
  patchSessionItem: (attemptId: number, patch: Partial<PracticeDetail>) => void;
  clearSession: () => void;
  refreshPractices: () => Promise<void>;
};

const ExerciseContext = createContext<ExerciseContextValue | null>(null);

function fromGenerateAttempt(row: PracticeGenerateResult["attempts"][number]) {
  const detail: PracticeDetail = {
    attempt_id: row.attempt_id,
    topic: row.topic,
    question: row.question,
    question_type: row.question_type,
    student_answer: null,
    feedback: null,
    correct: null,
    submitted: false,
  };
  return detail;
}

async function loadSessionDetails(studentId: number, sid: string, attemptIds: number[]) {
  if (sid.startsWith("solo-")) {
    const row = await getPracticeDetail(attemptIds[0]);
    const result = [row];
    return result;
  }
  const data = await getPracticeSession(studentId, sid, COURSE_ID);
  const result = data.attempts;
  return result;
}

export function ExerciseProvider({ children }: { children: React.ReactNode }) {
  const { studentId } = useStudent();
  const [practices, setPractices] = useState<PracticeSummary[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<PracticeDetail[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);

  const refreshPractices = useCallback(async () => {
    const rows = await listPractices(studentId, COURSE_ID);
    setPractices(rows);
  }, [studentId]);

  const clearSession = useCallback(() => {
    setSessionId(null);
    setSessionDetails([]);
  }, []);

  const openFromGenerate = useCallback((session: PracticeGenerateResult) => {
    const details = session.attempts.map(fromGenerateAttempt);
    setSessionId(session.session_id);
    setSessionDetails(details);
  }, []);

  const openSession = useCallback(async (sid: string, attemptIds: number[]) => {
    setSessionId(sid);
    setLoadingSession(true);
    try {
      const details = await loadSessionDetails(studentId, sid, attemptIds);
      setSessionDetails(details);
    } catch {
      setSessionDetails([]);
    } finally {
      setLoadingSession(false);
    }
  }, [studentId]);

  const patchSessionItem = useCallback((attemptId: number, patch: Partial<PracticeDetail>) => {
    setSessionDetails((rows) => rows.map((row) => (row.attempt_id === attemptId ? { ...row, ...patch } : row)));
  }, []);

  useEffect(() => {
    refreshPractices().catch(() => setPractices([]));
    clearSession();
  }, [studentId, refreshPractices, clearSession]);

  const value = useMemo(
    () => ({ practices, sessionId, sessionDetails, loadingSession, openSession, openFromGenerate, patchSessionItem, clearSession, refreshPractices }),
    [practices, sessionId, sessionDetails, loadingSession, openSession, openFromGenerate, patchSessionItem, clearSession, refreshPractices],
  );
  const provider = <ExerciseContext.Provider value={value}>{children}</ExerciseContext.Provider>;
  return provider;
}

export function useExercise() {
  const ctx = useContext(ExerciseContext);
  if (!ctx) throw new Error("useExercise must be used within ExerciseProvider");
  const result = ctx;
  return result;
}
