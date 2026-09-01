"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { ExercisePanel } from "@/components/ExercisePanel";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ResizableColumns } from "@/components/ResizableColumns";
import { useExercise } from "@/components/ExerciseContext";

export default function HomePage() {
  const { attemptId, clearAttempt } = useExercise();
  const [progressKey, setProgressKey] = useState(0);
  const [generateSignal, setGenerateSignal] = useState(0);
  const [exerciseOpen, setExerciseOpen] = useState(false);

  useEffect(() => {
    if (attemptId !== null) setExerciseOpen(true);
  }, [attemptId]);

  function openExercise() {
    setExerciseOpen(true);
    setGenerateSignal((n) => n + 1);
  }

  function closeExercise() {
    setExerciseOpen(false);
    clearAttempt();
  }

  return (
    <ResizableColumns
      showMiddle={exerciseOpen}
      left={<LeftSidebar progressKey={progressKey} onNewExercise={openExercise} />}
      middle={
        <ExercisePanel
          generateSignal={generateSignal}
          onClose={closeExercise}
          onProgressChange={() => setProgressKey((k) => k + 1)}
        />
      }
      right={<ChatPanel />}
    />
  );
}
