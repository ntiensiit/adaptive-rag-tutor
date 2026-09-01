"use client";

import { StudentProvider, useStudent } from "@/components/StudentContext";
import { ConversationProvider } from "@/components/ConversationContext";
import { ExerciseProvider } from "@/components/ExerciseContext";
import { AppShell } from "@/components/AppShell";

function Shell({ children }: { children: React.ReactNode }) {
  const { students, studentId, setStudentId } = useStudent();
  return (
    <AppShell students={students} studentId={studentId} onStudentChange={setStudentId}>
      <ConversationProvider>
        <ExerciseProvider>{children}</ExerciseProvider>
      </ConversationProvider>
    </AppShell>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudentProvider>
      <Shell>{children}</Shell>
    </StudentProvider>
  );
}
