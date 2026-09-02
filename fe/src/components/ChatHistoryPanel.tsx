"use client";

import { format, parseISO } from "date-fns";
import { useConversation } from "@/components/ConversationContext";

export function ChatHistoryPanel() {
  const { conversations, conversationId, selectConversation } = useConversation();
  return (
    <div className="flex flex-col gap-1 p-2">
      {conversations.length === 0 && (
        <p className="px-2 py-4 text-center text-xs text-muted">No chats yet. Start a new conversation.</p>
      )}
      {conversations.map((c) => {
        const active = conversationId === c.id;
        const btn = active
          ? "border-accent/50 bg-accent/15 text-foreground"
          : "border-transparent bg-background/40 text-muted hover:border-border hover:bg-background/70 hover:text-foreground";
        return (
          <button
            key={c.id}
            className={`rounded-xl border px-3 py-2 text-left transition-colors ${btn}`}
            onClick={() => selectConversation(c.id)}
            type="button"
          >
            <p className="truncate text-sm font-medium">{c.title}</p>
            <p className="mt-0.5 text-[10px] text-muted">
              {format(parseISO(c.updated_at), "MMM d")} | {c.message_count} turns
            </p>
          </button>
        );
      })}
    </div>
  );
}
