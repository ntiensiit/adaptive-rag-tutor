"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { ExercisePanel } from "@/components/ExercisePanel";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ProgressChartPanel } from "@/components/ProgressChartPanel";
import { ResizableColumns } from "@/components/ResizableColumns";
import { useExercise } from "@/components/ExerciseContext";

export default function HomePage() {
  const { sessionId, clearSession } = useExercise();
  const [progressKey, setProgressKey] = useState(0);
  const [exerciseOpen, setExerciseOpen] = useState(false);

  useEffect(() => {
    if (sessionId !== null) setExerciseOpen(true);
  }, [sessionId]);

  function showExercisePanel() {
    setExerciseOpen(true);
  }

  function closeExercise() {
    setExerciseOpen(false);
    clearSession();
  }

  return (
    <ResizableColumns
      showMiddle
      left={<LeftSidebar progressKey={progressKey} onShowExercise={showExercisePanel} />}
      middle={
        <div className="relative h-full min-h-0 w-full">
          <ProgressChartPanel refreshKey={progressKey} />
          {exerciseOpen && (
            <div className="absolute inset-0 z-10 min-h-0 overflow-hidden">
              <ExercisePanel onClose={closeExercise} onProgressChange={() => setProgressKey((k) => k + 1)} />
            </div>
          )}
        </div>
      }
      right={<ChatPanel />}
    />
  );
}
