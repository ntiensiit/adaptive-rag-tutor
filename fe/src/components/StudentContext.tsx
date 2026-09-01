"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { listStudents, Student } from "@/lib/api";

type StudentContextValue = {
  students: Student[];
  studentId: number;
  setStudentId: (id: number) => void;
};

const StudentContext = createContext<StudentContextValue | null>(null);

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState(1);

  useEffect(() => {
    listStudents().then((rows) => {
      setStudents(rows);
      setStudentId((id) => (rows.some((s) => s.id === id) ? id : rows[0]?.id ?? id));
    });
  }, []);

  const value = useMemo(() => ({ students, studentId, setStudentId }), [students, studentId]);
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export function useStudent() {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error("useStudent must be used within StudentProvider");
  return ctx;
}
