"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { format } from "date-fns";

type ProgressState = {
  year: number;
  month: number;
  selectedDate: Date | undefined;
  selectedTopic: string | null;
  calendarOpen: boolean;
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
  setSelectedDate: (date: Date | undefined) => void;
  setSelectedTopic: (topic: string | null) => void;
  setCalendarOpen: (open: boolean) => void;
  periodLabel: string;
};

const ProgressContext = createContext<ProgressState | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const periodLabel = useMemo(() => {
    if (selectedDate) {
      const label = format(selectedDate, "MMM d, yyyy");
      return label;
    }
    const label = format(new Date(year, month - 1, 1), "MMM yyyy");
    return label;
  }, [month, selectedDate, year]);
  const value = useMemo(
    () => ({
      year,
      month,
      selectedDate,
      selectedTopic,
      calendarOpen,
      setYear,
      setMonth,
      setSelectedDate,
      setSelectedTopic,
      setCalendarOpen,
      periodLabel,
    }),
    [calendarOpen, month, periodLabel, selectedDate, selectedTopic, year],
  );
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
