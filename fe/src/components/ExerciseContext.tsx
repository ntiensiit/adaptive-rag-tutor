"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getPracticeDetail, listPractices, PracticeDetail, PracticeSummary } from "@/lib/api";
import { useStudent } from "@/components/StudentContext";

const COURSE_ID = 1;

type ExerciseContextValue = {
  practices: PracticeSummary[];
  attemptId: number | null;
  detail: PracticeDetail | null;
  loadingDetail: boolean;
  selectAttempt: (id: number | null) => void;
  clearAttempt: () => void;
  refreshPractices: () => Promise<void>;
  reloadDetail: () => Promise<void>;
  setDetail: React.Dispatch<React.SetStateAction<PracticeDetail | null>>;
};

const ExerciseContext = createContext<ExerciseContextValue | null>(null);

export function ExerciseProvider({ children }: { children: React.ReactNode }) {
  const { studentId } = useStudent();
  const [practices, setPractices] = useState<PracticeSummary[]>([]);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PracticeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const refreshPractices = useCallback(async () => {
    const rows = await listPractices(studentId, COURSE_ID);
    setPractices(rows);
  }, [studentId]);

  const reloadDetail = useCallback(async () => {
    if (!attemptId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const row = await getPracticeDetail(attemptId);
      setDetail(row);
    } finally {
      setLoadingDetail(false);
    }
  }, [attemptId]);

  useEffect(() => {
    refreshPractices().catch(() => setPractices([]));
    setAttemptId(null);
    setDetail(null);
  }, [studentId, refreshPractices]);

  useEffect(() => {
    reloadDetail().catch(() => setDetail(null));
  }, [attemptId, reloadDetail]);

  const selectAttempt = useCallback((id: number | null) => {
    setAttemptId(id);
  }, []);

  const clearAttempt = useCallback(() => {
    setAttemptId(null);
    setDetail(null);
  }, []);

  const value = useMemo(
    () => ({
      practices,
      attemptId,
      detail,
      loadingDetail,
      selectAttempt,
      clearAttempt,
      refreshPractices,
      reloadDetail,
      setDetail,
    }),
    [practices, attemptId, detail, loadingDetail, selectAttempt, clearAttempt, refreshPractices, reloadDetail],
  );

  return <ExerciseContext.Provider value={value}>{children}</ExerciseContext.Provider>;
}

export function useExercise() {
  const ctx = useContext(ExerciseContext);
  if (!ctx) throw new Error("useExercise must be used within ExerciseProvider");
  return ctx;
}
