"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getPracticeDetail,
  getPracticeSession,
  listPractices,
  PracticeDetail,
  PracticeGenerateResult,
  PracticeSummary,
} from "@/lib/api";
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

function fromGenerateAttempt(row: PracticeGenerateResult["attempts"][number]): PracticeDetail {
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

  const openSession = useCallback(
    async (sid: string, attemptIds: number[]) => {
      setSessionId(sid);
      setLoadingSession(true);
      try {
        if (sid.startsWith("solo-")) {
          const row = await getPracticeDetail(attemptIds[0]);
          setSessionDetails([row]);
          return;
        }
        const data = await getPracticeSession(studentId, sid, COURSE_ID);
        setSessionDetails(data.attempts);
      } catch {
        setSessionDetails([]);
      } finally {
        setLoadingSession(false);
      }
    },
    [studentId],
  );

  const patchSessionItem = useCallback((attemptId: number, patch: Partial<PracticeDetail>) => {
    setSessionDetails((rows) =>
      rows.map((row) => (row.attempt_id === attemptId ? { ...row, ...patch } : row)),
    );
  }, []);

  useEffect(() => {
    refreshPractices().catch(() => setPractices([]));
    clearSession();
  }, [studentId, refreshPractices, clearSession]);

  const value = useMemo(
    () => ({
      practices,
      sessionId,
      sessionDetails,
      loadingSession,
      openSession,
      openFromGenerate,
      patchSessionItem,
      clearSession,
      refreshPractices,
    }),
    [practices, sessionId, sessionDetails, loadingSession, openSession, openFromGenerate, patchSessionItem, clearSession, refreshPractices],
  );

  return <ExerciseContext.Provider value={value}>{children}</ExerciseContext.Provider>;
}

export function useExercise() {
  const ctx = useContext(ExerciseContext);
  if (!ctx) throw new Error("useExercise must be used within ExerciseProvider");
  return ctx;
}
