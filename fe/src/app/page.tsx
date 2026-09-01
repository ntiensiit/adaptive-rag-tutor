"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { ExercisePanel } from "@/components/ExercisePanel";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ProgressChartPanel } from "@/components/ProgressChartPanel";
import { ResizableColumns } from "@/components/ResizableColumns";
import { useExercise } from "@/components/ExerciseContext";

export default function HomePage() {
  const { attemptId, clearAttempt } = useExercise();
  const [progressKey, setProgressKey] = useState(0);
  const [exerciseOpen, setExerciseOpen] = useState(false);

  useEffect(() => {
    if (attemptId !== null) setExerciseOpen(true);
  }, [attemptId]);

  function showExercisePanel() {
    setExerciseOpen(true);
  }

  function closeExercise() {
    setExerciseOpen(false);
    clearAttempt();
  }

  return (
    <ResizableColumns
      showMiddle
      left={<LeftSidebar progressKey={progressKey} onShowExercise={showExercisePanel} />}
      middle={
        <div className="relative h-full min-h-0 w-full">
          <ProgressChartPanel refreshKey={progressKey} />
          {exerciseOpen && (
            <div className="absolute inset-0 z-10">
              <ExercisePanel onClose={closeExercise} onProgressChange={() => setProgressKey((k) => k + 1)} />
            </div>
          )}
        </div>
      }
      right={<ChatPanel />}
    />
  );
}
