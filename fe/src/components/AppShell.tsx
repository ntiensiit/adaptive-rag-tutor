"use client";

import { GraduationCap } from "lucide-react";
import { StudentPicker } from "./StudentPicker";
import type { Student } from "@/lib/api";

type Props = {
  students: Student[];
  studentId: number;
  onStudentChange: (id: number) => void;
  children: React.ReactNode;
};

export function AppShell({ students, studentId, onStudentChange, children }: Props) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#22d3ee22,transparent_40%),radial-gradient(circle_at_80%_0%,#818cf822,transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[length:32px_32px] bg-[linear-gradient(to_right,#1e293b33_1px,transparent_1px),linear-gradient(to_bottom,#1e293b33_1px,transparent_1px)]" />
      <div className="relative flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
        <header className="mb-4 shrink-0 rounded-xl border border-border/80 bg-card/70 px-3 py-2.5 shadow-[0_0_30px_var(--glow)] backdrop-blur-md sm:mb-5 sm:rounded-2xl sm:px-4 sm:py-3">
          <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-3 text-sm">
            <div className="flex shrink-0 items-center gap-1.5 text-muted">
              <GraduationCap className="h-4 w-4 text-accent" />
              <span className="font-mono text-[10px] uppercase tracking-wider sm:text-xs">Adaptive RAG</span>
            </div>
            <StudentPicker students={students} value={studentId} onChange={onStudentChange} />
          </nav>
        </header>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
