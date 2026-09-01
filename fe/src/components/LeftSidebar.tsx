"use client";

import { useState } from "react";
import { ClipboardList, MessageSquarePlus, MessagesSquare, Sparkles } from "lucide-react";
import { ChatHistoryPanel } from "@/components/ChatHistoryPanel";
import { ExerciseHistoryPanel } from "@/components/ExerciseHistoryPanel";
import { ProgressSummary } from "@/components/ProgressSummary";
import { useConversation } from "@/components/ConversationContext";

type Tab = "history" | "exercises" | "progress";
type Props = { progressKey: number; onShowExercise: () => void };

export function LeftSidebar({ progressKey, onShowExercise }: Props) {
  const [tab, setTab] = useState<Tab>("history");
  const { startNewChat } = useConversation();
  const historyActive = tab === "history";
  const exercisesActive = tab === "exercises";
  const progressActive = tab === "progress";
  const historyTab = historyActive
    ? "border-accent text-accent"
    : "border-transparent text-muted hover:text-foreground";
  const exercisesTab = exercisesActive
    ? "border-accent-2 text-accent-2"
    : "border-transparent text-muted hover:text-foreground";
  const progressTab = progressActive
    ? "border-accent-2 text-accent-2"
    : "border-transparent text-muted hover:text-foreground";

  function showExercisePanel() {
    onShowExercise();
    setTab("exercises");
  }

  return (
    <aside className="grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border border-border/80 bg-card/50 shadow-[0_0_30px_var(--glow)] backdrop-blur-sm">
      <div className="flex shrink-0 items-stretch border-b border-border/80">
        <div className="scrollbar-none flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2 py-2">
          <button
            className={`flex shrink-0 items-center justify-center gap-1.5 border-b-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${historyTab}`}
            onClick={() => setTab("history")}
            type="button"
          >
            <MessagesSquare className="h-3.5 w-3.5" />
            Chats
          </button>
          <button
            className={`flex shrink-0 items-center justify-center gap-1.5 border-b-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${exercisesTab}`}
            onClick={() => setTab("exercises")}
            type="button"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Drills
          </button>
          <button
            className={`flex shrink-0 items-center justify-center gap-1.5 border-b-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${progressTab}`}
            onClick={() => setTab("progress")}
            type="button"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Progress
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1 border-l border-border/60 px-2 py-2">
          {historyActive && (
            <button
              className="rounded-lg border border-accent/40 bg-accent/10 p-1.5 text-accent transition-colors hover:bg-accent/20"
              onClick={startNewChat}
              type="button"
              title="New chat"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          )}
          {exercisesActive && (
            <button
              className="rounded-lg border border-accent-2/40 bg-accent-2/10 p-1.5 text-accent-2 transition-colors hover:bg-accent-2/20"
              onClick={showExercisePanel}
              type="button"
              title="Show exercises"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="scrollbar-none min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain">
        {historyActive && <ChatHistoryPanel />}
        {exercisesActive && <ExerciseHistoryPanel />}
        {progressActive && <ProgressSummary key={progressKey} />}
      </div>
    </aside>
  );
}
